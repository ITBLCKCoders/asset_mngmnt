/**
 * Canonical role-name constants. The DB stores role names with this exact
 * casing in `asset_mngmnt_roles.name`, so use these literals everywhere
 * instead of inline strings (eliminates the historical mix of
 * `'Super Admin'` vs `'super admin'` mismatches).
 */
export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  IT_ASSET_MANAGER: 'IT Asset Manager',
  ADMIN_ASSET_MANAGER: 'Admin Asset Manager',
  IT_CUSTODIAN: 'IT Custodian',
  ADMIN_CUSTODIAN: 'Admin Custodian',
  USER: 'User',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
