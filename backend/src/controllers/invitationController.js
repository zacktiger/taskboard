// Invitation logic: how new people join an org.
// An ADMIN creates an invite and gets a link to share; opening the link lets the person join.
// There's no email sending — the admin copies the link.
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { HttpError } from '../utils/errors.js';
import { requireString, parseEmail, parsePassword, parseRole } from '../utils/validate.js';
import { randomToken, hashToken } from '../utils/tokens.js';
import { sendSession } from '../utils/session.js';
import { logActivity } from '../utils/activity.js';

const INVITE_DAYS = 7;

// Never send tokenHash to the client.
const INVITATION_FIELDS = {
  id: true,
  email: true,
  role: true,
  expiresAt: true,
  createdAt: true,
  invitedBy: { select: { id: true, name: true } },
};

// Pending invites (not accepted, not expired).
export async function listInvitations(req, res) {
  const invitations = await prisma.invitation.findMany({
    where: { orgId: req.user.orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
    select: INVITATION_FIELDS,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ invitations });
}

export async function createInvitation(req, res) {
  const email = parseEmail(req.body.email);
  const role = parseRole(req.body.role);
  const { orgId } = req.user;

  const alreadyMember = await prisma.orgMember.findFirst({ where: { orgId, user: { email } } });
  if (alreadyMember) throw new HttpError(409, 'That person is already a member');

  // The raw token only lives in the link we return now; the DB keeps its hash.
  const token = randomToken();
  const invitation = await prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.create({
      data: {
        orgId,
        email,
        role,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
        invitedById: req.user.id,
      },
      select: INVITATION_FIELDS,
    });
    await logActivity(tx, {
      orgId,
      actorId: req.user.id,
      action: 'invitation.created',
      entityType: 'invitation',
      entityId: invitation.id,
      meta: { email, role },
    });
    return invitation;
  });

  res.status(201).json({ invitation, inviteLink: `${process.env.CLIENT_URL}/invite/${token}` });
}

// Revoke a pending invite.
export async function revokeInvitation(req, res) {
  const { orgId } = req.user;
  const invitation = await prisma.invitation.findFirst({
    where: { id: req.params.id, orgId, acceptedAt: null },
  });
  if (!invitation) throw new HttpError(404, 'Invitation not found');

  await prisma.$transaction(async (tx) => {
    await tx.invitation.delete({ where: { id: invitation.id } });
    await logActivity(tx, {
      orgId,
      actorId: req.user.id,
      action: 'invitation.revoked',
      entityType: 'invitation',
      entityId: invitation.id,
      meta: { email: invitation.email },
    });
  });
  res.status(204).end();
}

// Public: the invite link itself is the proof. New people pick a name and password;
// someone who was removed from their old org can rejoin with their existing password.
export async function acceptInvitation(req, res) {
  const password = parsePassword(req.body.password);

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(req.params.token) },
  });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    throw new HttpError(404, 'This invite link is invalid or has expired');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    include: { memberships: true },
  });
  if (existingUser) {
    if (!(await bcrypt.compare(password, existingUser.passwordHash))) {
      throw new HttpError(401, 'You already have an account — enter its password to join');
    }
    if (existingUser.memberships.length > 0) {
      throw new HttpError(409, 'This account already belongs to an organization');
    }
  }
  const name = existingUser ? existingUser.name : requireString(req.body.name, 'Name', 100);
  const passwordHash = existingUser ? null : await bcrypt.hash(password, 10);

  const userId = await prisma.$transaction(async (tx) => {
    // Claim the invite atomically so the same link can't be used twice.
    const { count } = await tx.invitation.updateMany({
      where: { id: invitation.id, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (count === 0) throw new HttpError(404, 'This invite link is invalid or has expired');

    const user = existingUser ?? (await tx.user.create({ data: { name, email: invitation.email, passwordHash } }));
    await tx.orgMember.create({ data: { userId: user.id, orgId: invitation.orgId, role: invitation.role } });
    await logActivity(tx, {
      orgId: invitation.orgId,
      actorId: user.id,
      action: 'member.joined',
      entityType: 'user',
      entityId: user.id,
      meta: { name, role: invitation.role },
    });
    return user.id;
  });

  await sendSession(res, userId);
}
