import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Shield,
  Activity,
  Clock,
  Search,
  RefreshCw,
  UserCheck,
  AlertCircle,
  UserX,
} from 'lucide-react';
import { api } from '@/lib/api';
import { User } from '@/types/assets';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCompanyContext } from '@/context/CompanyContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import {
  AppAlertDialogChromeFooter,
  AppAlertDialogFrame,
  AppAlertDialogGradientHeader,
  AppAlertDialogMessage,
} from '@/components/common/appDialogChrome';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Role } from '@/types/assets';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { Shimmer } from '@/components/ui/shimmer';
import { ModulePermissionsMatrix } from '@/components/common/ModulePermissionsMatrix';

const statsConfig = [
  { title: 'Total Users', key: 'total', icon: Users, color: 'text-red-600' },
  { title: 'Admin Users', key: 'admin', icon: Shield, color: 'text-red-600' },
  {
    title: 'Active Today',
    key: 'activeToday',
    icon: Activity,
    color: 'text-red-600',
  },
  {
    title: 'Pending Access',
    key: 'pending',
    icon: Clock,
    color: 'text-red-600',
  },
];

function isToday(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

type Permission = 'view' | 'create' | 'edit' | 'delete';

interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface PermissionData {
  [userKey: string]: {
    [module: string]: ModulePermissions;
  };
}

function UserPermissions() {
  const { user: currentUser } = useCurrentUser();
  const { refetch: refetchPermissions, hasPermission } = useUserPermissions();
  const { activeCompany } = useCompanyContext();
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [permissions, setPermissions] = useState<PermissionData>({});
  const canManagePermissions =
    hasPermission('Users', 'create') || hasPermission('Users', 'edit');
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [assignRoleSaving, setAssignRoleSaving] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [userTab, setUserTab] = useState<'permissions' | 'assign-role'>(
    'permissions'
  );
  const [userCustodianForm, setUserCustodianForm] = useState({
    hr_accountability_receiver: false,
    manager_approver_1: false,
    manager_approver_2: false,
    manager_approver_3: false,
  });
  const displayLoading = useDelayedLoading(loading, 2000);

  const custodianFormHasChanges = React.useMemo(() => {
    if (!selectedUser) return false;
    return (
      Boolean(userCustodianForm.hr_accountability_receiver) !==
        Boolean(selectedUser.hr_accountability_receiver) ||
      Boolean(userCustodianForm.manager_approver_1) !==
        Boolean(selectedUser.manager_approver_1) ||
      Boolean(userCustodianForm.manager_approver_2) !==
        Boolean(selectedUser.manager_approver_2) ||
      Boolean(userCustodianForm.manager_approver_3) !==
        Boolean(selectedUser.manager_approver_3)
    );
  }, [selectedUser, userCustodianForm]);

  const assignRoleOrCustodianHasChanges =
    selectedUser &&
    selectedRoleId &&
    (selectedRoleId !==
      (selectedUser.role_id != null ? String(selectedUser.role_id) : '') ||
      custodianFormHasChanges);

  const users = companyUsers.filter(u => u.is_active);
  const stats = React.useMemo(() => {
    const total = companyUsers.length;
    const admin = companyUsers.filter(
      u => u.role?.name === 'Admin' || u.role?.name === 'Super Admin'
    ).length;
    const activeToday = companyUsers.filter(
      u => isToday(u.last_login) || isToday(u.updated_at)
    ).length;
    const pending = companyUsers.filter(u => !u.is_active || !u.role_id).length;
    return statsConfig.map(({ title, key, icon: Icon, color }) => ({
      title,
      key,
      icon: Icon,
      color,
      value:
        key === 'total'
          ? String(total)
          : key === 'admin'
            ? String(admin)
            : key === 'activeToday'
              ? String(activeToday)
              : String(pending),
    }));
  }, [companyUsers]);


  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        // Determine companyId based on user role
        let companyId: string | undefined;
        const userRole = currentUser?.role?.name?.toLowerCase();
        if (userRole === 'super admin' || userRole === 'admin') {
          // Super Admin and Admin use active company from CompanyContext
          companyId = activeCompany?.id || undefined;
        } else {
          // IT asset and Admin asset users use their assigned company
          companyId = currentUser?.company_id || undefined;
        }

        const queryParams = new URLSearchParams();
        if (companyId) {
          queryParams.append('companyId', companyId);
        }
        const url = queryParams.toString() ? `/users?${queryParams.toString()}` : '/users';
        const response = await api.get<{ users: User[] }>(url);
        setCompanyUsers(response.users || []);
        const activeUsers = (response.users || []).filter(u => u.is_active);
        setSelectedUser(activeUsers.length > 0 ? activeUsers[0] : null);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error('Failed to fetch users:', error);
        }
        setCompanyUsers([]);
        setSelectedUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [activeCompany?.id, currentUser?.company_id, currentUser?.role?.name]);

  useEffect(() => {
    const fetchRoles = async () => {
      setRolesLoading(true);
      try {
        const response = await api.get<{
          roles?: Role[];
          data?: { roles?: Role[] };
        }>('/roles');
        setRoles(response.roles ?? response.data?.roles ?? []);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error('Failed to fetch roles:', error);
        }
        setRoles([]);
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    setSelectedRoleId(
      selectedUser?.role_id != null ? String(selectedUser.role_id) : ''
    );
  }, [selectedUser?.userID, selectedUser?.role_id]);

  useEffect(() => {
    if (!selectedUser) return;
    setUserCustodianForm({
      hr_accountability_receiver: Boolean(
        selectedUser.hr_accountability_receiver
      ),
      manager_approver_1: Boolean(selectedUser.manager_approver_1),
      manager_approver_2: Boolean(selectedUser.manager_approver_2),
      manager_approver_3: Boolean(selectedUser.manager_approver_3),
    });
  }, [selectedUser?.userID]);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!selectedUser) return;
      try {
        const response = await api.get<{
          permissions: Record<string, Record<string, boolean>>;
        }>(`/users/${selectedUser.userID}/permissions`);
        setPermissions(prev => ({
          ...prev,
          [`${selectedUser.first_name} ${selectedUser.last_name}`]:
            response.permissions as unknown as PermissionData[string],
        }));
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error('Failed to fetch permissions:', error);
        }
        setPermissions(prev => ({
          ...prev,
          [`${selectedUser.first_name} ${selectedUser.last_name}`]:
            {} as PermissionData[string],
        }));
      }
    };

    fetchPermissions();
  }, [selectedUser]);

  const handleSaveClick = () => {
    setShowSaveDialog(true);
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRoleId) return;
    setAssignRoleSaving(true);
    try {
      await api.patch(`/users/${selectedUser.userID}`, {
        email: selectedUser.email,
        first_name: selectedUser.first_name,
        last_name: selectedUser.last_name,
        employee_number: selectedUser.employee_number ?? undefined,
        role_id: selectedRoleId,
        department_id: selectedUser.department_id ?? undefined,
        company_id: selectedUser.company_id ?? undefined,
        is_active: selectedUser.is_active,
        hr_accountability_receiver:
          userCustodianForm.hr_accountability_receiver,
        manager_approver_1: userCustodianForm.manager_approver_1,
        manager_approver_2: userCustodianForm.manager_approver_2,
        manager_approver_3: userCustodianForm.manager_approver_3,
      });
      try {
        await api.post(`/users/${selectedUser.userID}/apply-role-permissions`);
      } catch (applyErr: unknown) {
        if (applyErr instanceof Error) {
          console.warn('Apply role permissions failed:', applyErr);
        }
        toast.warning(
          'Role assigned but default permissions could not be applied.'
        );
      }
      const newRole = roles.find(r => String(r.roleID) === selectedRoleId);
      setSelectedUser({
        ...selectedUser,
        role_id: selectedRoleId,
        role: newRole ?? selectedUser.role,
        ...userCustodianForm,
      });
      setCompanyUsers(prev =>
        prev.map(u =>
          u.userID === selectedUser.userID
            ? {
                ...u,
                role_id: selectedRoleId,
                role: newRole ?? u.role,
                ...userCustodianForm,
              }
            : u
        )
      );
      toast.success('Role assigned successfully');
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Failed to assign role:', error);
        toast.error(error.message || 'Failed to assign role');
      } else {
        toast.error('Failed to assign role');
      }
    } finally {
      setAssignRoleSaving(false);
    }
  };

  const savePermissions = async () => {
    if (!selectedUser) return;
    const userKey = `${selectedUser.first_name} ${selectedUser.last_name}`;
    const userPermissions = permissions[userKey] || {};
    try {
      await api.put(`/users/${selectedUser.userID}/permissions`, {
        permissions: userPermissions,
      });
      toast.success('Permissions saved successfully');
      setShowSaveDialog(false);
      if (currentUser && selectedUser.userID === currentUser.id) {
        refetchPermissions();
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Failed to save permissions:', error);
        toast.error('Failed to save permissions');
      } else {
        toast.error('Failed to save permissions');
      }
      setShowSaveDialog(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    const email = user.email.toLowerCase();
    const searchTermLower = searchTerm.toLowerCase();
    return (
      fullName.includes(searchTermLower) || email.includes(searchTermLower)
    );
  });

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <PageHeader
          icon={Users}
          title="User Management"
          description="Manage module access and assign roles to users"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </PageHeader>

        <div className="grid grid-cols-2 gap-4 px-0 lg:grid-cols-4">
          {stats.map(({ title, value, icon: Icon, color }) => (
            <Card
              key={title}
              className="relative border border-gray-100 shadow-md hover:shadow-lg transition-all duration-300 group overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 rounded-t-[100px] bg-red-600/20 group-hover:bg-red-600 transition-colors" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
                <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {title}
                </CardTitle>
                <div className="p-1.5 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </CardHeader>
              <CardContent className="pt-2 pb-6">
                <div className="text-3xl font-bold tracking-tight text-gray-900 group-hover:text-red-600 transition-colors">
                  {value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="lg:col-span-1">
              <Card className="flex min-h-[26rem] flex-col overflow-hidden border-0 bg-white/95 shadow-xl backdrop-blur lg:h-[800px]">
                <CardHeader className="p-6 pb-4 flex-shrink-0">
                  <CardTitle className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                    Select User
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col min-h-0 space-y-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                    />
                  </div>

                  {displayLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Card key={i}>
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <Shimmer className="h-12 w-12 sm:h-14 sm:w-14 rounded-full flex-shrink-0" />
                              <div className="flex-1 space-y-2">
                                <Shimmer className="h-4 w-3/4 rounded" />
                                <Shimmer className="h-3 w-1/2 rounded" />
                                <Shimmer className="h-6 w-16 rounded" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm sm:text-base">
                        {searchTerm ? 'No users found' : 'No users found'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 sm:space-y-4">
                      {filteredUsers.map(user => (
                        <Card
                          key={user.userID}
                          onClick={() => setSelectedUser(user)}
                          className={`cursor-pointer transition-all duration-300 border-2 ${
                            selectedUser?.userID === user.userID
                              ? 'border-red-600 shadow-xl bg-gradient-to-r from-red-50 to-red-50 ring-2 ring-red-300/50'
                              : 'border-transparent hover:border-red-300 hover:shadow-lg hover:bg-red-50/50'
                          }`}
                        >
                          <CardContent className="p-5 sm:p-6">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 ring-4 ring-white shadow-lg">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback
                                  className={`font-bold text-base sm:text-lg ${
                                    selectedUser?.userID === user.userID
                                      ? 'bg-red-600 text-white'
                                      : 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                                  }`}
                                >
                                  {`${user.first_name[0]}${user.last_name[0]}`}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-900 text-base sm:text-lg truncate">
                                  {`${user.first_name} ${user.last_name}`}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-500 truncate">
                                  {user.email}
                                </div>
                                <Badge
                                  variant={
                                    user.role?.name === 'Admin'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                  className="mt-2 text-xs"
                                >
                                  {user.role?.name || 'User'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <Card className="flex min-h-[26rem] flex-col overflow-hidden border-0 bg-white/95 shadow-2xl backdrop-blur lg:h-[800px]">
                <Tabs
                  value={userTab}
                  onValueChange={v =>
                    setUserTab(v as 'permissions' | 'assign-role')
                  }
                  className="w-full flex-1 flex flex-col min-h-0"
                >
                  <div className="flex flex-col min-h-0">
                    <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-none flex flex-col gap-3 p-6">
                      <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-col">
                          <CardTitle className="text-2xl font-bold no-underline">
                            {selectedUser
                              ? `${selectedUser.first_name} ${selectedUser.last_name}`
                              : 'User'}
                          </CardTitle>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 overflow-hidden">
                            <span className="text-red-100 text-sm font-medium whitespace-nowrap">
                              Manage module access and assign role
                            </span>
                            <div className="h-1 w-1 rounded-full bg-red-300/50 shrink-0" />
                            <span className="text-red-100/70 text-sm truncate">
                              Configure individual permissions
                            </span>
                          </div>
                        </div>
                        <div className="flex w-full flex-col gap-2 lg:w-auto lg:items-end">
                          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 lg:w-auto lg:grid-cols-none lg:flex lg:flex-row">
                            <TabsTrigger
                              value="permissions"
                              className="min-w-0 rounded-lg border-0 bg-transparent px-4 py-2 text-white/80 data-[state=active]:bg-white/25 data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:shadow-none no-underline lg:min-w-[7rem]"
                            >
                              Permissions
                            </TabsTrigger>
                            <TabsTrigger
                              value="assign-role"
                              className="min-w-0 rounded-lg border-0 bg-transparent px-4 py-2 text-white/80 data-[state=active]:bg-white/25 data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:shadow-none no-underline lg:min-w-[7rem]"
                            >
                              Assign Role
                            </TabsTrigger>
                          </TabsList>
                          {canManagePermissions && (
                            <div className="flex w-full flex-col gap-2 sm:flex-row lg:justify-end">
                              {userTab === 'permissions' && (
                                <Button
                                  size="sm"
                                  onClick={handleSaveClick}
                                  className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-medium min-w-[7rem]"
                                  disabled={
                                    !!selectedUser &&
                                    (!selectedUser.role ||
                                      selectedUser.role.name === 'User')
                                  }
                                >
                                  Save Permissions
                                </Button>
                              )}
                              {userTab === 'assign-role' && (
                                <Button
                                  size="sm"
                                  onClick={handleAssignRole}
                                  disabled={
                                    assignRoleSaving ||
                                    !selectedUser ||
                                    !selectedRoleId ||
                                    !assignRoleOrCustodianHasChanges
                                  }
                                  className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-medium min-w-[7rem]"
                                >
                                  {assignRoleSaving ? 'Saving...' : 'Save Role'}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
                      <TabsContent
                        value="permissions"
                        className="m-0 flex-1 flex flex-col min-h-0 overflow-hidden data-[state=inactive]:hidden"
                      >
                        {!canManagePermissions && (
                          <div className="p-6 bg-gray-50 border-b border-gray-200">
                            <p className="text-gray-600">
                              You do not have permission to manage module
                              access. Ask an administrator for Users create or
                              edit access.
                            </p>
                          </div>
                        )}
                        {canManagePermissions &&
                          selectedUser &&
                          (!selectedUser.role ||
                            selectedUser.role.name === 'User') && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mx-4 mt-4 shrink-0">
                              <p className="text-yellow-800">
                                Please assign a role to this user to set module
                                permissions and access.
                              </p>
                            </div>
                          )}
                        {canManagePermissions && (
                          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            <ModulePermissionsMatrix
                              className="flex-1 min-h-0"
                              value={
                                selectedUser
                                  ? permissions[
                                      `${selectedUser.first_name} ${selectedUser.last_name}`
                                    ] || {}
                                  : {}
                              }
                              onChange={next => {
                                if (!selectedUser) return;
                                const userKey = `${selectedUser.first_name} ${selectedUser.last_name}`;
                                setPermissions(prev => ({
                                  ...prev,
                                  [userKey]: next,
                                }));
                              }}
                              disabled={
                                !canManagePermissions ||
                                (!!selectedUser &&
                                  (!selectedUser.role ||
                                    selectedUser.role.name === 'User'))
                              }
                            />
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent
                        value="assign-role"
                        forceMount
                        className="m-0 flex-1 flex flex-col min-h-[360px] overflow-auto custom-scrollbar data-[state=inactive]:hidden"
                      >
                        {!canManagePermissions && (
                          <div className="mx-6 mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 shadow-sm">
                            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                            <p className="text-sm font-medium text-amber-800">
                              You do not have permission to assign roles. Ask an
                              administrator for Users create or edit access.
                            </p>
                          </div>
                        )}
                        {!selectedUser && (
                          <div className="mx-6 mt-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-sm">
                            <UserX className="h-5 w-5 shrink-0 text-slate-500 mt-0.5" />
                            <p className="text-sm font-medium text-slate-700">
                              Select a user from the list to assign a role.
                            </p>
                          </div>
                        )}
                        <div className="flex-1 p-6 pt-4">
                          <div className="w-full space-y-6">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md ring-2 ring-red-200/50">
                                <Shield className="h-6 w-6" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold tracking-tight text-gray-900">
                                  Assign User Role
                                </h3>
                                <p className="mt-0.5 text-sm text-gray-500">
                                  Select a primary role and approver custodian
                                  options. Asset module access uses the
                                  Permissions tab.
                                </p>
                              </div>
                            </div>

                            <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-6">
                              <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-red-500 to-red-600" />
                              <div className="pl-4 space-y-4">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                  System Role
                                </Label>
                                {rolesLoading ? (
                                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                                    <div className="h-4 w-16 animate-pulse rounded bg-red-200" />
                                    Loading roles...
                                  </div>
                                ) : (
                                  <>
                                    <Select
                                      value={selectedRoleId}
                                      onValueChange={setSelectedRoleId}
                                    >
                                      <SelectTrigger
                                        className="h-12 w-full border-gray-200 bg-gray-50/50 text-base shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-red-500/20 focus:border-red-400 disabled:opacity-60"
                                        disabled={
                                          !canManagePermissions || !selectedUser
                                        }
                                      >
                                        <SelectValue placeholder="Select role" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {roles.map(role => (
                                          <SelectItem
                                            key={String(role.roleID)}
                                            value={String(role.roleID)}
                                            className="py-3"
                                          >
                                            <div className="flex items-center gap-2">
                                              <div
                                                className={cn(
                                                  'h-2 w-2 rounded-full',
                                                  role.name === 'Admin' ||
                                                    role.name === 'Super Admin'
                                                    ? 'bg-red-600'
                                                    : 'bg-blue-500'
                                                )}
                                              />
                                              {role.name}
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {roles.length === 0 && !rolesLoading && (
                                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                                        No roles found. Add roles in Settings
                                        first.
                                      </p>
                                    )}
                                  </>
                                )}
                                <p className="text-xs text-gray-400">
                                  * Changing the role will reset custom
                                  permissions to role defaults.
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                              <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-6">
                                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-red-400 to-red-500" />
                                <div className="pl-4 space-y-4">
                                  <div className="flex items-center gap-2">
                                    <UserCheck className="h-4 w-4 text-gray-500" />
                                    <Label className="text-sm font-semibold text-gray-800">
                                      Approver custodian
                                    </Label>
                                  </div>
                                  <div className="space-y-4">
                                    {[
                                      {
                                        key: 'hr',
                                        label:
                                          'HR asset accountability Receiver',
                                        desc: 'Sign accountability to receive the accountability of each user for copy for 201 file.',
                                        checked:
                                          userCustodianForm.hr_accountability_receiver,
                                        set: (v: boolean) =>
                                          setUserCustodianForm(prev => ({
                                            ...prev,
                                            hr_accountability_receiver: v,
                                          })),
                                      },
                                      {
                                        key: 'm1',
                                        label: 'Manager Approver 1',
                                        checked:
                                          userCustodianForm.manager_approver_1,
                                        set: (v: boolean) =>
                                          setUserCustodianForm(prev => ({
                                            ...prev,
                                            manager_approver_1: v,
                                          })),
                                      },
                                      {
                                        key: 'm2',
                                        label: 'Manager Approver 2',
                                        checked:
                                          userCustodianForm.manager_approver_2,
                                        set: (v: boolean) =>
                                          setUserCustodianForm(prev => ({
                                            ...prev,
                                            manager_approver_2: v,
                                          })),
                                      },
                                      {
                                        key: 'm3',
                                        label: 'Manager Approver 3',
                                        checked:
                                          userCustodianForm.manager_approver_3,
                                        set: (v: boolean) =>
                                          setUserCustodianForm(prev => ({
                                            ...prev,
                                            manager_approver_3: v,
                                          })),
                                      },
                                    ].map(
                                      ({ key, label, desc, checked, set }) => (
                                        <div
                                          key={key}
                                          className="rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 transition-colors hover:bg-gray-50"
                                        >
                                          <div className="flex items-center justify-between gap-4">
                                            <Label className="text-sm font-medium text-gray-800">
                                              {label}
                                            </Label>
                                            <Switch
                                              checked={checked}
                                              onCheckedChange={set}
                                              disabled={
                                                !canManagePermissions ||
                                                !selectedUser
                                              }
                                            />
                                          </div>
                                          {desc && (
                                            <p className="mt-1.5 text-xs text-gray-500">
                                              {desc}
                                            </p>
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </CardContent>
                  </div>
                </Tabs>
              </Card>
            </div>
          </div>
        </div>

        <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <AppAlertDialogFrame className="max-w-md" style={{ border: 'none' }}>
            <AppAlertDialogGradientHeader
              title={
                <span className="flex items-center gap-3">
                  <Shield className="h-8 w-8 shrink-0 text-white" />
                  Save Permissions?
                </span>
              }
            />
            <AppAlertDialogMessage>
              <AlertDialogDescription className="text-base text-gray-600">
                This will update the permissions for{' '}
                <strong className="text-foreground">
                  {selectedUser
                    ? `${selectedUser.first_name} ${selectedUser.last_name}`
                    : 'User'}
                </strong>
                .
                <br />
                <span className="text-sm text-muted-foreground">
                  The user will have access to the selected modules and actions.
                </span>
              </AlertDialogDescription>
            </AppAlertDialogMessage>
            <AppAlertDialogChromeFooter className="gap-3">
              <AlertDialogCancel className="rounded-xl">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={savePermissions}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium"
              >
                Yes, Save Permissions
              </AlertDialogAction>
            </AppAlertDialogChromeFooter>
          </AppAlertDialogFrame>
        </AlertDialog>
      </main>
    </div>
  );
}

export default UserPermissions;
