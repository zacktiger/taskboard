// Everything about tokens: short-lived JWT access tokens and single-use refresh tokens.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { HttpError } from './errors.js';

const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_DAYS = 7;

// The access token carries who you are (sub) and which org you are acting in.
// It does NOT carry your role — that is re-read from the database on every request.
export function signAccessToken(userId, orgId) {
  return jwt.sign({ orgId }, process.env.JWT_SECRET, { subject: userId, expiresIn: ACCESS_TOKEN_TTL });
}

// Returns the payload, or throws if the token is invalid or expired.
export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

// 32 random bytes as hex. Used for refresh tokens and invite links.
export function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

// We only ever store the hash of a token, like a password.
// SHA-256 (not bcrypt) is enough here because the token is already 256 random bits.
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Creates a refresh token for the user and returns the raw value (to put in the cookie).
export async function createRefreshToken(userId) {
  const token = randomToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

// Spends a refresh token (each one works exactly once) and returns its user id.
// If a token that was already spent shows up again, someone copied it: log the user out everywhere.
export async function useRefreshToken(token) {
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!stored || stored.expiresAt < new Date()) throw new HttpError(401, 'Session expired');

  // "where revokedAt is null" makes this atomic: if two requests race with the same token,
  // only one of them gets count === 1.
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) {
    await revokeAllRefreshTokens(stored.userId);
    throw new HttpError(401, 'Session was reused, so all devices were logged out');
  }
  return stored.userId;
}

// Logout: revoke just this one token (if it exists).
export async function revokeRefreshToken(token) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Revoke every session a user has. `db` can be a transaction client.
export async function revokeAllRefreshTokens(userId, db = prisma) {
  await db.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
