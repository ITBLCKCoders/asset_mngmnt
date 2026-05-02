export const getLandingPage = (
  hasPermission: (mod: string, perm: string) => boolean,
  hasRole: boolean
) => {
  if (!hasRole) return '/profile';

  if (hasPermission('Dashboard', 'view')) return '/dashboard';
  if (hasPermission('My Assets', 'view')) return '/my-assets';

  // Forms
  if (hasPermission('Accountability Form', 'view'))
    return '/forms/accountability';
  if (hasPermission('Borrow Form', 'view')) return '/forms/borrow';
  if (hasPermission('Return Form', 'view')) return '/forms/return';
  if (hasPermission('Transfer Form', 'view')) return '/forms/transfer';
  if (hasPermission('Approvals', 'view')) return '/approvals';

  // Assets
  if (hasPermission('Asset List', 'view')) return '/assets';
  if (hasPermission('Asset Assignment', 'view')) return '/assets/assignment';
  if (hasPermission('Asset Request', 'view')) return '/assets/request';
  if (hasPermission('Request Management', 'view'))
    return '/assets/request-admin';
  if (hasPermission('Asset Borrowing', 'view')) return '/assets/borrow';
  if (hasPermission('Borrow Request Management', 'view'))
    return '/assets/borrow-requests';
  if (hasPermission('Asset Tagging', 'view')) return '/assets/tagging';
  if (hasPermission('Asset Transfer', 'view')) return '/assets/transfer';
  if (hasPermission('Asset Maintenance', 'view')) return '/assets/maintenance';
  if (hasPermission('Asset Repair', 'view')) return '/assets/repair';
  if (hasPermission('Asset Return', 'view')) return '/assets/return';
  if (hasPermission('Return Request', 'view')) return '/assets/return-request';
  if (hasPermission('Transfer Request', 'view'))
    return '/assets/transfer-request';
  if (hasPermission('Asset Disposal', 'view')) return '/assets/disposal';

  // Other
  if (hasPermission('Users', 'view')) return '/user';
  if (hasPermission('Audit Trail', 'view')) return '/audit';
  if (hasPermission('Settings', 'view')) return '/settings';

  // Always accessible as long as there's a role/permission?
  // Side bar shows User Manual regardless of hasPermission (it doesn't wrap it in hasPermission in sidebar.tsx)
  return '/user-manual';
};
