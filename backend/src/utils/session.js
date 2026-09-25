// Builds the "you are logged in" response shared by register, login, refresh and invite-accept:
// the access token goes in the JSON body, the refresh token in an httpOnly cookie.
import { prisma } from '../config/db.js';
import { HttpError } from './errors.js';
import { createRefreshToken, signAccessToken, REFRESH_TOKEN_DAYS } from './tokens.js';

export const REFRESH_COOKIE = 'refreshToken';

const cookieOptions = {
  httpOnly: true, // browser JavaScript can't read it, so an XSS bug can't steal it
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth', // only sent to the auth routes, not on every request
  maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
};

// The user object the frontend keeps in its AuthContext.
export function toSessionUser(membership) {
  return {
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
    org: { id: membership.org.id, name: membership.org.name },
  };
}

// v1: a user belongs to at most one org, so we just take their membership.
export async function findMembership(userId) {
  return prisma.orgMember.findFirst({ where: { userId }, include: { user: true, org: true } });
}

// Issues a fresh access + refresh token pair and sends the session response.
export async function sendSession(res, userId) {
  const membership = await findMembership(userId);
  if (!membership) throw new HttpError(401, 'You are not a member of any organization');

  const refreshToken = await createRefreshToken(userId);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.json({
    accessToken: signAccessToken(userId, membership.orgId),
    user: toSessionUser(membership),
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { path: cookieOptions.path });
}
