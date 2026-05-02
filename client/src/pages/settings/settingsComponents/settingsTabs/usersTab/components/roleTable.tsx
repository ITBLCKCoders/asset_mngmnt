import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Shield, Plus } from 'lucide-react';
import { Role, User } from '@/types/assets';
import { Shimmer } from '@/components/ui/shimmer';
import { useMemo } from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';

function formatAssetType(v: string | null | undefined): string {
  if (!v || v === 'none') return '—';
  return v === 'it' ? 'IT Asset' : v === 'admin' ? 'Admin Asset' : v;
}

function formatManagerRole(v: string | null | undefined): string {
  if (!v || v === 'none') return '—';
  const labels: Record<string, string> = {
    itManager: 'IT Manager',
    adminManager: 'Admin Manager',
    overallManager: 'Overall Manager',
  };
  return labels[v] || v;
}

interface RoleTableProps {
  roles: Role[];
  users: User[];
  loading: boolean;
  openEdit: (role: Role) => void;
  setDeleting: (role: Role | null) => void;
  currentUserRoleName?: string;
}

export function RoleTable({
  roles,
  users,
  loading,
  openEdit,
  setDeleting,
}: RoleTableProps) {
  const { hasPermission } = useUserPermissions();

  const columns = useMemo<ColumnDef<Role>[]>(
    () => [
      {
        id: 'name',
        header: 'Role Name',
        accessorKey: 'name',
        size: 160,
        cell: ({ row }) => (
          <span className="font-semibold text-foreground/90 text-base">
            {row.original.name}
          </span>
        ),
      },
      {
        id: 'description',
        header: 'Description',
        accessorKey: 'description',
        size: 220,
        cell: ({ row }) => (
          <span className="text-muted-foreground max-w-[200px] block truncate">
            {row.original.description || '—'}
          </span>
        ),
      },
      {
        id: 'asset_type',
        header: 'Asset Type',
        accessorFn: row => formatAssetType(row.asset_type),
        size: 120,
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatAssetType(row.original.asset_type)}
          </span>
        ),
      },
      {
        id: 'manager_role',
        header: 'Manager Role',
        accessorFn: row => formatManagerRole(row.manager_role),
        size: 140,
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatManagerRole(row.original.manager_role)}
          </span>
        ),
      },
      {
        id: 'access',
        header: 'Access',
        accessorFn: row =>
          [
            row.hr_accountability_receiver && 'HR Receiver',
            row.manager_approver_1 && 'Approver 1',
            row.manager_approver_2 && 'Approver 2',
            row.manager_approver_3 && 'Approver 3',
          ]
            .filter(Boolean)
            .join(', '),
        size: 200,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.hr_accountability_receiver && (
              <Badge variant="secondary" className="text-xs font-normal">
                HR Receiver
              </Badge>
            )}
            {row.original.manager_approver_1 && (
              <Badge variant="secondary" className="text-xs font-normal">
                Approver 1
              </Badge>
            )}
            {row.original.manager_approver_2 && (
              <Badge variant="secondary" className="text-xs font-normal">
                Approver 2
              </Badge>
            )}
            {row.original.manager_approver_3 && (
              <Badge variant="secondary" className="text-xs font-normal">
                Approver 3
              </Badge>
            )}
            {!row.original.hr_accountability_receiver &&
              !row.original.manager_approver_1 &&
              !row.original.manager_approver_2 &&
              !row.original.manager_approver_3 && (
                <span className="text-muted-foreground text-sm">—</span>
              )}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 120,
        enableSorting: false,
        cell: ({ row }) => {
          const role = row.original;
          const canDelete =
            !users.some(u => u.role_id === role.roleID) &&
            hasPermission('Roles', 'delete');
          return (
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="hover:bg-primary/10 hover:text-primary transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!hasPermission('Roles', 'edit')}
                onClick={() => openEdit(role)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              {canDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setDeleting(role)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [users, openEdit, setDeleting, hasPermission]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 border-b flex items-center gap-4 p-4">
            <Shimmer className="h-6 w-32 flex-shrink-0" />
            <Shimmer className="h-6 w-40 rounded flex-shrink-0" />
            <Shimmer className="h-6 w-20 rounded flex-shrink-0" />
            <Shimmer className="h-6 w-24 rounded flex-shrink-0" />
            <Shimmer className="h-6 w-28 rounded flex-shrink-0" />
            <div className="flex space-x-2 ml-auto">
              <Shimmer className="h-8 w-8 rounded" />
              <Shimmer className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="py-20 text-center">
        <Shield className="mx-auto mb-6 h-20 w-20 text-muted-foreground" />
        <p className="mb-8 text-xl text-muted-foreground">No roles yet</p>
        <Button size="lg" className="bg-red-600 text-white shadow-lg">
          <Plus className="mr-3 h-6 w-6" /> Add Your First Role
        </Button>
      </div>
    );
  }

  return (
    <DataTable<Role>
      tableId="roles-management"
      data={roles}
      columns={columns}
      searchPlaceholder="Search roles..."
      mobileCardFields={[
        { key: 'name', label: 'Role Name' },
        {
          key: 'description',
          label: 'Description',
          render: role => role.description || '—',
        },
        {
          key: 'asset_type',
          label: 'Asset Type',
          render: role => formatAssetType(role.asset_type),
        },
        {
          key: 'manager_role',
          label: 'Manager Role',
          render: role => formatManagerRole(role.manager_role),
        },
      ]}
      emptyState={<p className="text-muted-foreground">No matching roles</p>}
    />
  );
}
