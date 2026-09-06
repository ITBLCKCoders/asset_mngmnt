import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Users, Plus, UserCheck, UserX } from 'lucide-react';
import { User } from '@/types/assets';
import { Shimmer } from '@/components/ui/shimmer';
import { useMemo } from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { DataTable } from '@/components/ui/dataTable';
import { getRoleDisplayName } from '@/lib/roleUtils';
import type { ColumnDef } from '@tanstack/react-table';

interface UserTableProps {
  users: User[];
  loading: boolean;
  openEdit: (user: User) => void;
  currentUserRoleName?: string;
}

export function UserTable({ users, loading, openEdit }: UserTableProps) {
  const { hasPermission } = useUserPermissions();

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorFn: row => `${row.first_name} ${row.last_name}`.trim(),
        size: 180,
        cell: ({ row }) => (
          <span className="font-semibold text-foreground/90 text-base">
            {row.original.first_name} {row.original.last_name}
          </span>
        ),
      },
      {
        id: 'email',
        header: 'Email',
        accessorKey: 'email',
        size: 220,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        id: 'employee_number',
        header: 'Employee ID',
        accessorKey: 'employee_number',
        size: 120,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.employee_number || '—'}
          </span>
        ),
      },
      {
        id: 'role',
        header: 'Role',
        accessorFn: row => row.role?.name ?? '',
        size: 140,
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            className="font-mono text-sm px-4 py-1.5 bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
          >
            {getRoleDisplayName(row.original.role?.name) || 'No Role'}
          </Badge>
        ),
      },
      {
        id: 'company',
        header: 'Company',
        accessorFn: row => row.company?.name ?? '',
        size: 140,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.company?.name || '—'}
          </span>
        ),
      },
      {
        id: 'department',
        header: 'Department',
        accessorFn: row => row.department?.name ?? '',
        size: 140,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.department?.name || '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: row => (row.is_active ? 'Active' : 'Inactive'),
        size: 100,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.is_active ? (
              <>
                <UserCheck className="h-4 w-4 text-green-500" />
                <span className="text-green-600 text-sm font-medium">
                  Active
                </span>
              </>
            ) : (
              <>
                <UserX className="h-4 w-4 text-red-500" />
                <span className="text-red-600 text-sm font-medium">
                  Inactive
                </span>
              </>
            )}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 100,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="hover:bg-primary/10 hover:text-primary transition-all rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!hasPermission('Users', 'edit')}
              onClick={() => openEdit(row.original)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [openEdit, hasPermission]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 border-b flex items-center space-x-4 p-4"
          >
            <Shimmer className="h-6 w-32" />
            <Shimmer className="h-6 w-16 rounded" />
            <Shimmer className="h-6 w-48 rounded" />
            <div className="flex space-x-2 ml-auto">
              <Shimmer className="h-8 w-8 rounded" />
              <Shimmer className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="py-20 text-center">
        <Users className="mx-auto mb-6 h-20 w-20 text-muted-foreground" />
        <p className="mb-8 text-xl text-muted-foreground">No users yet</p>
        <Button size="lg" className="bg-red-600 text-white shadow-lg">
          <Plus className="mr-3 h-6 w-6" /> Add Your First User
        </Button>
      </div>
    );
  }

  return (
    <DataTable<User>
      tableId="users-roles-management"
      data={users}
      columns={columns}
      searchPlaceholder="Search users..."
      mobileCardFields={[
        {
          key: 'name',
          label: 'Name',
          render: user => `${user.first_name} ${user.last_name}`.trim(),
        },
        { key: 'email', label: 'Email' },
        { key: 'employee_number', label: 'Employee ID' },
        {
          key: 'role',
          label: 'Role',
          render: user => getRoleDisplayName(user.role?.name) || 'No Role',
        },
        {
          key: 'status',
          label: 'Status',
          render: user => (user.is_active ? 'Active' : 'Inactive'),
        },
      ]}
      emptyState={<p className="text-muted-foreground">No matching users</p>}
    />
  );
}
