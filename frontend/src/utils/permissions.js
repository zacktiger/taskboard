// A copy of backend/src/config/permissions.js. The frontend only uses it to hide buttons and
// guard routes — the server checks every request again, so this is convenience, not security.
const PERMISSIONS = {
  'project:write': ['ADMIN', 'MEMBER'],
  'task:write': ['ADMIN', 'MEMBER'],
  'team:manage': ['ADMIN'],
  'member:manage': ['ADMIN'],
};

export function can(role, action) {
  return PERMISSIONS[action]?.includes(role) ?? false;
}
