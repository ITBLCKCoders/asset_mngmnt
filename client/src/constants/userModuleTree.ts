export interface ModuleTreeNode {
  name: string;
  children: string[];
}

/** Same hierarchy as the Users → Permissions tab. */
export const USER_MODULE_TREE: ModuleTreeNode[] = [
  { name: 'Dashboard', children: [] },
  { name: 'Users', children: [] },
  {
    name: 'Reports',
    children: [
      'Assignment History',
      'Return History',
      'Transfer History',
      'Maintenance History',
      'Repair History',
      'Borrow History',
      'Asset Request History',
    ],
  },
  { name: 'My Assets', children: [] },
  {
    name: 'Assets',
    children: [
      'Asset List',
      'Asset Assignment',
      'Asset Request',
      'Request Management',
      'Asset Tagging',
      'Asset Transfer',
      'Asset Maintenance',
      'Asset Repair',
      'Asset Return',
      'Return Request',
      'Transfer Request',
      'Asset Disposal',
      'Asset Borrowing',
      'Borrow Request Management',
    ],
  },
  { name: 'Audit Trail', children: [] },
  {
    name: 'Forms',
    children: [
      'Accountability Form',
      'Checklist Form',
      'Borrow Form',
      'Return Form',
      'Transfer Form',
      'Approvals',
    ],
  },
  {
    name: 'Settings',
    children: [
      'Asset Categories',
      'Asset Types',
      'Asset Brands',
      'Suppliers',
      'Departments',
      'Locations',
      'Roles',
      'Companies',
    ],
  },
];

export function moduleChildLabel(parentName: string, child: string): string {
  if (parentName === 'Forms' && child === 'Borrow Form') {
    return 'Borrow forms';
  }
  if (parentName === 'Forms' && child === 'Checklist Form') {
    return 'Checklist forms';
  }
  if (parentName === 'Forms' && child === 'Transfer Form') {
    return 'Transfer forms';
  }
  return child;
}
