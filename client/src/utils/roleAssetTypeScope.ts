export type RoleAssetScope = 'it' | 'admin';

export function getRoleAssetTypeScope(
  roleAssetType: string | null | undefined
): { roleScope: RoleAssetScope; isRoleScoped: boolean } {
  const normalized = (roleAssetType || '').trim().toLowerCase();
  const roleScope: RoleAssetScope | null =
    normalized === 'it' || normalized === 'admin' ? normalized : null;
  return { roleScope: roleScope ?? 'it', isRoleScoped: roleScope !== null };
}