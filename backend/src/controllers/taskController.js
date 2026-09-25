// Task logic for a project's Kanban board.
//
// Ordering: each task has a 0-based `position` inside its status column.
// Anything that changes positions (create, move, delete) runs in a transaction that first
// locks the project row, so two people dragging cards at once can't produce duplicate positions.
import { prisma } from '../config/db.js';
import { requireString, optionalString, parseStatus, parsePosition, parsePriority } from '../utils/validate.js';
import { findProjectInOrg, findTaskInOrg, findMemberInOrg } from '../utils/tenant.js';
import { logActivity } from '../utils/activity.js';

const ASSIGNEE = { assignee: { select: { id: true, name: true } } };

export async function listTasks(req, res) {
  const project = await findProjectInOrg(req.user.orgId, req.params.projectId);
  const tasks = await prisma.task.findMany({
    where: { projectId: project.id, orgId: req.user.orgId, deletedAt: null },
    include: ASSIGNEE,
    orderBy: [{ status: 'asc' }, { position: 'asc' }],
  });
  res.json({ tasks });
}

export async function createTask(req, res) {
  const { orgId } = req.user;
  const title = requireString(req.body.title, 'Title');
  const description = optionalString(req.body.description, 'Description') ?? '';
  const priority = req.body.priority === undefined ? 'MEDIUM' : parsePriority(req.body.priority);
  const assigneeId = await parseAssignee(orgId, req.body.assigneeId);

  const task = await prisma.$transaction(async (tx) => {
    const project = await findProjectInOrg(orgId, req.params.projectId, tx);
    await lockProject(tx, project.id);

    // New tasks go to the bottom of the To Do column.
    const position = await tx.task.count({ where: columnOf(project.id, 'TODO') });
    const task = await tx.task.create({
      data: { orgId, projectId: project.id, title, description, priority, assigneeId, position },
      include: ASSIGNEE,
    });
    await logActivity(tx, {
      orgId,
      actorId: req.user.id,
      action: 'task.created',
      entityType: 'task',
      entityId: task.id,
      meta: { title },
    });
    return task;
  });
  res.status(201).json({ task });
}

// Edit title, description, priority or assignee. Status and order change through moveTask instead.
export async function updateTask(req, res) {
  const { orgId } = req.user;
  const task = await findTaskInOrg(orgId, req.params.id);

  const data = {};
  if (req.body.title !== undefined) data.title = requireString(req.body.title, 'Title');
  if (req.body.description !== undefined) data.description = optionalString(req.body.description, 'Description');
  if (req.body.priority !== undefined) data.priority = parsePriority(req.body.priority);
  if (req.body.assigneeId !== undefined) data.assigneeId = await parseAssignee(orgId, req.body.assigneeId);

  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({ where: { id: task.id }, data, include: ASSIGNEE });
    await logActivity(tx, {
      orgId,
      actorId: req.user.id,
      action: 'task.updated',
      entityType: 'task',
      entityId: task.id,
      meta: { title: updated.title },
    });
    return updated;
  });
  res.json({ task: updated });
}

// Soft delete, then close the gap it leaves in its column.
export async function deleteTask(req, res) {
  const { orgId } = req.user;

  await prisma.$transaction(async (tx) => {
    const task = await findAndLockTask(tx, orgId, req.params.id);
    await tx.task.update({ where: { id: task.id }, data: { deletedAt: new Date() } });
    await tx.task.updateMany({
      where: { ...columnOf(task.projectId, task.status, task.id), position: { gt: task.position } },
      data: { position: { decrement: 1 } },
    });
    await logActivity(tx, {
      orgId,
      actorId: req.user.id,
      action: 'task.deleted',
      entityType: 'task',
      entityId: task.id,
      meta: { title: task.title },
    });
  });
  res.status(204).end();
}

// Drag and drop: move a task to { status, position }. Works within a column or across columns.
export async function moveTask(req, res) {
  const { orgId } = req.user;
  const status = parseStatus(req.body.status);
  const requestedPosition = parsePosition(req.body.position);

  const moved = await prisma.$transaction(async (tx) => {
    const task = await findAndLockTask(tx, orgId, req.params.id);

    // 1. Take the task out: everything below it in the old column moves up one.
    await tx.task.updateMany({
      where: { ...columnOf(task.projectId, task.status, task.id), position: { gt: task.position } },
      data: { position: { decrement: 1 } },
    });

    // 2. Make room: everything at or below the target spot in the new column moves down one.
    //    (Clamp so dropping "past the end" just means "last".)
    const newColumnSize = await tx.task.count({ where: columnOf(task.projectId, status, task.id) });
    const position = Math.min(requestedPosition, newColumnSize);
    await tx.task.updateMany({
      where: { ...columnOf(task.projectId, status, task.id), position: { gte: position } },
      data: { position: { increment: 1 } },
    });

    // 3. Put the task in the gap.
    const moved = await tx.task.update({
      where: { id: task.id },
      data: { status, position },
      include: ASSIGNEE,
    });

    // Only log column changes — reordering inside a column would flood the log.
    if (task.status !== status) {
      await logActivity(tx, {
        orgId,
        actorId: req.user.id,
        action: 'task.moved',
        entityType: 'task',
        entityId: task.id,
        meta: { title: task.title, from: task.status, to: status },
      });
    }
    return moved;
  });
  res.json({ task: moved });
}

// The live tasks in one column of one project, optionally leaving one task out.
function columnOf(projectId, status, excludeTaskId) {
  const where = { projectId, status, deletedAt: null };
  if (excludeTaskId) where.id = { not: excludeTaskId };
  return where;
}

// Row lock on the project until the transaction ends. Other transactions that want to
// reorder this project's tasks wait here, so position updates never interleave.
async function lockProject(tx, projectId) {
  await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${projectId} FOR UPDATE`;
}

// Find the task, lock its project, then read the task again — another request may have
// shifted its position while we were waiting for the lock.
async function findAndLockTask(tx, orgId, taskId) {
  const task = await findTaskInOrg(orgId, taskId, tx);
  await lockProject(tx, task.projectId);
  return findTaskInOrg(orgId, taskId, tx);
}

// null/empty means "unassigned"; otherwise the assignee must be a member of this org.
async function parseAssignee(orgId, assigneeId) {
  if (assigneeId === undefined || assigneeId === null || assigneeId === '') return null;
  const member = await findMemberInOrg(orgId, String(assigneeId));
  return member.userId;
}
