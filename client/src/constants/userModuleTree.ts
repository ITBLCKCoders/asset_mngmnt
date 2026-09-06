export interface ModuleTreeNode {
  name: string;
  children: (string | ModuleTreeNode)[];
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
      {
        name: 'Asset Borrowing',
        children: ['Borrow Request Management'],
      },
      'Asset Tagging',
      {
        name: 'Asset Transfer',
        children: ['Asset Transfer'],
      },
      'Asset Maintenance',
      'Asset Repair',
      {
        name: 'Asset Return',
        children: ['Asset Return'],
      },
      'Return Request',
      'Transfer Request',
      'Asset Disposal',
      'Gate Pass',
      'Intangible Deactivation',
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
      'Intangible Deactivation Form',
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
      'Intangible Asset Types',
      'Risk Levels',
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
  if (parentName === 'Asset Borrowing' && child === 'Borrow Request Management') {
    return 'Requests';
  }
  if (parentName === 'Asset Transfer' && child === 'Asset Transfer') {
    return 'Requests';
  }
  if (parentName === 'Asset Return' && child === 'Asset Return') {
    return 'Requests';
  }
  return child;
}
