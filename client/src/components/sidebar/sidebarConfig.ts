import type { LucideIcon } from 'lucide-react';
import {
  Package,
  Wrench,
  ArrowRightLeft,
  Undo2,
  Trash2,
  ClipboardList,
  Hammer,
  Tag,
  PlusCircle,
  FileText,
  HandHelping,
} from 'lucide-react';

export type AssetSidebarChild = {
  label: string;
  perm: string;
  path: string;
  icon: LucideIcon;
};

export type AssetSidebarEntry = {
  label: string;
  perm: string;
  path: string;
  icon: LucideIcon;
  /** Stable key for expand/collapse when `children` is non-empty */
  groupKey?: string;
  children?: AssetSidebarChild[];
};

/**
 * Asset-area sidebar menu definition.
 *
 * Order is the visual order in the sidebar. `perm` is matched against the
 * current user's permissions (see `useUserPermissions`). Entries with
 * `children` render as collapsible groups keyed by `groupKey`.
 */
export const ASSET_SIDEBAR_ENTRIES: AssetSidebarEntry[] = [
  {
    label: 'Asset List',
    perm: 'Asset List',
    path: '/assets',
    icon: Package,
  },
  {
    label: 'Asset Assignment',
    perm: 'Asset Assignment',
    path: '/assets/assignment',
    icon: ClipboardList,
  },
  {
    label: 'Asset Request',
    perm: 'Asset Request',
    path: '/assets/request',
    icon: PlusCircle,
  },
  {
    label: 'Request Management',
    perm: 'Request Management',
    path: '/assets/request-admin',
    icon: ClipboardList,
  },
  {
    label: 'Borrow assets',
    perm: 'Asset Borrowing',
    path: '/assets/borrow',
    icon: HandHelping,
    groupKey: 'assets-borrow',
    children: [
      {
        label: 'Requests',
        perm: 'Borrow Request Management',
        path: '/assets/borrow-requests',
        icon: FileText,
      },
    ],
  },
  {
    label: 'Asset Tagging',
    perm: 'Asset Tagging',
    path: '/assets/tagging',
    icon: Tag,
  },
  {
    label: 'Asset Transfer',
    perm: 'Asset Transfer',
    path: '/assets/transfer',
    icon: ArrowRightLeft,
    groupKey: 'assets-transfer',
    children: [
      {
        label: 'Requests',
        perm: 'Asset Transfer',
        path: '/assets/transfer-requests',
        icon: FileText,
      },
    ],
  },
  {
    label: 'Asset Maintenance',
    perm: 'Asset Maintenance',
    path: '/assets/maintenance',
    icon: Wrench,
  },
  {
    label: 'Asset Repair',
    perm: 'Asset Repair',
    path: '/assets/repair',
    icon: Hammer,
  },
  {
    label: 'Asset Return',
    perm: 'Asset Return',
    path: '/assets/return',
    icon: Undo2,
    groupKey: 'assets-return',
    children: [
      {
        label: 'Requests',
        perm: 'Asset Return',
        path: '/assets/return-requests',
        icon: FileText,
      },
    ],
  },
  {
    label: 'Return asset',
    perm: 'Return Request',
    path: '/assets/return-request',
    icon: Undo2,
    groupKey: 'assets-return-request',
    children: [
      {
        label: 'My Requests',
        perm: 'Return Request',
        path: '/assets/return-request/my-requests',
        icon: FileText,
      },
    ],
  },
  {
    label: 'Transfer asset',
    perm: 'Transfer Request',
    path: '/assets/transfer-request',
    icon: ArrowRightLeft,
    groupKey: 'assets-transfer-request',
    children: [
      {
        label: 'My Requests',
        perm: 'Transfer Request',
        path: '/assets/transfer-request/my-requests',
        icon: FileText,
      },
    ],
  },
  {
    label: 'Asset Disposal',
    perm: 'Asset Disposal',
    path: '/assets/disposal',
    icon: Trash2,
  },
];
