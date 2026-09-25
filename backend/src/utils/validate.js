// Tiny hand-written validators for request bodies. Each returns the clean value or throws a 400.
import { HttpError } from './errors.js';

const ROLES = ['ADMIN', 'MEMBER', 'VIEWER'];
const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

// A non-empty string, trimmed, at most `max` characters.
export function requireString(value, field, max = 200) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `${field} is required`);
  }
  if (value.trim().length > max) {
    throw new HttpError(400, `${field} must be at most ${max} characters`);
  }
  return value.trim();
}

// Like requireString, but missing is fine (returns undefined) and empty text is allowed.
export function optionalString(value, field, max = 5000) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text`);
  if (value.length > max) throw new HttpError(400, `${field} must be at most ${max} characters`);
  return value.trim();
}

// Emails are stored lowercase so "Bob@x.com" and "bob@x.com" are the same account.
export function parseEmail(value) {
  const email = requireString(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Email is not valid');
  return email;
}

export function parsePassword(value) {
  if (typeof value !== 'string' || value.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters');
  }
  return value;
}

export function parseRole(value) {
  if (!ROLES.includes(value)) throw new HttpError(400, `Role must be one of ${ROLES.join(', ')}`);
  return value;
}

export function parseStatus(value) {
  if (!STATUSES.includes(value)) throw new HttpError(400, `Status must be one of ${STATUSES.join(', ')}`);
  return value;
}

export function parsePriority(value) {
  if (!PRIORITIES.includes(value)) throw new HttpError(400, `Priority must be one of ${PRIORITIES.join(', ')}`);
  return value;
}

// A whole number >= 0.
export function parsePosition(value) {
  if (!Number.isInteger(value) || value < 0) throw new HttpError(400, 'Position must be a whole number >= 0');
  return value;
}
