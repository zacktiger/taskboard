// Member logic for the current org: list members, change a role, remove someone.
import { prisma } from '../config/db.js';
import { HttpError } from '../utils/errors.js';
import { parseRole } from '../utils/validate.js';
import { findMemberInOrg } from '../utils/tenant.js';
import { revokeAllRefreshTokens } from '../utils/tokens.js';
import { logActivity } from '../utils/activity.js';

export async function listMembers(req, res) {
  const members = await prisma.orgMember.findMany({
    where: { orgId: req.user.orgId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json({
    members: members.map((m) => ({ ...m.user, role: m.role, joinedAt: m.createdAt })),
  });
}

export async function changeRole(req, res) {
  const role = parseRole(req.body.role);
  const { orgId } = req.user;
  const member = await findMemberInOrg(orgId, req.params.userId);

  if (member.role === 'ADMIN' && role !== 'ADMIN') await ensureAnotherAdmin(orgId);

  await prisma.$transaction(async (tx) => {
    await tx.orgMember.update({
      where: { userId_orgId: { userId: member.userId, orgId } },
      data: { role },
    });
    await logActivity(tx, {
      orgId,
      actorId: req.user.id,
      action: 'member.role_changed',
      entityType: 'user',
      entityId: member.userId,
      meta: { name: member.user.name, from: member.role, to: role },
    });
  });
  res.json({ member: { id: member.userId, name: member.user.name, email: member.user.email, role } });
}

// Removing someone takes them off every team, unassigns their tasks, and logs them out everywhere.
export async function removeMember(req, res) {
  const { orgId } = req.user;
  const member = await findMemberInOrg(orgId, req.params.userId);
  if (member.role === 'ADMIN') await ensureAnotherAdmin(orgId);

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.deleteMany({ where: { userId: member.userId, team: { orgId } } });
    await tx.task.updateMany({ where: { orgId, assigneeId: member.userId }, data: { assigneeId: null } });
    await tx.orgMember.delete({ where: { userId_orgId: { userId: member.userId, orgId } } });
    await revokeAllRefreshTokens(member.userId, tx);
    await logActivity(tx, {
      orgId,
      actorId: req.user.id,
      action: 'member.removed',
      entityType: 'user',
      entityId: member.userId,
      meta: { name: member.user.name },
    });
  });
  res.status(204).end();
}

// An org must never be left without an admin.
async function ensureAnotherAdmin(orgId) {
  const admins = await prisma.orgMember.count({ where: { orgId, role: 'ADMIN' } });
  if (admins <= 1) throw new HttpError(409, 'An organization needs at least one admin');
}
