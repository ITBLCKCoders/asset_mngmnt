import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, UserCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Role } from '@/types/assets';
import type { RoleFormState } from '../hooks/useRoleManagement';
import {
  ModulePermissionsMatrix,
  type ModulePermissionsMap,
} from '@/components/common/ModulePermissionsMatrix';

interface RoleFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editing: Role | null;
  form: RoleFormState;
  setForm: (
    form: RoleFormState | ((prev: RoleFormState) => RoleFormState)
  ) => void;
  modulePermissions: ModulePermissionsMap;
  setModulePermissions: (
    v:
      | ModulePermissionsMap
      | ((prev: ModulePermissionsMap) => ModulePermissionsMap)
  ) => void;
  hasChanges: () => boolean;
  handleSave: () => void;
  saving: boolean;
  showCancelAlert: boolean;
  setShowCancelAlert: (show: boolean) => void;
  /** Ensures create mode when opening via "Add New Role" (clears edit target). */
  onPrepareCreate?: () => void;
}

export function RoleFormDialog({
  isOpen,
  setIsOpen,
  editing,
  form,
  setForm,
  modulePermissions,
  setModulePermissions,
  hasChanges,
  handleSave,
  saving,
  setShowCancelAlert,
  onPrepareCreate,
}: RoleFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground text-white font-medium rounded-xl"
          onClick={() => {
            onPrepareCreate?.();
            setIsOpen(true);
          }}
        >
          <Plus className="mr-2 h-5 w-5" />
          Add New Role
        </Button>
      </DialogTrigger>

      <AppDialogFrame className="sm:max-w-5xl !flex !flex-col overflow-hidden">
        <AppDialogGradientHeader
          title={editing ? 'Edit Role' : 'Create New Role'}
          description="Define the role name, module permissions, custodian options, and approver access."
        />
        <AppDialogBody className="grid min-h-0 flex-1 gap-6 overflow-y-auto">
          <div className="space-y-2">
            <Label className="text-base font-medium">Role Name</Label>
            <Input
              value={form.name}
              onChange={e =>
                setForm(prev => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g., Administrator"
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">Description</Label>
            <Textarea
              value={form.description}
              onChange={e =>
                setForm(prev => ({ ...prev, description: e.target.value }))
              }
              placeholder="Describe the role's purpose..."
              className="text-base min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">Asset Type</Label>
            <Select
              value={form.asset_type || 'none'}
              onValueChange={value =>
                setForm(prev => ({ ...prev, asset_type: value }))
              }
            >
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select asset type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="it">IT Asset</SelectItem>
                <SelectItem value="admin">Admin Asset</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-medium">Manager Role</Label>
            <Select
              value={form.manager_role || 'none'}
              onValueChange={value => {
                setForm(prev => {
                  const next = { ...prev, manager_role: value };
                  if (value === 'itManager') next.asset_type = 'it';
                  else if (value === 'adminManager') next.asset_type = 'admin';
                  return next;
                });
              }}
            >
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select manager role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="itManager">IT Asset Manager</SelectItem>
                <SelectItem value="adminManager">
                  Admin Asset Manager
                </SelectItem>
                <SelectItem value="overallManager">
                  Overall Asset Manager
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2 border-t border-gray-100">
            <Label className="text-base font-semibold">
              Manage module access
            </Label>
            <p className="text-sm text-muted-foreground">
              Same permission matrix as Users → Permissions. Applied as default
              when users assign this role and run &quot;apply role
              permissions&quot;, together with approver options below.
            </p>
            <div className="-mx-2 max-h-[min(52vh,440px)] overflow-auto rounded-xl border border-gray-200 bg-gray-50/30 sm:mx-0">
              <ModulePermissionsMatrix
                value={modulePermissions}
                onChange={setModulePermissions}
                disabled={false}
                className="min-h-[200px]"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-gray-100">
            <Label className="text-base font-semibold">
              Custodian &amp; approver access
            </Label>
            <p className="text-sm text-muted-foreground">
              Same options as Users → Assign Role. Stored on the role record.
            </p>
            <div className="grid grid-cols-1 gap-4">
              <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-red-400 to-red-500" />
                <div className="pl-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-gray-500" />
                    <Label className="text-sm font-semibold text-gray-800">
                      Approver custodian
                    </Label>
                  </div>
                  <div className="space-y-3">
                    {(
                      [
                        {
                          key: 'hr',
                          label: 'HR asset accountability Receiver',
                          desc: 'HR accountability receiver of employees.',
                          checked: form.hr_accountability_receiver,
                          set: (v: boolean) =>
                            setForm(prev => ({
                              ...prev,
                              hr_accountability_receiver: v,
                            })),
                        },
                        {
                          key: 'm1',
                          label: 'Manager Approver 1',
                          desc: 'Approver of request — dept head or manager of the requestor.',
                          checked: form.manager_approver_1,
                          set: (v: boolean) =>
                            setForm(prev => ({
                              ...prev,
                              manager_approver_1: v,
                            })),
                        },
                        {
                          key: 'm2',
                          label: 'Manager Approver 2',
                          desc: 'Department head / manager of IT department / admin department for verifying all requests and transactions in the system.',
                          checked: form.manager_approver_2,
                          set: (v: boolean) =>
                            setForm(prev => ({
                              ...prev,
                              manager_approver_2: v,
                            })),
                        },
                        {
                          key: 'm3',
                          label: 'Sub Approver 1',
                          desc: 'Stand-in for Manager Approver 1. Approves the request when the dept head / manager of the requestor is absent. If the primary is also set, only one of them signs.',
                          checked: form.manager_approver_3,
                          set: (v: boolean) =>
                            setForm(prev => ({
                              ...prev,
                              manager_approver_3: v,
                            })),
                        },
                        {
                          key: 's2',
                          label: 'Sub Approver 2',
                          desc: 'Stand-in for Manager Approver 2. Verifies all requests and transactions in both IT and Admin departments when the dept head / manager is absent. If the primary is also set, only one of them signs.',
                          checked: form.sub_approver_2,
                          set: (v: boolean) =>
                            setForm(prev => ({
                              ...prev,
                              sub_approver_2: v,
                            })),
                        },
                        {
                          key: 'fa',
                          label: 'Finance Approver',
                          desc: 'For finance employee to edit asset finance and life cycle.',
                          checked: form.finance_approver,
                          set: (v: boolean) =>
                            setForm(prev => ({
                              ...prev,
                              finance_approver: v,
                            })),
                        },
                      ] satisfies ReadonlyArray<{
                        key: string;
                        label: string;
                        desc?: string;
                        checked: boolean;
                        set: (v: boolean) => void;
                      }>
                    ).map(({ key, label, desc, checked, set }) => (
                      <div
                        key={key}
                        className="rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5 transition-colors hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-sm font-medium text-gray-800">
                            {label}
                          </Label>
                          <Switch checked={checked} onCheckedChange={set} />
                        </div>
                        {desc ? (
                          <p className="mt-1 text-xs text-gray-500">{desc}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AppDialogBody>
        <AppDialogChromeFooter>
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
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges() || !form.name.trim()}
            className="rounded-xl px-6 shadow-md"
          >
            {saving ? 'Saving...' : editing ? 'Update Role' : 'Create Role'}
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}
