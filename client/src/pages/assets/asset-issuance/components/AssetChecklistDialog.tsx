'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogFrame,
  AppDialogGradientHeader,
  AppDialogBody,
  AppDialogChromeFooter,
} from '@/components/common/appDialogChrome';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, User, Building, Package, MessageSquare, Laptop } from 'lucide-react';
import { toast } from 'sonner';
import { filterComputerTypeAssets, filterNonComputerTypeAssets } from '@/utils/assetTypeDetection';
import type { AssetChecklistItemData } from '../../../../../../shared/types/dtos/asset.dtos';

interface Asset {
  id: string;
  name: string;
  type?: string;
  category?: string;
}

interface User {
  userID: string;
  first_name: string;
  last_name: string;
  position?: string | null;
  department_id: string;
  company?: any;
}

interface Department {
  departmentID: string;
  name: string;
}

interface AssetChecklistDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssets: string[];
  assets: Asset[];
  selectedUser: string;
  users: User[];
  departments: Department[];
  currentUserPosition?: string | null;
  onSubmit: (checklistData: AssetChecklistItemData, typeOnboarding: boolean, typeOffboarding: boolean, receivedBy: string, remarks: string) => Promise<void>;
}

const initialChecklistData: AssetChecklistItemData = {
  firmwareHardwareValidation: {
    updateBios: null,
    setBiosPassword: null,
    enableSecureBoot: null,
    enableTpm: null,
  },
  osPreparationCleanup: {
    removeBloatware: null,
    updateWindows: null,
    installDrivers: null,
  },
  endpointProtection: {
    disableUsbStorage: null,
    enableBitLocker: null,
    installAntivirusEset: null,
    enableRealTimeProtection: null,
  },
  userAccessControl: {
    createItAdminAndStandardUser: null,
    disableGuestAccounts: null,
  },
  applicationControl: {
    installApprovedSoftwareOnly: null,
  },
  systemIdentityNaming: {
    applyDeviceNamingStandard: null,
    recordSpecsSerialsMacUserBitlockerKeyWarranty: null,
  },
  microsoft365Setup: {
    installM365: null,
    loginUser: null,
  },
  networkConfiguration: {
    connectToNetwork: null,
    registerMacOnFirewall: null,
  },
  patchUpdateManagement: {
    enableUpdates: null,
    applyUpdatePolicy: null,
  },
};

export function AssetChecklistDialog({
  isOpen,
  onOpenChange,
  selectedAssets,
  assets,
  selectedUser,
  users,
  departments,
  currentUserPosition,
  onSubmit,
}: AssetChecklistDialogProps) {
  const [checklistData, setChecklistData] = useState<AssetChecklistItemData>(initialChecklistData);
  const [typeOnboarding, setTypeOnboarding] = useState(false);
  const [typeOffboarding, setTypeOffboarding] = useState(false);
  const [receivedBy, setReceivedBy] = useState(currentUserPosition || '');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedUserObj = users.find(u => u.userID === selectedUser);
  const userDepartment = departments.find(d => d.departmentID === selectedUserObj?.department_id);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setChecklistData(initialChecklistData);
      setTypeOnboarding(false);
      setTypeOffboarding(false);
      setReceivedBy(currentUserPosition || '');
      setRemarks('');
    }
  }, [isOpen, currentUserPosition]);

  const updateChecklistItem = (
    section: keyof AssetChecklistItemData,
    item: string,
    value: 'yes' | 'no' | null
  ) => {
    setChecklistData((prev: AssetChecklistItemData) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [item]: value === 'yes' ? true : value === 'no' ? false : null,
      },
    }));
  };

  const getChecklistValue = (
    section: keyof AssetChecklistItemData,
    item: string
  ): 'yes' | 'no' | null => {
    const value = (checklistData[section] as any)[item];
    if (value === true) return 'yes';
    if (value === false) return 'no';
    return null;
  };

  const isAllChecked = () => {
    const allItems = Object.values(checklistData).flatMap(section =>
      Object.values(section as any)
    );
    return allItems.every(item => item === true || item === false);
  };

  const handleSubmit = async () => {
    if (!isAllChecked()) {
      toast.error('Please complete all checklist items before submitting');
      return;
    }

    if (!typeOnboarding && !typeOffboarding) {
      toast.error('Please select at least one type (Onboarding or Offboarding)');
      return;
    }

    if (!receivedBy.trim()) {
      toast.error('Please specify who received this checklist');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(checklistData, typeOnboarding, typeOffboarding, receivedBy, remarks);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit checklist:', error);
      toast.error('Failed to submit checklist');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAssetObjects = assets.filter(asset => selectedAssets.includes(asset.id));
  const computerAssets = filterComputerTypeAssets(selectedAssetObjects);
  const nonComputerAssets = filterNonComputerTypeAssets(selectedAssetObjects);

  const selectedAssetsList = selectedAssets.map(assetId => {
    const asset = assets.find(a => a.id === assetId);
    return asset ? { id: asset.id, name: asset.name } : null;
  }).filter(Boolean);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <AppDialogFrame className="w-[min(96vw,800px)] max-h-[min(96dvh,900px)] min-h-0 sm:max-w-[800px] overflow-hidden !flex !flex-col !gap-0 !border-0 !p-0">
        <AppDialogGradientHeader
          title={
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-white" />
              Asset Checklist
            </span>
          }
          description="Complete the asset checklist for computer-type assets before assignment."
        />

        <AppDialogBody className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {/* Employee Information */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              Employee Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {selectedUserObj ? `${selectedUserObj.first_name} ${selectedUserObj.last_name}` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Designation:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {selectedUserObj?.position || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Department:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {userDepartment?.name || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Company:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {selectedUserObj?.company?.name || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Type Selection */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">Type</h4>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="type-onboarding"
                  checked={typeOnboarding}
                  onCheckedChange={checked => {
                    setTypeOnboarding(!!checked);
                    if (checked) setTypeOffboarding(false);
                  }}
                />
                <Label htmlFor="type-onboarding" className="cursor-pointer">
                  Onboarding
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="type-offboarding"
                  checked={typeOffboarding}
                  onCheckedChange={checked => {
                    setTypeOffboarding(!!checked);
                    if (checked) setTypeOnboarding(false);
                  }}
                />
                <Label htmlFor="type-offboarding" className="cursor-pointer">
                  Offboarding
                </Label>
              </div>
            </div>
          </div>

          {/* Computer Assets Being Checklist */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Laptop className="h-5 w-5 text-blue-600" />
              Computer Assets Being Checklist
            </h4>
            {computerAssets.length > 0 ? (
              <div className="space-y-2">
                {computerAssets.map(asset => (
                  <div key={asset.id} className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-blue-200">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-800">{asset.name}</span>
                    <span className="text-gray-500 text-xs">({asset.type || asset.category || 'N/A'})</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No computer-type assets selected</p>
            )}
          </div>

          {/* Received By */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-5 w-5 text-green-600" />
              Received By
            </h4>
            <Input
              value={receivedBy}
              onChange={e => setReceivedBy(e.target.value)}
              placeholder="Enter designation of the person filling this dialog"
              className="w-full"
            />
          </div>
          {/* Checklist Section */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              Checklist
            </h4>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Firmware & Hardware Validation */}
                <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Firmware & Hardware Validation
                  </h5>
                  <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Update BIOS</div>
                    <div className="text-gray-600">Update BIOS to latest version</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="update-bios-yes"
                        checked={getChecklistValue('firmwareHardwareValidation', 'updateBios') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'updateBios', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="update-bios-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="update-bios-no"
                        checked={getChecklistValue('firmwareHardwareValidation', 'updateBios') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'updateBios', checked ? 'no' : null)}
                      />
                      <Label htmlFor="update-bios-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Set BIOS password</div>
                    <div className="text-gray-600">Set BIOS password for security</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="set-bios-password-yes"
                        checked={getChecklistValue('firmwareHardwareValidation', 'setBiosPassword') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'setBiosPassword', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="set-bios-password-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="set-bios-password-no"
                        checked={getChecklistValue('firmwareHardwareValidation', 'setBiosPassword') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'setBiosPassword', checked ? 'no' : null)}
                      />
                      <Label htmlFor="set-bios-password-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Enable Secure Boot</div>
                    <div className="text-gray-600">Enable Secure Boot in BIOS</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="enable-secure-boot-yes"
                        checked={getChecklistValue('firmwareHardwareValidation', 'enableSecureBoot') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'enableSecureBoot', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="enable-secure-boot-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="enable-secure-boot-no"
                        checked={getChecklistValue('firmwareHardwareValidation', 'enableSecureBoot') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'enableSecureBoot', checked ? 'no' : null)}
                      />
                      <Label htmlFor="enable-secure-boot-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Enable TPM</div>
                    <div className="text-gray-600">Enable Trusted Platform Module</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="enable-tpm-yes"
                        checked={getChecklistValue('firmwareHardwareValidation', 'enableTpm') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'enableTpm', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="enable-tpm-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="enable-tpm-no"
                        checked={getChecklistValue('firmwareHardwareValidation', 'enableTpm') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'enableTpm', checked ? 'no' : null)}
                      />
                      <Label htmlFor="enable-tpm-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                  </div>
                </div>

                {/* OS Preparation & Cleanup */}
                <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    OS Preparation & Cleanup
                  </h5>
                  <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Remove bloatware</div>
                    <div className="text-gray-600">Remove OEM Applications</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remove-bloatware-yes"
                        checked={getChecklistValue('osPreparationCleanup', 'removeBloatware') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('osPreparationCleanup', 'removeBloatware', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="remove-bloatware-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remove-bloatware-no"
                        checked={getChecklistValue('osPreparationCleanup', 'removeBloatware') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('osPreparationCleanup', 'removeBloatware', checked ? 'no' : null)}
                      />
                      <Label htmlFor="remove-bloatware-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Update Windows</div>
                    <div className="text-gray-600">Update Windows to latest version</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="update-windows-yes"
                        checked={getChecklistValue('osPreparationCleanup', 'updateWindows') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('osPreparationCleanup', 'updateWindows', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="update-windows-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="update-windows-no"
                        checked={getChecklistValue('osPreparationCleanup', 'updateWindows') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('osPreparationCleanup', 'updateWindows', checked ? 'no' : null)}
                      />
                      <Label htmlFor="update-windows-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Install drivers</div>
                    <div className="text-gray-600">Install required drivers</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="install-drivers-yes"
                        checked={getChecklistValue('osPreparationCleanup', 'installDrivers') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('osPreparationCleanup', 'installDrivers', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="install-drivers-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="install-drivers-no"
                        checked={getChecklistValue('osPreparationCleanup', 'installDrivers') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('osPreparationCleanup', 'installDrivers', checked ? 'no' : null)}
                      />
                      <Label htmlFor="install-drivers-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                  </div>
                </div>

                {/* Endpoint Protection */}
                <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    Endpoint Protection
                  </h5>
                  <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Disable USB storage</div>
                    <div className="text-gray-600">Disable USB storage for security</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="disable-usb-storage-yes"
                        checked={getChecklistValue('endpointProtection', 'disableUsbStorage') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('endpointProtection', 'disableUsbStorage', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="disable-usb-storage-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="disable-usb-storage-no"
                        checked={getChecklistValue('endpointProtection', 'disableUsbStorage') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('endpointProtection', 'disableUsbStorage', checked ? 'no' : null)}
                      />
                      <Label htmlFor="disable-usb-storage-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Enable BitLocker</div>
                    <div className="text-gray-600">Enable BitLocker encryption</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="enable-bitlocker-yes"
                        checked={getChecklistValue('endpointProtection', 'enableBitLocker') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('endpointProtection', 'enableBitLocker', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="enable-bitlocker-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="enable-bitlocker-no"
                        checked={getChecklistValue('endpointProtection', 'enableBitLocker') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('endpointProtection', 'enableBitLocker', checked ? 'no' : null)}
                      />
                      <Label htmlFor="enable-bitlocker-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Install Antivirus</div>
                    <div className="text-gray-600">Install Antivirus (ESET)</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="install-antivirus-eset-yes"
                        checked={getChecklistValue('endpointProtection', 'installAntivirusEset') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('endpointProtection', 'installAntivirusEset', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="install-antivirus-eset-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="install-antivirus-eset-no"
                        checked={getChecklistValue('endpointProtection', 'installAntivirusEset') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('endpointProtection', 'installAntivirusEset', checked ? 'no' : null)}
                      />
                      <Label htmlFor="install-antivirus-eset-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Enable real-time protection</div>
                    <div className="text-gray-600">Enable real-time protection</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="enable-real-time-protection-yes"
                        checked={getChecklistValue('endpointProtection', 'enableRealTimeProtection') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('endpointProtection', 'enableRealTimeProtection', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="enable-real-time-protection-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="enable-real-time-protection-no"
                        checked={getChecklistValue('endpointProtection', 'enableRealTimeProtection') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('endpointProtection', 'enableRealTimeProtection', checked ? 'no' : null)}
                      />
                      <Label htmlFor="enable-real-time-protection-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                  </div>
                </div>

                {/* User & Access Control */}
                <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    User & Access Control
                  </h5>
                  <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Create IT admin & standard user</div>
                    <div className="text-gray-600">Create 1 IT admin & standard user</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="create-it-admin-standard-user-yes"
                        checked={getChecklistValue('userAccessControl', 'createItAdminAndStandardUser') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('userAccessControl', 'createItAdminAndStandardUser', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="create-it-admin-standard-user-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="create-it-admin-standard-user-no"
                        checked={getChecklistValue('userAccessControl', 'createItAdminAndStandardUser') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('userAccessControl', 'createItAdminAndStandardUser', checked ? 'no' : null)}
                      />
                      <Label htmlFor="create-it-admin-standard-user-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Disable guest accounts</div>
                    <div className="text-gray-600">Disable guest accounts</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="disable-guest-accounts-yes"
                        checked={getChecklistValue('userAccessControl', 'disableGuestAccounts') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('userAccessControl', 'disableGuestAccounts', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="disable-guest-accounts-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="disable-guest-accounts-no"
                        checked={getChecklistValue('userAccessControl', 'disableGuestAccounts') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('userAccessControl', 'disableGuestAccounts', checked ? 'no' : null)}
                      />
                      <Label htmlFor="disable-guest-accounts-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                  </div>
                </div>

                {/* Application Control */}
                <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                    Application Control
                  </h5>
                  <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Install approved software only</div>
                    <div className="text-gray-600">Install approved software only</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="install-approved-software-only-yes"
                        checked={getChecklistValue('applicationControl', 'installApprovedSoftwareOnly') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('applicationControl', 'installApprovedSoftwareOnly', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="install-approved-software-only-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="install-approved-software-only-no"
                        checked={getChecklistValue('applicationControl', 'installApprovedSoftwareOnly') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('applicationControl', 'installApprovedSoftwareOnly', checked ? 'no' : null)}
                      />
                      <Label htmlFor="install-approved-software-only-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                  </div>
                </div>

                {/* System Identity & Naming */}
                <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    System Identity & Naming
                  </h5>
                  <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Apply device naming standard</div>
                    <div className="text-gray-600">Apply device naming standard</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="apply-device-naming-standard-yes"
                        checked={getChecklistValue('systemIdentityNaming', 'applyDeviceNamingStandard') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('systemIdentityNaming', 'applyDeviceNamingStandard', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="apply-device-naming-standard-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="apply-device-naming-standard-no"
                        checked={getChecklistValue('systemIdentityNaming', 'applyDeviceNamingStandard') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('systemIdentityNaming', 'applyDeviceNamingStandard', checked ? 'no' : null)}
                      />
                      <Label htmlFor="apply-device-naming-standard-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Record specs, serials, MAC</div>
                    <div className="text-gray-600">Record specs, serials, MAC, user, BitLocker key, warranty</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="record-specs-serials-mac-yes"
                        checked={getChecklistValue('systemIdentityNaming', 'recordSpecsSerialsMacUserBitlockerKeyWarranty') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('systemIdentityNaming', 'recordSpecsSerialsMacUserBitlockerKeyWarranty', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="record-specs-serials-mac-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="record-specs-serials-mac-no"
                        checked={getChecklistValue('systemIdentityNaming', 'recordSpecsSerialsMacUserBitlockerKeyWarranty') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('systemIdentityNaming', 'recordSpecsSerialsMacUserBitlockerKeyWarranty', checked ? 'no' : null)}
                      />
                      <Label htmlFor="record-specs-serials-mac-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                  </div>
                </div>

                {/* Microsoft 365 Setup */}
                <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    Microsoft 365 Setup
                  </h5>
                  <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Install M365</div>
                    <div className="text-gray-600">Install Microsoft 365</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="install-m365-yes"
                        checked={getChecklistValue('microsoft365Setup', 'installM365') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('microsoft365Setup', 'installM365', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="install-m365-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="install-m365-no"
                        checked={getChecklistValue('microsoft365Setup', 'installM365') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('microsoft365Setup', 'installM365', checked ? 'no' : null)}
                      />
                      <Label htmlFor="install-m365-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Login user</div>
                    <div className="text-gray-600">Login user to M365</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="login-user-m365-yes"
                        checked={getChecklistValue('microsoft365Setup', 'loginUser') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('microsoft365Setup', 'loginUser', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="login-user-m365-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="login-user-m365-no"
                        checked={getChecklistValue('microsoft365Setup', 'loginUser') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('microsoft365Setup', 'loginUser', checked ? 'no' : null)}
                      />
                      <Label htmlFor="login-user-m365-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                  </div>
                </div>

                {/* Network Configuration */}
                <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Network Configuration
                  </h5>
                  <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Connect to network</div>
                    <div className="text-gray-600">Connect to network</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="connect-to-network-yes"
                        checked={getChecklistValue('networkConfiguration', 'connectToNetwork') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('networkConfiguration', 'connectToNetwork', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="connect-to-network-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="connect-to-network-no"
                        checked={getChecklistValue('networkConfiguration', 'connectToNetwork') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('networkConfiguration', 'connectToNetwork', checked ? 'no' : null)}
                      />
                      <Label htmlFor="connect-to-network-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Register MAC on firewall</div>
                    <div className="text-gray-600">Register MAC on firewall</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="register-mac-firewall-yes"
                        checked={getChecklistValue('networkConfiguration', 'registerMacOnFirewall') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('networkConfiguration', 'registerMacOnFirewall', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="register-mac-firewall-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="register-mac-firewall-no"
                        checked={getChecklistValue('networkConfiguration', 'registerMacOnFirewall') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('networkConfiguration', 'registerMacOnFirewall', checked ? 'no' : null)}
                      />
                      <Label htmlFor="register-mac-firewall-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                  </div>
                </div>

                {/* Patch & Update Management */}
                <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <h5 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                    Patch & Update Management
                  </h5>
                  <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Enable updates</div>
                    <div className="text-gray-600">Enable automatic updates</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="enable-updates-yes"
                        checked={getChecklistValue('patchUpdateManagement', 'enableUpdates') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('patchUpdateManagement', 'enableUpdates', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="enable-updates-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="enable-updates-no"
                        checked={getChecklistValue('patchUpdateManagement', 'enableUpdates') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('patchUpdateManagement', 'enableUpdates', checked ? 'no' : null)}
                      />
                      <Label htmlFor="enable-updates-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                    <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Apply update policy</div>
                    <div className="text-gray-600">Apply update policy</div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="apply-update-policy-yes"
                        checked={getChecklistValue('patchUpdateManagement', 'applyUpdatePolicy') === 'yes'}
                        onCheckedChange={checked => updateChecklistItem('patchUpdateManagement', 'applyUpdatePolicy', checked ? 'yes' : null)}
                      />
                      <Label htmlFor="apply-update-policy-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="apply-update-policy-no"
                        checked={getChecklistValue('patchUpdateManagement', 'applyUpdatePolicy') === 'no'}
                        onCheckedChange={checked => updateChecklistItem('patchUpdateManagement', 'applyUpdatePolicy', checked ? 'no' : null)}
                      />
                      <Label htmlFor="apply-update-policy-no" className="cursor-pointer font-medium text-red-600">No</Label>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>  
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-yellow-600" />
              Remarks
            </h4>
            <Textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Enter any additional remarks or notes"
              className="w-full min-h-[80px]"
            />
          </div>

          {/* Other Assets Not Being Checklist */}
          {nonComputerAssets.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600" />
                Other Assets Not Being Checklist
              </h4>
              <div className="space-y-2">
                {nonComputerAssets.map(asset => (
                  <div key={asset.id} className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-gray-200">
                    <Package className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-gray-800">{asset.name}</span>
                    <span className="text-gray-500 text-xs">({asset.type || asset.category || 'N/A'})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
    </AppDialogBody>

    <AppDialogChromeFooter className="shrink-0 border-t bg-gray-50">
      <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isAllChecked() || (!typeOnboarding && !typeOffboarding) || !receivedBy.trim() || submitting}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400"
          >
            {submitting ? (
              <div className="flex items-center gap-2 text-white">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting...
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white">
                <CheckCircle2 className="h-4 w-4" />
                Submit Checklist
              </div>
            )}
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}
