// Project logic. Each project belongs to a team and holds a Kanban board of tasks.
import { prisma } from '../config/db.js';
import { requireString, optionalString } from '../utils/validate.js';
import { findTeamInOrg, findProjectInOrg } from '../utils/tenant.js';
import { logActivity } from '../utils/activity.js';

const TEAM = { team: { select: { id: true, name: true } } };

// All projects in the org (optionally ?teamId=...), each with task counts per column.
export async function listProjects(req, res) {
  const { orgId } = req.user;
  const where = { orgId, deletedAt: null };
  if (req.query.teamId) where.teamId = String(req.query.teamId);

  const projects = await prisma.project.findMany({ where, include: TEAM, orderBy: { createdAt: 'desc' } });

  // One query for every project's counts instead of one query per project.
  const counts = await prisma.task.groupBy({
    by: ['projectId', 'status'],
    where: { orgId, deletedAt: null },
    _count: true,
  });

  res.json({
    projects: projects.map((project) => {
      const taskCounts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
      for (const row of counts) {
        if (row.projectId === project.id) taskCounts[row.status] = row._count;
      }
      return { ...project, taskCounts };
    }),
  });
}

export async function createProject(req, res) {
  const name = requireString(req.body.name, 'Project name', 100);
  const description = optionalString(req.body.description, 'Description') ?? '';
  const { orgId } = req.user;
  const team = await findTeamInOrg(orgId, String(req.body.teamId ?? ''));

  const project = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: { orgId, teamId: team.id, name, description },
      include: TEAM,
    });
    await logActivity(tx, {
      orgId,
      actorId: req.user.id,
      action: 'project.created',
      entityType: 'project',
      entityId: project.id,
      meta: { name },
    });
    return project;
  });
  res.status(201).json({ project });
}

export async function getProject(req, res) {
  const project = await findProjectInOrg(req.user.orgId, req.params.id);
  const team = await prisma.team.findFirst({
    where: { id: project.teamId, orgId: req.user.orgId },
    select: { id: true, name: true },
  });
  res.json({ project: { ...project, team } });
}

export async function updateProject(req, res) {
  const { orgId } = req.user;
  const project = await findProjectInOrg(orgId, req.params.id);

  const data = {};
  if (req.body.name !== undefined) data.name = requireString(req.body.name, 'Project name', 100);
  if (req.body.description !== undefined) data.description = optionalString(req.body.description, 'Description');

  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({ where: { id: project.id }, data, include: TEAM });
    await logActivity(tx, {
      orgId,
      actorId: req.user.id,
      action: 'project.updated',
      entityType: 'project',
      entityId: project.id,
      meta: { name: updated.name },
    });
    return updated;
  });
  res.json({ project: updated });
}

// Soft delete: the row stays (for the audit trail) but every query filters it out.
// Its tasks disappear with it, because tasks are only visible through a live project.
export async function deleteProject(req, res) {
  const { orgId } = req.user;
  const project = await findProjectInOrg(orgId, req.params.id);

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id: project.id }, data: { deletedAt: new Date() } });
    await logActivity(tx, {
      orgId,
      actorId: req.user.id,
      action: 'project.deleted',
      entityType: 'project',
      entityId: project.id,
      meta: { name: project.name },
    });
  });
  res.status(204).end();
}
