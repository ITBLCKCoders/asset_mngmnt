import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { getRoleDisplayName } from '@/lib/roleUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Lock, Key } from 'lucide-react';
import { User, Role, Department, Company } from '@/types/assets';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  role_id: string | null;
  department_id: string | null;
  company_id: string | null;
  is_active: boolean;
}

interface UserFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editing: User | null;
  form: UserFormData;
  setForm: (
    form: UserFormData | ((prev: UserFormData) => UserFormData)
  ) => void;
  hasChanges: () => boolean;
  handleSave: () => void;
  saving: boolean;
  roles: Role[];
  departments: Department[];
  companies: Company[];
  showCancelAlert: boolean;
  setShowCancelAlert: (show: boolean) => void;
  onRefresh?: () => void;
}

export function UserFormDialog({
  isOpen,
  setIsOpen,
  editing,
  form,
  setForm,
  hasChanges,
  handleSave,
  saving,
  roles,
  departments,
  companies,
  setShowCancelAlert,
  onRefresh,
}: UserFormDialogProps) {
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [removingLockout, setRemovingLockout] = useState(false);

  const handleRemoveLockout = async () => {
    if (!editing?.userID) return;

    try {
      setRemovingLockout(true);
      await api.post(`/users/${editing.userID}/remove-lockout`);
      toast.success('User lockout removed successfully');
      onRefresh?.();
    } catch (err: any) {
      console.error('Failed to remove lockout:', err);
      toast.error(err.response?.data?.error || 'Failed to remove lockout');
    } finally {
      setRemovingLockout(false);
    }
  };

  const handleChangePassword = async () => {
    if (!editing?.userID || !newPassword) {
      toast.error('Password is required');
      return;
    }

    try {
      setChangingPassword(true);
      await api.post(`/users/${editing.userID}/change-password`, {
        newPassword,
      });
      toast.success('Password changed successfully');
      setNewPassword('');
      setShowChangePasswordDialog(false);
    } catch (err: any) {
      console.error('Failed to change password:', err);
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground text-white font-medium rounded-xl"
          onClick={() => {
            setIsOpen(true);
          }}
        >
          <Plus className="mr-2 h-5 w-5" />
          Add New User
        </Button>
      </DialogTrigger>

      <AppDialogFrame className="sm:max-w-md">
        <AppDialogGradientHeader
          title={editing ? 'Edit User' : 'Create New User'}
          description={
            editing
              ? 'Update account details, role, and assignments.'
              : 'Add a new user and set their role and organization.'
          }
        />
        <AppDialogBody className="grid gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-base font-medium">First Name</Label>
              <Input
                value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })}
                placeholder="John"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Last Name</Label>
              <Input
                value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })}
                placeholder="Doe"
                className="text-base"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="john.doe@company.com"
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">
              Employee ID (Optional)
            </Label>
            <Input
              value={form.employee_number}
              onChange={e =>
                setForm({ ...form, employee_number: e.target.value })
              }
              placeholder="EMP001"
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">Role</Label>
            <Select
              value={form.role_id || undefined}
              onValueChange={value =>
                setForm({ ...form, role_id: value || null })
              }
            >
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {roles.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-gray-500">
                    No roles available
                  </div>
                ) : (
                  roles.map(role => (
                    <SelectItem
                      key={role.roleID}
                      value={role.roleID}
                      className="hover:bg-gray-200"
                    >
                      {getRoleDisplayName(role.name)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">
              Department (Optional)
            </Label>
            <Select
              value={form.department_id || undefined}
              onValueChange={value =>
                setForm({ ...form, department_id: value || null })
              }
            >
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {departments.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-gray-500">
                    No departments available
                  </div>
                ) : (
                  departments.map(dept => (
                    <SelectItem
                      key={dept.departmentID}
                      value={dept.departmentID}
                      className="hover:bg-gray-200"
                    >
                      {dept.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">Company (Optional)</Label>
            <Select
              value={form.company_id || undefined}
              onValueChange={value =>
                setForm({ ...form, company_id: value || null })
              }
            >
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {companies.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-gray-500">
                    No companies available
                  </div>
                ) : (
                  companies.map(comp => (
                    <SelectItem
                      key={comp.id}
                      value={comp.id}
                      className="hover:bg-gray-200"
                    >
                      {comp.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={form.is_active}
              onCheckedChange={checked =>
                setForm({ ...form, is_active: checked })
              }
              className="data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-red-100"
            />
            <Label className="text-base font-medium">Active Account</Label>
            {editing && (
              <Button
                variant="outline"
                onClick={handleRemoveLockout}
                disabled={removingLockout || !editing.lockout_until || new Date(editing.lockout_until) <= new Date()}
                className="rounded-xl ml-auto"
              >
                <Lock className="mr-2 h-4 w-4" />
                {removingLockout ? 'Removing...' : 'Remove Lockout'}
              </Button>
            )}
          </div>
        </AppDialogBody>
        <AppDialogChromeFooter>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => {
                if (hasChanges()) {
                  setShowCancelAlert(true);
                } else {
                  setIsOpen(false);
                }
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            {editing && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowChangePasswordDialog(true)}
                  className="rounded-xl"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
              </>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className="rounded-xl px-6 shadow-md ml-auto"
            >
              {saving ? 'Saving...' : editing ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </AppDialogChromeFooter>
      </AppDialogFrame>

      {/* Change Password Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <AppDialogFrame className="sm:max-w-md">
          <AppDialogGradientHeader
            title="Change Password"
            description="Set a new password for this user"
          />
          <AppDialogBody className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
          </AppDialogBody>
          <AppDialogChromeFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowChangePasswordDialog(false);
                setNewPassword('');
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword}
              className="rounded-xl"
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>
    </Dialog>
  );
}
