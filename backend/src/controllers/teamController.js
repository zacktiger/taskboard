// Team logic. Teams group people and projects inside an org.
// They organize work; they don't restrict access.
import { prisma } from '../config/db.js';
import { HttpError } from '../utils/errors.js';
import { requireString } from '../utils/validate.js';
import { findTeamInOrg, findMemberInOrg } from '../utils/tenant.js';
import { logActivity } from '../utils/activity.js';

export async function listTeams(req, res) {
  const teams = await prisma.team.findMany({
    where: { orgId: req.user.orgId, deletedAt: null },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { projects: { where: { deletedAt: null } } } },
    },
    orderBy: { name: 'asc' },
  });
  res.json({
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      projectCount: team._count.projects,
      members: team.members.map((m) => m.user),
    })),
  });
}

export async function createTeam(req, res) {
  const name = requireString(req.body.name, 'Team name', 100);
  const { orgId } = req.user;

  const team = await prisma.$transaction(async (tx) => {
    const team = await tx.team.create({ data: { orgId, name } });
    await logActivity(tx, {
      orgId,
      actorId: req.user.id,
      action: 'team.created',
      entityType: 'team',
      entityId: team.id,
      meta: { name },
    });
    return team;
  });
  res.status(201).json({ team: { id: team.id, name: team.name, projectCount: 0, members: [] } });
}

// Soft delete. Refused while the team still has projects, so no project is left without a team.
export async function deleteTeam(req, res) {
  const { orgId } = req.user;
  const team = await findTeamInOrg(orgId, req.params.id);

  const projectCount = await prisma.project.count({ where: { teamId: team.id, deletedAt: null } });
  if (projectCount > 0) throw new HttpError(409, 'Move or delete this team’s projects first');

  await prisma.$transaction(async (tx) => {
    await tx.team.update({ where: { id: team.id }, data: { deletedAt: new Date() } });
    await logActivity(tx, {
      orgId,
      actorId: req.user.id,
      action: 'team.deleted',
      entityType: 'team',
      entityId: team.id,
      meta: { name: team.name },
    });
  });
  res.status(204).end();
}

export async function addTeamMember(req, res) {
  const { orgId } = req.user;
  const team = await findTeamInOrg(orgId, req.params.id);
  // Only people in this org can join its teams.
  const member = await findMemberInOrg(orgId, String(req.body.userId ?? ''));

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: member.userId } },
      create: { teamId: team.id, userId: member.userId },
      update: {},
    });
    await logActivity(tx, {
      orgId,
      actorId: req.user.id,
      action: 'team.member_added',
      entityType: 'team',
      entityId: team.id,
      meta: { team: team.name, name: member.user.name },
    });
  });
  res.status(201).json({ member: { id: member.userId, name: member.user.name, email: member.user.email } });
}

export async function removeTeamMember(req, res) {
  const { orgId } = req.user;
  const team = await findTeamInOrg(orgId, req.params.id);
  const teamMember = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: req.params.userId } },
    include: { user: true },
  });
  if (!teamMember) throw new HttpError(404, 'Team member not found');

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.delete({ where: { teamId_userId: { teamId: team.id, userId: teamMember.userId } } });
    await logActivity(tx, {
      orgId,
      actorId: req.user.id,
      action: 'team.member_removed',
      entityType: 'team',
      entityId: team.id,
      meta: { team: team.name, name: teamMember.user.name },
    });
  });
  res.status(204).end();
}
