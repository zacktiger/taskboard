// Kanban helpers shared by the board and the activity feed.

export const COLUMNS = [
  { status: 'TODO', label: 'To do', dot: 'bg-zinc-400' },
  { status: 'IN_PROGRESS', label: 'In progress', dot: 'bg-amber-400' },
  { status: 'DONE', label: 'Done', dot: 'bg-emerald-500' },
];

export const STATUS_LABELS = Object.fromEntries(COLUMNS.map((c) => [c.status, c.label]));

// Task priorities, highest first, with the colours used for their badge.
export const PRIORITIES = [
  { value: 'HIGH', label: 'High', badge: 'bg-red-50 text-red-700 ring-red-200' },
  { value: 'MEDIUM', label: 'Medium', badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { value: 'LOW', label: 'Low', badge: 'bg-sky-50 text-sky-700 ring-sky-200' },
];

// The tasks in one column, top to bottom.
export function tasksInColumn(tasks, status) {
  return tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);
}

// Returns a new task list with one task moved to (status, index) and every column renumbered
// 0, 1, 2... — the same result the server's /move endpoint produces. Used for the optimistic update.
export function moveTask(tasks, taskId, toStatus, toIndex) {
  const moving = tasks.find((t) => t.id === taskId);
  const others = tasks.filter((t) => t.id !== taskId);

  return COLUMNS.flatMap(({ status }) => {
    const column = tasksInColumn(others, status);
    if (status === toStatus) column.splice(toIndex, 0, { ...moving, status: toStatus });
    return column.map((task, position) => ({ ...task, position }));
  });
}
