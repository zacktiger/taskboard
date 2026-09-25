// The two middlewares that protect routes.
import { prisma } from '../config/db.js';
import { HttpError } from '../utils/errors.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { can } from '../config/permissions.js';

// Checks the access token, then loads the membership from the database and puts it on req.user.
// Reading the role from the DB (not the token) means a demotion or removal applies on the very
// next request instead of waiting up to 15 minutes for the token to expire.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Not logged in');

  let payload;
  try {
    payload = verifyAccessToken(header.slice('Bearer '.length));
  } catch {
    throw new HttpError(401, 'Session expired');
  }

  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId: payload.sub, orgId: payload.orgId } },
    include: { user: true },
  });
  if (!member) throw new HttpError(401, 'You are no longer a member of this organization');

  req.user = { id: member.userId, orgId: member.orgId, role: member.role, name: member.user.name };
  next();
}

// Use after requireAuth, e.g. requirePermission('task:write').
// 403 is right here: the user is inside the org, their role just isn't allowed to do this.
export function requirePermission(action) {
  return (req, res, next) => {
    if (!can(req.user.role, action)) throw new HttpError(403, 'Your role is not allowed to do that');
    next();
  };
}
