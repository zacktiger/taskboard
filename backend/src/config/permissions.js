// The single source of truth for who can do what.
// Route handlers never compare roles themselves — they use requirePermission(action).
// Reading data only needs a logged-in member, so there are no "read" actions here.
// (frontend/src/auth/permissions.js is a copy of this map, used only to hide buttons.)
export const PERMISSIONS = {
  'project:write': ['ADMIN', 'MEMBER'],
  'task:write': ['ADMIN', 'MEMBER'],
  'team:manage': ['ADMIN'],
  'member:manage': ['ADMIN'],
};

// True if `role` is allowed to perform `action`.
export function can(role, action) {
  return PERMISSIONS[action]?.includes(role) ?? false;
}
