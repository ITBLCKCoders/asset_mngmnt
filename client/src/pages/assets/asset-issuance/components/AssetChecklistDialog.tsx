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
import { CheckCircle2, User, Package, MessageSquare, Laptop, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { filterNonComputerTypeAssets } from '@/utils/assetTypeDetection';
import type { AssetChecklistItemData, OffboardingChecklistItemData } from '../../../../../../shared/types/dtos/asset.dtos';

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

export type AssetChecklistSubmitPayload = {
  checklistData: AssetChecklistItemData | OffboardingChecklistItemData;
  typeOnboarding: boolean;
  typeOffboarding: boolean;
  receivedBy: string;
  remarks: string;
};

interface AssetChecklistDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssets: string[];
  assets: Asset[];
  computerAssets: Asset[];
  currentIndex: number;
  selectedUser: string;
  users: User[];
  departments: Department[];
  currentUserPosition?: string | null;
  onNext: (payload: AssetChecklistSubmitPayload) => Promise<void>;
  onFinalSubmit: (payload: AssetChecklistSubmitPayload) => Promise<void>;
  /** Clears in-progress checklist queue when user cancels without finishing */
  onCancel?: () => void;
  /** Checklist variant: 'onboarding' for asset assignment, 'offboarding' for asset return */
  checklistVariant?: 'onboarding' | 'offboarding';
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

const initialOffboardingChecklistData: OffboardingChecklistItemData = {
  deviceInventoryVerification: {
    verifyAssetTagSerial: null,
    inspectPhysicalCondition: null,
    checkAccessories: null,
    confirmDeviceFunctional: null,
  },
  dataAccountHandover: {
    verifyBackup: null,
    confirmSignOutM365: null,
    removePersonalAccounts: null,
    clearBrowserData: null,
    signOutThirdPartyApps: null,
  },
  securityAccessRevocation: {
    disableDeleteLocalAccount: null,
    revokeM365License: null,
    removeDeviceFromNetwork: null,
    rotateBitLockerKey: null,
    deactivateVpnCredentials: null,
    performFactoryReset: null,
    applyOsUpdates: null,
    verifyBiosSecureBoot: null,
    confirmBitLockerReEnabled: null,
    removeDeviceNaming: null,
    updateCmdbAssetTracker: null,
    recordReturnDateCondition: null,
    archiveBitLockerKey: null,
    updateNetworkFirewallRecords: null,
  },
};

export function AssetChecklistDialog({
  isOpen,
  onOpenChange,
  selectedAssets,
  assets,
  computerAssets,
  currentIndex,
  selectedUser,
  users,
  departments,
  currentUserPosition,
  onNext,
  onFinalSubmit,
  onCancel,
  checklistVariant = 'onboarding',
}: AssetChecklistDialogProps) {
  const [checklistData, setChecklistData] = useState<AssetChecklistItemData | OffboardingChecklistItemData>(
    checklistVariant === 'offboarding' ? initialOffboardingChecklistData : initialChecklistData
  );
  const [typeOnboarding, setTypeOnboarding] = useState(checklistVariant !== 'offboarding');
  const [typeOffboarding, setTypeOffboarding] = useState(checklistVariant === 'offboarding');
  const [receivedBy, setReceivedBy] = useState(currentUserPosition || '');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isOffboarding = checklistVariant === 'offboarding';

  const selectedUserObj = users.find(u => u.userID === selectedUser);
  const userDepartment = departments.find(d => d.departmentID === selectedUserObj?.department_id);

  const currentAsset = computerAssets[currentIndex];
  const isLastAsset = currentIndex >= computerAssets.length - 1;
  const totalAssets = computerAssets.length;

  // Reset meta when dialog first opens; carry over between steps
  useEffect(() => {
    if (isOpen && currentIndex === 0) {
      setChecklistData(isOffboarding ? initialOffboardingChecklistData : initialChecklistData);
      setTypeOnboarding(!isOffboarding);
      setTypeOffboarding(isOffboarding);
      setReceivedBy(currentUserPosition || '');
      setRemarks('');
    }
  }, [isOpen, currentUserPosition, currentIndex, isOffboarding]);

  // Reset checklist item answers when moving to the next asset
  useEffect(() => {
    if (isOpen && currentIndex > 0) {
      setChecklistData(isOffboarding ? initialOffboardingChecklistData : initialChecklistData);
    }
  }, [isOpen, currentIndex, isOffboarding]);

  type ChecklistSection = keyof AssetChecklistItemData | keyof OffboardingChecklistItemData;

  const onboardingSectionItems: Record<keyof AssetChecklistItemData, string[]> = {
    firmwareHardwareValidation: ['updateBios', 'setBiosPassword', 'enableSecureBoot', 'enableTpm'],
    osPreparationCleanup: ['removeBloatware', 'updateWindows', 'installDrivers'],
    endpointProtection: ['disableUsbStorage', 'enableBitLocker', 'installAntivirusEset', 'enableRealTimeProtection'],
    userAccessControl: ['createItAdminAndStandardUser', 'disableGuestAccounts'],
    applicationControl: ['installApprovedSoftwareOnly'],
    systemIdentityNaming: ['applyDeviceNamingStandard', 'recordSpecsSerialsMacUserBitlockerKeyWarranty'],
    microsoft365Setup: ['installM365', 'loginUser'],
    networkConfiguration: ['connectToNetwork', 'registerMacOnFirewall'],
    patchUpdateManagement: ['enableUpdates', 'applyUpdatePolicy'],
  };

  const offboardingSectionItems: Record<keyof OffboardingChecklistItemData, string[]> = {
    deviceInventoryVerification: ['verifyAssetTagSerial', 'inspectPhysicalCondition', 'checkAccessories', 'confirmDeviceFunctional'],
    dataAccountHandover: ['verifyBackup', 'confirmSignOutM365', 'removePersonalAccounts', 'clearBrowserData', 'signOutThirdPartyApps'],
    securityAccessRevocation: ['disableDeleteLocalAccount', 'revokeM365License', 'removeDeviceFromNetwork', 'rotateBitLockerKey', 'deactivateVpnCredentials', 'performFactoryReset', 'applyOsUpdates', 'verifyBiosSecureBoot', 'confirmBitLockerReEnabled', 'removeDeviceNaming', 'updateCmdbAssetTracker', 'recordReturnDateCondition', 'archiveBitLockerKey', 'updateNetworkFirewallRecords'],
  };

  const sectionItems = isOffboarding ? offboardingSectionItems : onboardingSectionItems;

  const updateChecklistItem = (
    section: any,
    item: string,
    value: 'yes' | 'no' | null
  ) => {
    setChecklistData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [item]: value === 'yes' ? true : value === 'no' ? false : null,
      },
    }));
  };

  const getChecklistValue = (
    section: any,
    item: string
  ): 'yes' | 'no' | null => {
    const value = (checklistData as any)[section]?.[item];
    if (value === true) return 'yes';
    if (value === false) return 'no';
    return null;
  };

  const setAllSection = (section: any, value: 'yes' | 'no') => {
    setChecklistData((prev: any) => {
      const newSection: Record<string, boolean | null> = {};
      (sectionItems as any)[section].forEach((item: string) => {
        newSection[item] = value === 'yes' ? true : false;
      });
      return { ...prev, [section]: newSection };
    });
  };

  const isAllChecked = () => {
    const allItems = Object.values(checklistData as any).flatMap((section: any) =>
      Object.values(section)
    );
    return allItems.every((item: any) => item === true || item === false);
  };

  const handleAction = async () => {
    if (!isAllChecked()) {
      toast.error('Please complete all checklist items before continuing');
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

    const payload: AssetChecklistSubmitPayload = {
      checklistData,
      typeOnboarding,
      typeOffboarding,
      receivedBy,
      remarks,
    };

    setSubmitting(true);
    try {
      if (isLastAsset) {
        await onFinalSubmit(payload);
      } else {
        await onNext(payload);
      }
    } catch (error) {
      console.error('Failed to save checklist step:', error);
      toast.error('Failed to save checklist');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAssetObjects = assets.filter(asset => selectedAssets.includes(asset.id));
  const nonComputerAssets = filterNonComputerTypeAssets(selectedAssetObjects);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <AppDialogFrame className="w-[min(96vw,800px)] max-h-[min(96dvh,900px)] min-h-0 sm:max-w-[800px] overflow-hidden !flex !flex-col !gap-0 !border-0 !p-0">
        <AppDialogGradientHeader
          title={
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-white" />
              {isOffboarding ? 'Asset Checklist - Return & Offboarding' : 'Asset Checklist'}
            </span>
          }
          description={
            isOffboarding
              ? totalAssets > 1
                ? `Complete the offboarding checklist for each computer asset (${currentIndex + 1} of ${totalAssets}).`
                : 'Complete the offboarding checklist for the returned computer asset.'
              : totalAssets > 1
                ? `Complete the checklist for each computer asset (${currentIndex + 1} of ${totalAssets}).`
                : 'Complete the asset checklist for computer-type assets before assignment.'
          }
        />

        <AppDialogBody
          key={currentAsset?.id ?? currentIndex}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto"
        >
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
                    if (checked && !isOffboarding) setTypeOffboarding(false);
                  }}
                />
                <Label htmlFor="type-onboarding" className="cursor-pointer">
                  {isOffboarding ? 'Return' : 'Onboarding'}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="type-offboarding"
                  checked={typeOffboarding}
                  onCheckedChange={checked => {
                    setTypeOffboarding(!!checked);
                    if (checked && !isOffboarding) setTypeOnboarding(false);
                  }}
                />
                <Label htmlFor="type-offboarding" className="cursor-pointer">
                  {isOffboarding ? 'Offboarding' : 'Offboarding'}
                </Label>
              </div>
            </div>
          </div>

          {/* Computer Assets Being Checklist */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Laptop className="h-5 w-5 text-blue-600" />
                Computer Assets Being Checklist
              </h4>
              {totalAssets > 1 && (
                <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
                  Asset {currentIndex + 1} of {totalAssets}
                </span>
              )}
            </div>
            {currentAsset ? (
              <div className="flex items-center gap-2 text-sm bg-white p-2 rounded border border-blue-200">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-800">{currentAsset.name}</span>
                <span className="text-gray-500 text-xs">
                  ({currentAsset.type || currentAsset.category || 'N/A'})
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No computer-type assets selected</p>
            )}
          </div>

          {/* Reviewed / Checked By */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-5 w-5 text-green-600" />
              Reviewed / Checked By
            </h4>
            <Input
              value={receivedBy}
              onChange={e => setReceivedBy(e.target.value)}
              placeholder="Enter position (e.g., IT Staff, IT Manager)"
              className="w-full"
            />
          </div>
          {/* Checklist Section */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              Checklist
            </h4>
            <ScrollArea className="h-[400px] pr-4" alwaysShowScrollbar>
              <div className="space-y-6">
                {isOffboarding ? (
                  <>
                    {/* Device Inventory & Verification */}
                    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          Device Inventory &amp; Verification
                        </h5>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAllSection('deviceInventoryVerification', 'yes')}>Yes All</Button>
                          <Button size="sm" variant="outline" onClick={() => setAllSection('deviceInventoryVerification', 'no')}>No All</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Verify asset tag / serial</div>
                        <div className="text-gray-600">Verify asset tag / serial number matches records</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="verify-asset-tag-yes" checked={getChecklistValue('deviceInventoryVerification', 'verifyAssetTagSerial') === 'yes'} onCheckedChange={checked => updateChecklistItem('deviceInventoryVerification', 'verifyAssetTagSerial', checked ? 'yes' : null)} />
                          <Label htmlFor="verify-asset-tag-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="verify-asset-tag-no" checked={getChecklistValue('deviceInventoryVerification', 'verifyAssetTagSerial') === 'no'} onCheckedChange={checked => updateChecklistItem('deviceInventoryVerification', 'verifyAssetTagSerial', checked ? 'no' : null)} />
                          <Label htmlFor="verify-asset-tag-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Inspect physical condition</div>
                        <div className="text-gray-600">Inspect physical condition (screen, keyboard, chassis, ports)</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="inspect-physical-yes" checked={getChecklistValue('deviceInventoryVerification', 'inspectPhysicalCondition') === 'yes'} onCheckedChange={checked => updateChecklistItem('deviceInventoryVerification', 'inspectPhysicalCondition', checked ? 'yes' : null)} />
                          <Label htmlFor="inspect-physical-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="inspect-physical-no" checked={getChecklistValue('deviceInventoryVerification', 'inspectPhysicalCondition') === 'no'} onCheckedChange={checked => updateChecklistItem('deviceInventoryVerification', 'inspectPhysicalCondition', checked ? 'no' : null)} />
                          <Label htmlFor="inspect-physical-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Check accessories</div>
                        <div className="text-gray-600">Check for accessories: charger, bag, mouse, others</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="check-accessories-yes" checked={getChecklistValue('deviceInventoryVerification', 'checkAccessories') === 'yes'} onCheckedChange={checked => updateChecklistItem('deviceInventoryVerification', 'checkAccessories', checked ? 'yes' : null)} />
                          <Label htmlFor="check-accessories-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="check-accessories-no" checked={getChecklistValue('deviceInventoryVerification', 'checkAccessories') === 'no'} onCheckedChange={checked => updateChecklistItem('deviceInventoryVerification', 'checkAccessories', checked ? 'no' : null)} />
                          <Label htmlFor="check-accessories-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Confirm device functional</div>
                        <div className="text-gray-600">Confirm device is powered on and functional</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="confirm-device-functional-yes" checked={getChecklistValue('deviceInventoryVerification', 'confirmDeviceFunctional') === 'yes'} onCheckedChange={checked => updateChecklistItem('deviceInventoryVerification', 'confirmDeviceFunctional', checked ? 'yes' : null)} />
                          <Label htmlFor="confirm-device-functional-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="confirm-device-functional-no" checked={getChecklistValue('deviceInventoryVerification', 'confirmDeviceFunctional') === 'no'} onCheckedChange={checked => updateChecklistItem('deviceInventoryVerification', 'confirmDeviceFunctional', checked ? 'no' : null)} />
                          <Label htmlFor="confirm-device-functional-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                      </div>
                    </div>

                    {/* Data & Account Handover */}
                    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Data &amp; Account Handover
                        </h5>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAllSection('dataAccountHandover', 'yes')}>Yes All</Button>
                          <Button size="sm" variant="outline" onClick={() => setAllSection('dataAccountHandover', 'no')}>No All</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Verify backup</div>
                        <div className="text-gray-600">Verify user has backed up personal/work files</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="verify-backup-yes" checked={getChecklistValue('dataAccountHandover', 'verifyBackup') === 'yes'} onCheckedChange={checked => updateChecklistItem('dataAccountHandover', 'verifyBackup', checked ? 'yes' : null)} />
                          <Label htmlFor="verify-backup-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="verify-backup-no" checked={getChecklistValue('dataAccountHandover', 'verifyBackup') === 'no'} onCheckedChange={checked => updateChecklistItem('dataAccountHandover', 'verifyBackup', checked ? 'no' : null)} />
                          <Label htmlFor="verify-backup-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Sign out from M365 / Outlook</div>
                        <div className="text-gray-600">Confirm sign-out from Microsoft 365 / Outlook</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="signout-m365-yes" checked={getChecklistValue('dataAccountHandover', 'confirmSignOutM365') === 'yes'} onCheckedChange={checked => updateChecklistItem('dataAccountHandover', 'confirmSignOutM365', checked ? 'yes' : null)} />
                          <Label htmlFor="signout-m365-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="signout-m365-no" checked={getChecklistValue('dataAccountHandover', 'confirmSignOutM365') === 'no'} onCheckedChange={checked => updateChecklistItem('dataAccountHandover', 'confirmSignOutM365', checked ? 'no' : null)} />
                          <Label htmlFor="signout-m365-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Remove personal accounts</div>
                        <div className="text-gray-600">Remove personal accounts (OneDrive, email, browser profiles)</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="remove-personal-accounts-yes" checked={getChecklistValue('dataAccountHandover', 'removePersonalAccounts') === 'yes'} onCheckedChange={checked => updateChecklistItem('dataAccountHandover', 'removePersonalAccounts', checked ? 'yes' : null)} />
                          <Label htmlFor="remove-personal-accounts-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="remove-personal-accounts-no" checked={getChecklistValue('dataAccountHandover', 'removePersonalAccounts') === 'no'} onCheckedChange={checked => updateChecklistItem('dataAccountHandover', 'removePersonalAccounts', checked ? 'no' : null)} />
                          <Label htmlFor="remove-personal-accounts-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Clear browser data</div>
                        <div className="text-gray-600">Clear browser saved passwords and history</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="clear-browser-data-yes" checked={getChecklistValue('dataAccountHandover', 'clearBrowserData') === 'yes'} onCheckedChange={checked => updateChecklistItem('dataAccountHandover', 'clearBrowserData', checked ? 'yes' : null)} />
                          <Label htmlFor="clear-browser-data-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="clear-browser-data-no" checked={getChecklistValue('dataAccountHandover', 'clearBrowserData') === 'no'} onCheckedChange={checked => updateChecklistItem('dataAccountHandover', 'clearBrowserData', checked ? 'no' : null)} />
                          <Label htmlFor="clear-browser-data-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Sign out third-party apps</div>
                        <div className="text-gray-600">Sign out from all third-party apps (Zoom, Teams, etc.)</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="signout-third-party-yes" checked={getChecklistValue('dataAccountHandover', 'signOutThirdPartyApps') === 'yes'} onCheckedChange={checked => updateChecklistItem('dataAccountHandover', 'signOutThirdPartyApps', checked ? 'yes' : null)} />
                          <Label htmlFor="signout-third-party-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="signout-third-party-no" checked={getChecklistValue('dataAccountHandover', 'signOutThirdPartyApps') === 'no'} onCheckedChange={checked => updateChecklistItem('dataAccountHandover', 'signOutThirdPartyApps', checked ? 'no' : null)} />
                          <Label htmlFor="signout-third-party-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                      </div>
                    </div>

                    {/* Security and Access Revocation */}
                    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          Security and Access Revocation
                        </h5>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAllSection('securityAccessRevocation', 'yes')}>Yes All</Button>
                          <Button size="sm" variant="outline" onClick={() => setAllSection('securityAccessRevocation', 'no')}>No All</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Disable/delete local account</div>
                        <div className="text-gray-600">Disable or delete user's local account</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="disable-local-account-yes" checked={getChecklistValue('securityAccessRevocation', 'disableDeleteLocalAccount') === 'yes'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'disableDeleteLocalAccount', checked ? 'yes' : null)} />
                          <Label htmlFor="disable-local-account-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="disable-local-account-no" checked={getChecklistValue('securityAccessRevocation', 'disableDeleteLocalAccount') === 'no'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'disableDeleteLocalAccount', checked ? 'no' : null)} />
                          <Label htmlFor="disable-local-account-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Revoke M365 license</div>
                        <div className="text-gray-600">Revoke M365 license / disable Azure AD account</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="revoke-m365-license-yes" checked={getChecklistValue('securityAccessRevocation', 'revokeM365License') === 'yes'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'revokeM365License', checked ? 'yes' : null)} />
                          <Label htmlFor="revoke-m365-license-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="revoke-m365-license-no" checked={getChecklistValue('securityAccessRevocation', 'revokeM365License') === 'no'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'revokeM365License', checked ? 'no' : null)} />
                          <Label htmlFor="revoke-m365-license-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Remove device from network</div>
                        <div className="text-gray-600">Remove device from company network / firewall MAC list</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="remove-device-network-yes" checked={getChecklistValue('securityAccessRevocation', 'removeDeviceFromNetwork') === 'yes'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'removeDeviceFromNetwork', checked ? 'yes' : null)} />
                          <Label htmlFor="remove-device-network-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="remove-device-network-no" checked={getChecklistValue('securityAccessRevocation', 'removeDeviceFromNetwork') === 'no'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'removeDeviceFromNetwork', checked ? 'no' : null)} />
                          <Label htmlFor="remove-device-network-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Rotate BitLocker Recovery Key</div>
                        <div className="text-gray-600">Rotate BitLocker Recovery Key after return</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="rotate-bitlocker-key-yes" checked={getChecklistValue('securityAccessRevocation', 'rotateBitLockerKey') === 'yes'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'rotateBitLockerKey', checked ? 'yes' : null)} />
                          <Label htmlFor="rotate-bitlocker-key-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="rotate-bitlocker-key-no" checked={getChecklistValue('securityAccessRevocation', 'rotateBitLockerKey') === 'no'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'rotateBitLockerKey', checked ? 'no' : null)} />
                          <Label htmlFor="rotate-bitlocker-key-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Deactivate VPN credentials</div>
                        <div className="text-gray-600">Confirm VPN credentials are deactivated</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="deactivate-vpn-yes" checked={getChecklistValue('securityAccessRevocation', 'deactivateVpnCredentials') === 'yes'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'deactivateVpnCredentials', checked ? 'yes' : null)} />
                          <Label htmlFor="deactivate-vpn-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="deactivate-vpn-no" checked={getChecklistValue('securityAccessRevocation', 'deactivateVpnCredentials') === 'no'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'deactivateVpnCredentials', checked ? 'no' : null)} />
                          <Label htmlFor="deactivate-vpn-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Perform factory reset</div>
                        <div className="text-gray-600">Perform Windows factory reset or re-image device</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="factory-reset-yes" checked={getChecklistValue('securityAccessRevocation', 'performFactoryReset') === 'yes'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'performFactoryReset', checked ? 'yes' : null)} />
                          <Label htmlFor="factory-reset-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="factory-reset-no" checked={getChecklistValue('securityAccessRevocation', 'performFactoryReset') === 'no'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'performFactoryReset', checked ? 'no' : null)} />
                          <Label htmlFor="factory-reset-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Apply OS updates</div>
                        <div className="text-gray-600">Re-apply OS updates after reset</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="apply-os-updates-yes" checked={getChecklistValue('securityAccessRevocation', 'applyOsUpdates') === 'yes'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'applyOsUpdates', checked ? 'yes' : null)} />
                          <Label htmlFor="apply-os-updates-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="apply-os-updates-no" checked={getChecklistValue('securityAccessRevocation', 'applyOsUpdates') === 'no'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'applyOsUpdates', checked ? 'no' : null)} />
                          <Label htmlFor="apply-os-updates-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Verify BIOS &amp; Secure Boot</div>
                        <div className="text-gray-600">Verify BIOS password and Secure Boot still enabled</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="verify-bios-secure-boot-yes" checked={getChecklistValue('securityAccessRevocation', 'verifyBiosSecureBoot') === 'yes'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'verifyBiosSecureBoot', checked ? 'yes' : null)} />
                          <Label htmlFor="verify-bios-secure-boot-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="verify-bios-secure-boot-no" checked={getChecklistValue('securityAccessRevocation', 'verifyBiosSecureBoot') === 'no'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'verifyBiosSecureBoot', checked ? 'no' : null)} />
                          <Label htmlFor="verify-bios-secure-boot-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Confirm BitLocker re-enabled</div>
                        <div className="text-gray-600">Confirm BitLocker re-enabled post-reset</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="confirm-bitlocker-reenabled-yes" checked={getChecklistValue('securityAccessRevocation', 'confirmBitLockerReEnabled') === 'yes'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'confirmBitLockerReEnabled', checked ? 'yes' : null)} />
                          <Label htmlFor="confirm-bitlocker-reenabled-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="confirm-bitlocker-reenabled-no" checked={getChecklistValue('securityAccessRevocation', 'confirmBitLockerReEnabled') === 'no'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'confirmBitLockerReEnabled', checked ? 'no' : null)} />
                          <Label htmlFor="confirm-bitlocker-reenabled-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Remove device naming</div>
                        <div className="text-gray-600">Remove device name from naming registry (CMTH-LPTP-xxxx)</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="remove-device-naming-yes" checked={getChecklistValue('securityAccessRevocation', 'removeDeviceNaming') === 'yes'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'removeDeviceNaming', checked ? 'yes' : null)} />
                          <Label htmlFor="remove-device-naming-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="remove-device-naming-no" checked={getChecklistValue('securityAccessRevocation', 'removeDeviceNaming') === 'no'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'removeDeviceNaming', checked ? 'no' : null)} />
                          <Label htmlFor="remove-device-naming-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Update CMDB / asset tracker</div>
                        <div className="text-gray-600">Update CMDB / asset tracker (mark as returned)</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="update-cmdb-yes" checked={getChecklistValue('securityAccessRevocation', 'updateCmdbAssetTracker') === 'yes'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'updateCmdbAssetTracker', checked ? 'yes' : null)} />
                          <Label htmlFor="update-cmdb-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="update-cmdb-no" checked={getChecklistValue('securityAccessRevocation', 'updateCmdbAssetTracker') === 'no'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'updateCmdbAssetTracker', checked ? 'no' : null)} />
                          <Label htmlFor="update-cmdb-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Record return date &amp; condition</div>
                        <div className="text-gray-600">Record return date, condition, and receiving IT staff</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="record-return-date-yes" checked={getChecklistValue('securityAccessRevocation', 'recordReturnDateCondition') === 'yes'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'recordReturnDateCondition', checked ? 'yes' : null)} />
                          <Label htmlFor="record-return-date-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="record-return-date-no" checked={getChecklistValue('securityAccessRevocation', 'recordReturnDateCondition') === 'no'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'recordReturnDateCondition', checked ? 'no' : null)} />
                          <Label htmlFor="record-return-date-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Archive BitLocker Recovery Key</div>
                        <div className="text-gray-600">Archive BitLocker Recovery Key or mark as reset</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="archive-bitlocker-key-yes" checked={getChecklistValue('securityAccessRevocation', 'archiveBitLockerKey') === 'yes'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'archiveBitLockerKey', checked ? 'yes' : null)} />
                          <Label htmlFor="archive-bitlocker-key-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="archive-bitlocker-key-no" checked={getChecklistValue('securityAccessRevocation', 'archiveBitLockerKey') === 'no'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'archiveBitLockerKey', checked ? 'no' : null)} />
                          <Label htmlFor="archive-bitlocker-key-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Update network/firewall records</div>
                        <div className="text-gray-600">Update network/firewall records to remove MAC address</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="update-network-records-yes" checked={getChecklistValue('securityAccessRevocation', 'updateNetworkFirewallRecords') === 'yes'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'updateNetworkFirewallRecords', checked ? 'yes' : null)} />
                          <Label htmlFor="update-network-records-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="update-network-records-no" checked={getChecklistValue('securityAccessRevocation', 'updateNetworkFirewallRecords') === 'no'} onCheckedChange={checked => updateChecklistItem('securityAccessRevocation', 'updateNetworkFirewallRecords', checked ? 'no' : null)} />
                          <Label htmlFor="update-network-records-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Firmware & Hardware Validation */}
                    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          Firmware &amp; Hardware Validation
                        </h5>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAllSection('firmwareHardwareValidation', 'yes')}>Yes All</Button>
                          <Button size="sm" variant="outline" onClick={() => setAllSection('firmwareHardwareValidation', 'no')}>No All</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Update BIOS</div>
                        <div className="text-gray-600">Update BIOS to latest version</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="update-bios-yes" checked={getChecklistValue('firmwareHardwareValidation', 'updateBios') === 'yes'} onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'updateBios', checked ? 'yes' : null)} />
                          <Label htmlFor="update-bios-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="update-bios-no" checked={getChecklistValue('firmwareHardwareValidation', 'updateBios') === 'no'} onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'updateBios', checked ? 'no' : null)} />
                          <Label htmlFor="update-bios-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Set BIOS password</div>
                        <div className="text-gray-600">Set BIOS password for security</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="set-bios-password-yes" checked={getChecklistValue('firmwareHardwareValidation', 'setBiosPassword') === 'yes'} onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'setBiosPassword', checked ? 'yes' : null)} />
                          <Label htmlFor="set-bios-password-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="set-bios-password-no" checked={getChecklistValue('firmwareHardwareValidation', 'setBiosPassword') === 'no'} onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'setBiosPassword', checked ? 'no' : null)} />
                          <Label htmlFor="set-bios-password-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Enable Secure Boot</div>
                        <div className="text-gray-600">Enable Secure Boot in BIOS</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="enable-secure-boot-yes" checked={getChecklistValue('firmwareHardwareValidation', 'enableSecureBoot') === 'yes'} onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'enableSecureBoot', checked ? 'yes' : null)} />
                          <Label htmlFor="enable-secure-boot-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="enable-secure-boot-no" checked={getChecklistValue('firmwareHardwareValidation', 'enableSecureBoot') === 'no'} onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'enableSecureBoot', checked ? 'no' : null)} />
                          <Label htmlFor="enable-secure-boot-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Enable TPM</div>
                        <div className="text-gray-600">Enable Trusted Platform Module</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="enable-tpm-yes" checked={getChecklistValue('firmwareHardwareValidation', 'enableTpm') === 'yes'} onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'enableTpm', checked ? 'yes' : null)} />
                          <Label htmlFor="enable-tpm-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="enable-tpm-no" checked={getChecklistValue('firmwareHardwareValidation', 'enableTpm') === 'no'} onCheckedChange={checked => updateChecklistItem('firmwareHardwareValidation', 'enableTpm', checked ? 'no' : null)} />
                          <Label htmlFor="enable-tpm-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                      </div>
                    </div>

                    {/* OS Preparation & Cleanup */}
                    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          OS Preparation &amp; Cleanup
                        </h5>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAllSection('osPreparationCleanup', 'yes')}>Yes All</Button>
                          <Button size="sm" variant="outline" onClick={() => setAllSection('osPreparationCleanup', 'no')}>No All</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Remove bloatware</div>
                        <div className="text-gray-600">Remove OEM Applications</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="remove-bloatware-yes" checked={getChecklistValue('osPreparationCleanup', 'removeBloatware') === 'yes'} onCheckedChange={checked => updateChecklistItem('osPreparationCleanup', 'removeBloatware', checked ? 'yes' : null)} />
                          <Label htmlFor="remove-bloatware-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="remove-bloatware-no" checked={getChecklistValue('osPreparationCleanup', 'removeBloatware') === 'no'} onCheckedChange={checked => updateChecklistItem('osPreparationCleanup', 'removeBloatware', checked ? 'no' : null)} />
                          <Label htmlFor="remove-bloatware-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Update Windows</div>
                        <div className="text-gray-600">Update Windows to latest version</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="update-windows-yes" checked={getChecklistValue('osPreparationCleanup', 'updateWindows') === 'yes'} onCheckedChange={checked => updateChecklistItem('osPreparationCleanup', 'updateWindows', checked ? 'yes' : null)} />
                          <Label htmlFor="update-windows-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="update-windows-no" checked={getChecklistValue('osPreparationCleanup', 'updateWindows') === 'no'} onCheckedChange={checked => updateChecklistItem('osPreparationCleanup', 'updateWindows', checked ? 'no' : null)} />
                          <Label htmlFor="update-windows-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Install drivers</div>
                        <div className="text-gray-600">Install required drivers</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="install-drivers-yes" checked={getChecklistValue('osPreparationCleanup', 'installDrivers') === 'yes'} onCheckedChange={checked => updateChecklistItem('osPreparationCleanup', 'installDrivers', checked ? 'yes' : null)} />
                          <Label htmlFor="install-drivers-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="install-drivers-no" checked={getChecklistValue('osPreparationCleanup', 'installDrivers') === 'no'} onCheckedChange={checked => updateChecklistItem('osPreparationCleanup', 'installDrivers', checked ? 'no' : null)} />
                          <Label htmlFor="install-drivers-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                      </div>
                    </div>

                    {/* Endpoint Protection */}
                    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          Endpoint Protection
                        </h5>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAllSection('endpointProtection', 'yes')}>Yes All</Button>
                          <Button size="sm" variant="outline" onClick={() => setAllSection('endpointProtection', 'no')}>No All</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Disable USB storage</div>
                        <div className="text-gray-600">Disable USB storage for security</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="disable-usb-storage-yes" checked={getChecklistValue('endpointProtection', 'disableUsbStorage') === 'yes'} onCheckedChange={checked => updateChecklistItem('endpointProtection', 'disableUsbStorage', checked ? 'yes' : null)} />
                          <Label htmlFor="disable-usb-storage-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="disable-usb-storage-no" checked={getChecklistValue('endpointProtection', 'disableUsbStorage') === 'no'} onCheckedChange={checked => updateChecklistItem('endpointProtection', 'disableUsbStorage', checked ? 'no' : null)} />
                          <Label htmlFor="disable-usb-storage-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Enable BitLocker</div>
                        <div className="text-gray-600">Enable BitLocker encryption</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="enable-bitlocker-yes" checked={getChecklistValue('endpointProtection', 'enableBitLocker') === 'yes'} onCheckedChange={checked => updateChecklistItem('endpointProtection', 'enableBitLocker', checked ? 'yes' : null)} />
                          <Label htmlFor="enable-bitlocker-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="enable-bitlocker-no" checked={getChecklistValue('endpointProtection', 'enableBitLocker') === 'no'} onCheckedChange={checked => updateChecklistItem('endpointProtection', 'enableBitLocker', checked ? 'no' : null)} />
                          <Label htmlFor="enable-bitlocker-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Install Antivirus</div>
                        <div className="text-gray-600">Install Antivirus (ESET)</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="install-antivirus-eset-yes" checked={getChecklistValue('endpointProtection', 'installAntivirusEset') === 'yes'} onCheckedChange={checked => updateChecklistItem('endpointProtection', 'installAntivirusEset', checked ? 'yes' : null)} />
                          <Label htmlFor="install-antivirus-eset-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="install-antivirus-eset-no" checked={getChecklistValue('endpointProtection', 'installAntivirusEset') === 'no'} onCheckedChange={checked => updateChecklistItem('endpointProtection', 'installAntivirusEset', checked ? 'no' : null)} />
                          <Label htmlFor="install-antivirus-eset-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Enable real-time protection</div>
                        <div className="text-gray-600">Enable real-time protection</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="enable-real-time-protection-yes" checked={getChecklistValue('endpointProtection', 'enableRealTimeProtection') === 'yes'} onCheckedChange={checked => updateChecklistItem('endpointProtection', 'enableRealTimeProtection', checked ? 'yes' : null)} />
                          <Label htmlFor="enable-real-time-protection-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="enable-real-time-protection-no" checked={getChecklistValue('endpointProtection', 'enableRealTimeProtection') === 'no'} onCheckedChange={checked => updateChecklistItem('endpointProtection', 'enableRealTimeProtection', checked ? 'no' : null)} />
                          <Label htmlFor="enable-real-time-protection-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                      </div>
                    </div>

                    {/* User & Access Control */}
                    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                          User &amp; Access Control
                        </h5>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAllSection('userAccessControl', 'yes')}>Yes All</Button>
                          <Button size="sm" variant="outline" onClick={() => setAllSection('userAccessControl', 'no')}>No All</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Create IT admin &amp; standard user</div>
                        <div className="text-gray-600">Create 1 IT admin &amp; standard user</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="create-it-admin-standard-user-yes" checked={getChecklistValue('userAccessControl', 'createItAdminAndStandardUser') === 'yes'} onCheckedChange={checked => updateChecklistItem('userAccessControl', 'createItAdminAndStandardUser', checked ? 'yes' : null)} />
                          <Label htmlFor="create-it-admin-standard-user-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="create-it-admin-standard-user-no" checked={getChecklistValue('userAccessControl', 'createItAdminAndStandardUser') === 'no'} onCheckedChange={checked => updateChecklistItem('userAccessControl', 'createItAdminAndStandardUser', checked ? 'no' : null)} />
                          <Label htmlFor="create-it-admin-standard-user-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Disable guest accounts</div>
                        <div className="text-gray-600">Disable guest accounts</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="disable-guest-accounts-yes" checked={getChecklistValue('userAccessControl', 'disableGuestAccounts') === 'yes'} onCheckedChange={checked => updateChecklistItem('userAccessControl', 'disableGuestAccounts', checked ? 'yes' : null)} />
                          <Label htmlFor="disable-guest-accounts-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="disable-guest-accounts-no" checked={getChecklistValue('userAccessControl', 'disableGuestAccounts') === 'no'} onCheckedChange={checked => updateChecklistItem('userAccessControl', 'disableGuestAccounts', checked ? 'no' : null)} />
                          <Label htmlFor="disable-guest-accounts-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                      </div>
                    </div>

                    {/* Application Control */}
                    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                          Application Control
                        </h5>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAllSection('applicationControl', 'yes')}>Yes All</Button>
                          <Button size="sm" variant="outline" onClick={() => setAllSection('applicationControl', 'no')}>No All</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Install approved software only</div>
                        <div className="text-gray-600">Install approved software only</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="install-approved-software-only-yes" checked={getChecklistValue('applicationControl', 'installApprovedSoftwareOnly') === 'yes'} onCheckedChange={checked => updateChecklistItem('applicationControl', 'installApprovedSoftwareOnly', checked ? 'yes' : null)} />
                          <Label htmlFor="install-approved-software-only-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="install-approved-software-only-no" checked={getChecklistValue('applicationControl', 'installApprovedSoftwareOnly') === 'no'} onCheckedChange={checked => updateChecklistItem('applicationControl', 'installApprovedSoftwareOnly', checked ? 'no' : null)} />
                          <Label htmlFor="install-approved-software-only-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                      </div>
                    </div>

                    {/* System Identity & Naming */}
                    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                          System Identity &amp; Naming
                        </h5>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAllSection('systemIdentityNaming', 'yes')}>Yes All</Button>
                          <Button size="sm" variant="outline" onClick={() => setAllSection('systemIdentityNaming', 'no')}>No All</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Apply device naming standard</div>
                        <div className="text-gray-600">Apply device naming standard</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="apply-device-naming-standard-yes" checked={getChecklistValue('systemIdentityNaming', 'applyDeviceNamingStandard') === 'yes'} onCheckedChange={checked => updateChecklistItem('systemIdentityNaming', 'applyDeviceNamingStandard', checked ? 'yes' : null)} />
                          <Label htmlFor="apply-device-naming-standard-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="apply-device-naming-standard-no" checked={getChecklistValue('systemIdentityNaming', 'applyDeviceNamingStandard') === 'no'} onCheckedChange={checked => updateChecklistItem('systemIdentityNaming', 'applyDeviceNamingStandard', checked ? 'no' : null)} />
                          <Label htmlFor="apply-device-naming-standard-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Record specs, serials, MAC</div>
                        <div className="text-gray-600">Record specs, serials, MAC, user, BitLocker key, warranty</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="record-specs-serials-mac-yes" checked={getChecklistValue('systemIdentityNaming', 'recordSpecsSerialsMacUserBitlockerKeyWarranty') === 'yes'} onCheckedChange={checked => updateChecklistItem('systemIdentityNaming', 'recordSpecsSerialsMacUserBitlockerKeyWarranty', checked ? 'yes' : null)} />
                          <Label htmlFor="record-specs-serials-mac-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="record-specs-serials-mac-no" checked={getChecklistValue('systemIdentityNaming', 'recordSpecsSerialsMacUserBitlockerKeyWarranty') === 'no'} onCheckedChange={checked => updateChecklistItem('systemIdentityNaming', 'recordSpecsSerialsMacUserBitlockerKeyWarranty', checked ? 'no' : null)} />
                          <Label htmlFor="record-specs-serials-mac-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                      </div>
                    </div>

                    {/* Microsoft 365 Setup */}
                    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                          Microsoft 365 Setup
                        </h5>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAllSection('microsoft365Setup', 'yes')}>Yes All</Button>
                          <Button size="sm" variant="outline" onClick={() => setAllSection('microsoft365Setup', 'no')}>No All</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Install M365</div>
                        <div className="text-gray-600">Install Microsoft 365</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="install-m365-yes" checked={getChecklistValue('microsoft365Setup', 'installM365') === 'yes'} onCheckedChange={checked => updateChecklistItem('microsoft365Setup', 'installM365', checked ? 'yes' : null)} />
                          <Label htmlFor="install-m365-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="install-m365-no" checked={getChecklistValue('microsoft365Setup', 'installM365') === 'no'} onCheckedChange={checked => updateChecklistItem('microsoft365Setup', 'installM365', checked ? 'no' : null)} />
                          <Label htmlFor="install-m365-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Login user</div>
                        <div className="text-gray-600">Login user to M365</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="login-user-m365-yes" checked={getChecklistValue('microsoft365Setup', 'loginUser') === 'yes'} onCheckedChange={checked => updateChecklistItem('microsoft365Setup', 'loginUser', checked ? 'yes' : null)} />
                          <Label htmlFor="login-user-m365-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="login-user-m365-no" checked={getChecklistValue('microsoft365Setup', 'loginUser') === 'no'} onCheckedChange={checked => updateChecklistItem('microsoft365Setup', 'loginUser', checked ? 'no' : null)} />
                          <Label htmlFor="login-user-m365-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                      </div>
                    </div>

                    {/* Network Configuration */}
                    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          Network Configuration
                        </h5>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAllSection('networkConfiguration', 'yes')}>Yes All</Button>
                          <Button size="sm" variant="outline" onClick={() => setAllSection('networkConfiguration', 'no')}>No All</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Connect to network</div>
                        <div className="text-gray-600">Connect to network</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="connect-to-network-yes" checked={getChecklistValue('networkConfiguration', 'connectToNetwork') === 'yes'} onCheckedChange={checked => updateChecklistItem('networkConfiguration', 'connectToNetwork', checked ? 'yes' : null)} />
                          <Label htmlFor="connect-to-network-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="connect-to-network-no" checked={getChecklistValue('networkConfiguration', 'connectToNetwork') === 'no'} onCheckedChange={checked => updateChecklistItem('networkConfiguration', 'connectToNetwork', checked ? 'no' : null)} />
                          <Label htmlFor="connect-to-network-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Register MAC on firewall</div>
                        <div className="text-gray-600">Register MAC on firewall</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="register-mac-firewall-yes" checked={getChecklistValue('networkConfiguration', 'registerMacOnFirewall') === 'yes'} onCheckedChange={checked => updateChecklistItem('networkConfiguration', 'registerMacOnFirewall', checked ? 'yes' : null)} />
                          <Label htmlFor="register-mac-firewall-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="register-mac-firewall-no" checked={getChecklistValue('networkConfiguration', 'registerMacOnFirewall') === 'no'} onCheckedChange={checked => updateChecklistItem('networkConfiguration', 'registerMacOnFirewall', checked ? 'no' : null)} />
                          <Label htmlFor="register-mac-firewall-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                      </div>
                    </div>

                    {/* Patch & Update Management */}
                    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                          Patch &amp; Update Management
                        </h5>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAllSection('patchUpdateManagement', 'yes')}>Yes All</Button>
                          <Button size="sm" variant="outline" onClick={() => setAllSection('patchUpdateManagement', 'no')}>No All</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[200px_1fr_auto_auto] gap-3 items-center text-sm">
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Enable updates</div>
                        <div className="text-gray-600">Enable automatic updates</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="enable-updates-yes" checked={getChecklistValue('patchUpdateManagement', 'enableUpdates') === 'yes'} onCheckedChange={checked => updateChecklistItem('patchUpdateManagement', 'enableUpdates', checked ? 'yes' : null)} />
                          <Label htmlFor="enable-updates-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="enable-updates-no" checked={getChecklistValue('patchUpdateManagement', 'enableUpdates') === 'no'} onCheckedChange={checked => updateChecklistItem('patchUpdateManagement', 'enableUpdates', checked ? 'no' : null)} />
                          <Label htmlFor="enable-updates-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                        <div className="font-medium text-gray-700 bg-slate-50 px-3 py-2 rounded">Apply update policy</div>
                        <div className="text-gray-600">Apply update policy</div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="apply-update-policy-yes" checked={getChecklistValue('patchUpdateManagement', 'applyUpdatePolicy') === 'yes'} onCheckedChange={checked => updateChecklistItem('patchUpdateManagement', 'applyUpdatePolicy', checked ? 'yes' : null)} />
                          <Label htmlFor="apply-update-policy-yes" className="cursor-pointer font-medium text-green-600">Yes</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="apply-update-policy-no" checked={getChecklistValue('patchUpdateManagement', 'applyUpdatePolicy') === 'no'} onCheckedChange={checked => updateChecklistItem('patchUpdateManagement', 'applyUpdatePolicy', checked ? 'no' : null)} />
                          <Label htmlFor="apply-update-policy-no" className="cursor-pointer font-medium text-red-600">No</Label>
                        </div>
                      </div>
                    </div>
                  </>
                )}
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
          {!isOffboarding && nonComputerAssets.length > 0 && (
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
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAction}
            disabled={!isAllChecked() || (!typeOnboarding && !typeOffboarding) || !receivedBy.trim() || submitting}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400"
          >
            {submitting ? (
              <div className="flex items-center gap-2 text-white">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {isLastAsset ? 'Submitting...' : 'Saving...'}
              </div>
            ) : isLastAsset ? (
              <div className="flex items-center gap-2 text-white">
                <CheckCircle2 className="h-4 w-4" />
                Submit Checklist
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white">
                Next
                <ChevronRight className="h-4 w-4" />
              </div>
            )}
          </Button>
        </AppDialogChromeFooter>
      </AppDialogFrame>
    </Dialog>
  );
}
