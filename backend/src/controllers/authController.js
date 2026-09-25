// Auth logic: register (creates a new org), login, refresh, logout, me.
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { HttpError } from '../utils/errors.js';
import { requireString, parseEmail, parsePassword } from '../utils/validate.js';
import { useRefreshToken, revokeRefreshToken } from '../utils/tokens.js';
import { sendSession, clearRefreshCookie, toSessionUser, REFRESH_COOKIE } from '../utils/session.js';
import { logActivity } from '../utils/activity.js';

// Sign up = create a user AND a brand-new org, with the user as its first ADMIN.
export async function register(req, res) {
  const name = requireString(req.body.name, 'Name', 100);
  const email = parseEmail(req.body.email);
  const password = parsePassword(req.body.password);
  const orgName = requireString(req.body.orgName, 'Organization name', 100);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, email, passwordHash } });
    const org = await tx.organization.create({ data: { name: orgName } });
    await tx.orgMember.create({ data: { userId: user.id, orgId: org.id, role: 'ADMIN' } });
    await logActivity(tx, {
      orgId: org.id,
      actorId: user.id,
      action: 'org.created',
      entityType: 'organization',
      entityId: org.id,
      meta: { name: orgName },
    });
    return user;
  });

  await sendSession(res, user.id);
}

export async function login(req, res) {
  const email = parseEmail(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = user && (await bcrypt.compare(password, user.passwordHash));
  // Same message for "no such user" and "wrong password", so emails can't be probed.
  if (!passwordOk) throw new HttpError(401, 'Invalid email or password');

  await sendSession(res, user.id);
}

// Swap the refresh-token cookie for a new access token (and a new refresh token).
export async function refresh(req, res) {
  const token = req.cookies[REFRESH_COOKIE];
  if (!token) throw new HttpError(401, 'Not logged in');

  try {
    const userId = await useRefreshToken(token);
    await sendSession(res, userId);
  } catch (err) {
    clearRefreshCookie(res);
    throw err;
  }
}

export async function logout(req, res) {
  const token = req.cookies[REFRESH_COOKIE];
  if (token) await revokeRefreshToken(token);
  clearRefreshCookie(res);
  res.status(204).end();
}

// The logged-in user, their role and their org.
export async function me(req, res) {
  const membership = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId: req.user.id, orgId: req.user.orgId } },
    include: { user: true, org: true },
  });
  res.json({ user: toSessionUser(membership) });
}
