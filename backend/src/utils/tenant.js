// Org-scoped lookups. Every "find by id" in the app goes through here, and every one
// requires an orgId — there is deliberately no unscoped version.
// A record in another org (or soft-deleted) throws 404, never 403, so we never reveal it exists.
// `db` can be a transaction client.
import { prisma } from '../config/db.js';
import { notFound } from './errors.js';

export async function findTeamInOrg(orgId, teamId, db = prisma) {
  const team = await db.team.findFirst({ where: { id: teamId, orgId, deletedAt: null } });
  if (!team) throw notFound('Team');
  return team;
}

export async function findProjectInOrg(orgId, projectId, db = prisma) {
  const project = await db.project.findFirst({ where: { id: projectId, orgId, deletedAt: null } });
  if (!project) throw notFound('Project');
  return project;
}

// A task is only visible if its project is visible too.
export async function findTaskInOrg(orgId, taskId, db = prisma) {
  const task = await db.task.findFirst({
    where: { id: taskId, orgId, deletedAt: null, project: { deletedAt: null } },
  });
  if (!task) throw notFound('Task');
  return task;
}

export async function findMemberInOrg(orgId, userId, db = prisma) {
  const member = await db.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId } },
    include: { user: true },
  });
  if (!member) throw notFound('Member');
  return member;
}
