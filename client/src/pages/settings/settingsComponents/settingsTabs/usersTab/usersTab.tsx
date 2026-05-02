import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SettingsUsersTabSkeleton } from '@/components/common/pageSkeletons';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserManagement } from './hooks/useUserManagement';
import { useRoleManagement } from './hooks/useRoleManagement';
import { UserFormDialog } from './components/userFormDialog';
import { UserTable } from './components/userTable';
import { RoleFormDialog } from './components/roleFormDialog';
import { RoleTable } from './components/roleTable';
import { AlertDialogs } from './components/alertDialogs';
import { FileText, FileSpreadsheet, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export function UsersTab({ isActive }: { isActive?: boolean }) {
  const { user: currentUser } = useCurrentUser();
  const { hasPermission } = useUserPermissions();
  const [isTabLoading, setIsTabLoading] = useState(true);
  const [searchParams] = useSearchParams();

  const userManagement = useUserManagement(isActive ?? false);
  const roleManagement = useRoleManagement(userManagement.setRoles);

  const isSuperAdmin = currentUser?.role?.name === 'Super Admin';
  const filteredUsers = isSuperAdmin
    ? userManagement.users
    : userManagement.users.filter(user => user.role?.name !== 'Super Admin');
  const filteredRoles = isSuperAdmin
    ? userManagement.roles
    : userManagement.roles.filter(role => role.name !== 'Super Admin');

  useEffect(() => {
    if (!isActive) {
      return () => {};
    }
    setIsTabLoading(true);
    const timer = setTimeout(() => setIsTabLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [isActive]);

  // Handle URL params for auto-opening edit modal
  useEffect(() => {
    if (!isActive || userManagement.loading) return;

    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    if (action === 'edit' && userId) {
      const userToEdit = userManagement.users.find(u => u.userID === userId);
      if (userToEdit) {
        userManagement.openEdit(userToEdit);
        // Clear params to prevent re-opening on refresh
        searchParams.delete('action');
        searchParams.delete('userId');
        window.history.replaceState({}, '', `/settings?${searchParams.toString()}`);
      }
    }
  }, [isActive, userManagement.loading, userManagement.users, searchParams, userManagement.openEdit]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Users List', 20, 10);
    const tableColumn = [
      'Name',
      'Email',
      'Employee ID',
      'Username',
      'Company',
      'Department',
      'Position',
      'Role',
      'Status',
    ];
    const tableRows = filteredUsers.map(user => [
      `${user.first_name} ${user.last_name}`,
      user.email,
      user.employee_number || '',
      user.username || '',
      user.company?.name || '',
      user.department?.name || '',
      user.position || '',
      user.role?.name || '',
      user.is_active ? 'Active' : 'Inactive',
    ]);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    doc.save('users_list.pdf');
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Users');
    ws.columns = [
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Employee ID', key: 'employeeId', width: 16 },
      { header: 'Username', key: 'username', width: 16 },
      { header: 'Company', key: 'company', width: 18 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'Position', key: 'position', width: 18 },
      { header: 'Role', key: 'role', width: 18 },
      { header: 'Status', key: 'status', width: 12 },
    ];
    filteredUsers.forEach(user => {
      ws.addRow({
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        employeeId: user.employee_number || '',
        username: user.username || '',
        company: user.company?.name || '',
        department: user.department?.name || '',
        position: user.position || '',
        role: user.role?.name || '',
        status: user.is_active ? 'Active' : 'Inactive',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_list.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isTabLoading) {
    return <SettingsUsersTabSkeleton />;
  }

  return (
    <TabsContent value="users" className="mt-0">
      <section className="mb-10">
        <div className="bg-red-600 rounded-t-2xl p-6 mb-0">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Users & Roles Management
              </h2>
              <p className="text-white/80 mt-2">
                Manage user accounts, roles, and permissions for super admin
              </p>
            </div>

              <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={exportToPDF}
                variant="secondary"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button
                onClick={exportToExcel}
                variant="secondary"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              {hasPermission('Users', 'create') && (
                <UserFormDialog
                  isOpen={userManagement.isOpen}
                  setIsOpen={userManagement.setIsOpen}
                  editing={userManagement.editing}
                  form={userManagement.form}
                  setForm={userManagement.setForm}
                  hasChanges={userManagement.hasChanges}
                  handleSave={userManagement.handleSave}
                  saving={userManagement.saving}
                  roles={userManagement.roles}
                  departments={userManagement.departments}
                  companies={userManagement.companies}
                  showCancelAlert={userManagement.showCancelAlert}
                  setShowCancelAlert={userManagement.setShowCancelAlert}
                />
              )}
            </div>
          </div>
        </div>

        <div className="rounded-b-2xl border border-t-0 border-gray-200 bg-card p-4 sm:p-5">
          <div className="rounded-xl overflow-hidden max-h-[calc(10*5rem+3rem)] overflow-y-auto">
            <UserTable
              users={filteredUsers}
              loading={userManagement.loading}
              openEdit={userManagement.openEdit}
              currentUserRoleName={
                userManagement.roles.find(
                  r => r.roleID === currentUser?.role_id
                )?.name
              }
            />
          </div>
        </div>
      </section>

      <section className="mb-10">
          <div className="mb-0 rounded-t-2xl bg-red-600 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Roles Management
              </h2>
              <p className="text-white/80 mt-2">
                Create and manage user roles for access control
              </p>
            </div>

            {hasPermission('Roles', 'create') && (
              <RoleFormDialog
                isOpen={roleManagement.rolesIsOpen}
                setIsOpen={roleManagement.setRolesIsOpen}
                editing={roleManagement.rolesEditing}
                form={roleManagement.rolesForm}
                setForm={roleManagement.setRolesForm}
                modulePermissions={roleManagement.rolesModulePermissions}
                setModulePermissions={roleManagement.setRolesModulePermissions}
                hasChanges={roleManagement.rolesHasChanges}
                handleSave={roleManagement.handleRolesSave}
                saving={roleManagement.rolesSaving}
                showCancelAlert={roleManagement.rolesShowCancelAlert}
                setShowCancelAlert={roleManagement.setRolesShowCancelAlert}
                onPrepareCreate={() => roleManagement.setRolesEditing(null)}
              />
            )}
          </div>
        </div>

        <div className="rounded-b-2xl border border-t-0 border-gray-200 bg-card p-4 sm:p-5">
          <div className="rounded-xl overflow-hidden max-h-[calc(10*5rem+3rem)] overflow-y-auto">
            <RoleTable
              roles={filteredRoles}
              users={filteredUsers}
              loading={userManagement.loading}
              openEdit={roleManagement.openRolesEdit}
              setDeleting={roleManagement.setRolesDeleting}
              currentUserRoleName={
                userManagement.roles.find(
                  r => r.roleID === currentUser?.role_id
                )?.name
              }
            />
          </div>
        </div>
      </section>

      <AlertDialogs
        showCancelAlert={userManagement.showCancelAlert}
        setShowCancelAlert={userManagement.setShowCancelAlert}
        setIsOpen={userManagement.setIsOpen}
        deleting={userManagement.deleting}
        setDeleting={userManagement.setDeleting}
        handleDelete={userManagement.handleDelete}
        rolesShowCancelAlert={roleManagement.rolesShowCancelAlert}
        setRolesShowCancelAlert={roleManagement.setRolesShowCancelAlert}
        setRolesIsOpen={roleManagement.setRolesIsOpen}
        rolesDeleting={roleManagement.rolesDeleting}
        setRolesDeleting={roleManagement.setRolesDeleting}
        handleRolesDelete={roleManagement.handleRolesDelete}
      />
    </TabsContent>
  );
}
