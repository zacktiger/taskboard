// Kanban helpers shared by the board and the activity feed.

export const COLUMNS = [
  { status: 'TODO', label: 'To do' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'DONE', label: 'Done' },
];

export const STATUS_LABELS = Object.fromEntries(COLUMNS.map((c) => [c.status, c.label]));

// Task priorities, highest first. `tab` styles the coloured tab on top of a task card.
export const PRIORITIES = [
  { value: 'HIGH', label: 'High', tab: 'bg-tab-high text-white' },
  { value: 'MEDIUM', label: 'Medium', tab: 'bg-tab-medium text-ink' },
  { value: 'LOW', label: 'Low', tab: 'bg-tab-low text-white' },
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
