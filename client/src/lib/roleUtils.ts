export function getRoleDisplayName(roleName: string | null | undefined): string {
  if (!roleName) return '';
  if (roleName === 'Admin') return 'Local Admin';
  return roleName;
}
