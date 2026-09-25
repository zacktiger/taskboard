// Writes one audit-log entry.
// Always pass the transaction client (`tx`) so the entry is saved only if the change itself is.
export function logActivity(tx, { orgId, actorId, action, entityType, entityId, meta }) {
  return tx.activity.create({ data: { orgId, actorId, action, entityType, entityId, meta } });
}
