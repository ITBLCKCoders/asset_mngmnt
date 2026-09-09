// Shared Asset-related DTOs (assets, locations, categories, types, suppliers,
// brands, audit-log filters, accountability-form summary).
import {
  AssetStatus,
  AssetCondition,
  MaintenanceSchedule,
  DepreciationMethod,
  AccountabilityFormStatus,
  AccountabilityFormApprovalStatus,
} from '../common';

// Asset DTOs
export interface CreateAssetDto {
  name: string;
  description?: string | null;
  categoryId: string;
  supplier?: string | null;
  typeId?: string | null;
  brand?: string | null;
  model?: string | null;
  serial?: string | null;
  purchaseDate?: string | null;
  assetValue?: number | null;
  salvageValue?: number;
  depreciationMethod?: DepreciationMethod | null;
  usefulLifeYears?: number | null;
  annualDepreciation?: number | null;
  bookValue?: number | null;
  accumulatedDepreciation?: number | null;
  monthlyDepreciation?: number | null;
  depreciationStartDate?: string | null;
  companyId?: string | null;
  locationId?: string | null;
  locationRoomId?: string | null;
  departmentId?: string | null;
  locationNotes?: string | null;
  warrantyMonths?: number | null;
  condition?: AssetCondition;
  maintenanceSchedule?: MaintenanceSchedule;
  status?: string;
  isOldUnit?: boolean;
  assignedUser?: string | null;
}

export interface UpdateAssetDto extends Partial<CreateAssetDto> {
  assetId: string;
}

export interface AssetResponseDto {
  assetID: string;
  asset_code: string;
  tag_code: string | null;
  name: string;
  description: string | null;
  category_id: string;
  category_name: string;
  supplier: string | null;
  type_id: string | null;
  type_name: string | null;
  brand: string | null;
  model: string | null;
  serial: string | null;
  image_url: string | null;
  purchase_date: string | null;
  asset_value: number | null;
  salvage_value: number;
  depreciation_method: string | null;
  useful_life_years: number | null;
  annual_depreciation: number | null;
  book_value?: number | null;
  accumulated_depreciation?: number | null;
  monthly_depreciation?: number | null;
  past_book_value?: number | null;
  past_accumulated_depreciation?: number | null;
  past_monthly_depreciation?: number | null;
  depreciation_start_date: string | null;
  company_id: string | null;
  company_name: string | null;
  company_logo_url: string | null;
  originating_company_id?: string | null;
  transferred_out?: boolean;
  transferred_to_company_name?: string | null;
  location_id: string | null;
  location_name: string | null;
  location_room_id: string | null;
  location_room_name: string | null;
  department_id: string | null;
  department_name: string | null;
  location_notes: string | null;
  warranty_months: number | null;
  condition: string;
  maintenance_schedule: string;
  next_maintenance_date: string | null;
  status: string;
  is_old_unit: number;
  building: string | null;
  room_name: string | null;
  last_maintenance_date: string | null;
  department: string | null;
  created_by_name: string | null;
  updated_by_name: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  specifications: Array<{
    assetId: string;
    assetName: string;
    specDescription: string;
  }> | null;
  builderHistory: Array<{
    itemID: string;
    builderName: string;
    builderID: string;
    addedDate: string;
    addedBy: string;
  }> | null;

  // Related data
  documents: AssetDocumentDto[];
  currentAssignment: AssetAssignmentDto | null;
  /** Display-only assignee held as `Inactive` while the IT/Admin copy is unsigned. */
  pendingAssignment?: AssetAssignmentDto | null;
  /** True when `Assigned To` comes from a pending (unsigned) assignment. */
  isPendingSignature?: boolean;
  assignmentHistory: AssetAssignmentDto[];
  accountabilityForms: AccountabilityFormDto[];
  isAssetBuilder: boolean;
  isBuilderChild?: boolean;
  builderStatus: string | null;
  children: AssetChildDto[];
}

export interface AssetChildDto {
  id: string;
  name: string;
}

export interface AssetBuilderItemDto {
  itemID: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  category_name: string;
  type_name: string;
  is_parent: boolean;
}

export interface AssetBuilderDto {
  builderID: string;
  name: string;
  description: string | null;
  status: string;
  company_id: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string | null;
  items: AssetBuilderItemDto[];
  assigned_to?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface AssetListResponseDto {
  assets: AssetResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogListFiltersDto {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  action?: string[];
  resourceType?: string[];
  userId?: string[];
  status?: 'success' | 'failure';
  severity?: 'info' | 'warning' | 'critical';
  dateFrom?: string;
  dateTo?: string;
  companyId?: string;
  excludeActions?: string[];
}

export interface AssetDocumentDto {
  documentID: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
}

export interface AssetAssignmentDto {
  assignmentID: string;
  user: {
    id: string;
    name: string;
    email: string;
    employeeNumber: string | null;
    position: string | null;
  };
  department: string | null;
  location: string | null;
  assignedDate: string;
  actualReturnDate: string | null;
  status: string;
  assignedBy: string | null;
  assignmentNotes: string | null;
}

export interface AccountabilityFormDto {
  id: string;
  formNumber: string;
  status: AccountabilityFormStatus;
  approvalStatus?: AccountabilityFormApprovalStatus | null;
  declineReason?: string | null;
  assets_data?: {
    assets?: Array<{
      id: string;
      code: string;
      name: string;
      category: string;
      categoryDepartment: string;
      type: string;
      serialNo: string;
      modelNo: string;
      brand: string;
    }>;
  } | null;
  created_at: string;
  signed_at: string | null;
  adminCopySignerId?: string | null;
  adminCopySignerName?: string | null;
  adminCopySignature?: string | null;
  adminCopyCopyType?: 'IT' | 'Admin' | null;
  adminCopySignedAt?: string | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  approvalNotes?: string | null;
}

export interface AssetFormsResponseDto {
  accountabilityForms: AccountabilityFormDetailDto[];
  returnForms: ReturnFormDto[];
  transferForms: TransferFormDto[];
  borrowForms: BorrowFormDto[];
}

export interface AccountabilityFormDetailDto {
  id: string;
  formNumber: string;
  status: AccountabilityFormStatus;
  approvalStatus?: AccountabilityFormApprovalStatus | null;
  created_at: string;
  signed_at: string | null;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  department?: {
    id: string;
    name: string;
  } | null;
  location?: {
    id: string;
    name: string;
  } | null;
  received_copy_wet_pdf_url?: string | null;
  adminCopySignerId?: string | null;
  adminCopySigner?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  adminCopySignerName?: string | null;
  adminCopySignature?: string | null;
  adminCopyCopyType?: 'IT' | 'Admin' | null;
  adminCopySignedAt?: string | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  approvalNotes?: string | null;
}

export interface ReturnFormDto {
  id: string;
  formNumber: string;
  status: string;
  created_at: string;
  signed_at: string | null;
  return_type: string;
  received_by: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  department_name?: string;
  location_name?: string;
}

export interface TransferFormDto {
  id: string;
  formNumber: string;
  status: string;
  created_at: string;
  signed_at: string | null;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  new_user?: {
    first_name: string;
    last_name: string;
  };
  department_name?: string;
  location_name?: string;
}

export interface BorrowFormDto {
  id: string;
  formNumber: string;
  status: string;
  created_at: string;
  approved_at?: string | null;
  returned_at?: string | null;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  department_name?: string;
  asset_code?: string;
  asset_name?: string;
}

// Location DTOs
export interface CreateLocationDto {
  name: string;
  floorUnit?: string | null;
  building?: string | null;
  description?: string | null;
  departmentId?: string | null;
}

export interface UpdateLocationDto extends Partial<CreateLocationDto> {
  locationId: string;
}

export interface CreateLocationRoomDto {
  roomName: string;
  locationId: string;
}

export interface UpdateLocationRoomDto extends Partial<CreateLocationRoomDto> {
  roomId: string;
}

export interface LocationResponseDto {
  locationID: string;
  name: string;
  floor_unit: string | null;
  building: string | null;
  description: string | null;
  department_id: string | null;
  department_name: string | null;
  room_areas: LocationRoomResponseDto[];
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface LocationRoomResponseDto {
  roomID: string;
  room_name: string;
  location_id: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface LocationListResponseDto {
  locations: LocationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Category DTOs
export interface CreateCategoryDto {
  name: string;
  description?: string | null;
  departmentId?: string | null;
  prefix?: string | null;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {
  categoryId: string;
}

export interface CategoryResponseDto {
  categoryID: string;
  name: string;
  description: string | null;
  department_id: string | null;
  department_name: string | null;
  prefix: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface CategoryListResponseDto {
  categories: CategoryResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Type DTOs
export interface CreateTypeDto {
  name: string;
  description?: string | null;
  categoryId: string;
}

export interface UpdateTypeDto extends Partial<CreateTypeDto> {
  typeId: string;
}

export interface TypeResponseDto {
  typeID: string;
  name: string;
  description: string | null;
  category_id: string;
  category_name: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface TypeListResponseDto {
  types: TypeResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Supplier DTOs
export interface CreateSupplierDto {
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  description?: string | null;
}

export interface UpdateSupplierDto extends Partial<CreateSupplierDto> {
  supplierId: string;
}

export interface SupplierResponseDto {
  supplierID: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface SupplierListResponseDto {
  suppliers: SupplierResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Brand DTOs
export interface CreateBrandDto {
  name: string;
  description?: string | null;
}

export interface UpdateBrandDto extends Partial<CreateBrandDto> {
  brandId: string;
}

export interface BrandResponseDto {
  brandID: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface BrandListResponseDto {
  brands: BrandResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Asset Checklist DTOs
export interface CreateAssetChecklistDto {
  assignmentId: string;
  employeeId: string;
  employeeName: string;
  employeeDesignation?: string | null;
  employeeDepartment?: string | null;
  employeeCompany?: string | null;
  typeOnboarding?: boolean;
  typeOffboarding?: boolean;
  receivedBy?: string | null;
  checklistData: AssetChecklistItemData;
  remarks?: string | null;
}

export interface AssetChecklistItemData {
  firmwareHardwareValidation: {
    updateBios: boolean | null;
    setBiosPassword: boolean | null;
    enableSecureBoot: boolean | null;
    enableTpm: boolean | null;
  };
  osPreparationCleanup: {
    removeBloatware: boolean | null;
    updateWindows: boolean | null;
    installDrivers: boolean | null;
  };
  endpointProtection: {
    disableUsbStorage: boolean | null;
    enableBitLocker: boolean | null;
    installAntivirusEset: boolean | null;
    enableRealTimeProtection: boolean | null;
  };
  userAccessControl: {
    createItAdminAndStandardUser: boolean | null;
    disableGuestAccounts: boolean | null;
  };
  applicationControl: {
    installApprovedSoftwareOnly: boolean | null;
  };
  systemIdentityNaming: {
    applyDeviceNamingStandard: boolean | null;
    recordSpecsSerialsMacUserBitlockerKeyWarranty: boolean | null;
  };
  microsoft365Setup: {
    installM365: boolean | null;
    loginUser: boolean | null;
  };
  networkConfiguration: {
    connectToNetwork: boolean | null;
    registerMacOnFirewall: boolean | null;
  };
  patchUpdateManagement: {
    enableUpdates: boolean | null;
    applyUpdatePolicy: boolean | null;
  };
}

export interface OffboardingChecklistItemData {
  deviceInventoryVerification: {
    verifyAssetTagSerial: boolean | null;
    inspectPhysicalCondition: boolean | null;
    checkAccessories: boolean | null;
    confirmDeviceFunctional: boolean | null;
  };
  dataAccountHandover: {
    verifyBackup: boolean | null;
    confirmSignOutM365: boolean | null;
    removePersonalAccounts: boolean | null;
    clearBrowserData: boolean | null;
    signOutThirdPartyApps: boolean | null;
  };
  securityAccessRevocation: {
    disableDeleteLocalAccount: boolean | null;
    revokeM365License: boolean | null;
    removeDeviceFromNetwork: boolean | null;
    rotateBitLockerKey: boolean | null;
    deactivateVpnCredentials: boolean | null;
    performFactoryReset: boolean | null;
    applyOsUpdates: boolean | null;
    verifyBiosSecureBoot: boolean | null;
    confirmBitLockerReEnabled: boolean | null;
    removeDeviceNaming: boolean | null;
    updateCmdbAssetTracker: boolean | null;
    recordReturnDateCondition: boolean | null;
    archiveBitLockerKey: boolean | null;
    updateNetworkFirewallRecords: boolean | null;
  };
}

export interface AssetChecklistResponseDto {
  id: string;
  assignmentId: string;
  employeeId: string;
  employeeName: string;
  employeeDesignation: string | null;
  employeeDepartment: string | null;
  employeeCompany: string | null;
  typeOnboarding: number;
  typeOffboarding: number;
  receivedBy: string | null;
  checklistData: AssetChecklistItemData | null;
  remarks: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface IntangibleAssetAssigneeDto {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  assignedDate?: string;
}

export interface IntangibleAssetListItemDto {
  id: string;
  name: string;
  description: string | null;
  remarks: string | null;
  type: string;
  status: string;
  risk_level?: {
    id: string;
    name: string;
    color?: string;
  } | null;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
  updated_at: string;
  updated_by: string | null;
  updated_by_name: string | null;
  assignees: IntangibleAssetAssigneeDto[];
  /** Display-only assignees held as `Inactive` while the IT/Admin copy is unsigned. */
  pendingAssignees?: IntangibleAssetAssigneeDto[];
  /** True when the assignment is still awaiting IT/Admin copy signature. */
  isPendingSignature?: boolean;
}

export interface IntangibleDeactivationFormDto {
  id: string;
  formNumber: string;
  status: string;
  declineReason?: string | null;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    company?: { id: string; name: string } | null;
    department?: { id: string; name: string } | null;
  };
  department?: { id: string; name: string } | null;
  assets: Array<{
    id: string;
    name: string;
    type: string;
    description?: string | null;
  }>;
  assetsData?: unknown;
  requesterSignature?: string | null;
  requestedAt: string;
  deptHeadApproverId?: string | null;
  deptHeadApproverName?: string | null;
  deptHeadSignedAt?: string | null;
  deptHeadSignature?: string | null;
  hrApproverId?: string | null;
  hrApproverName?: string | null;
  hrSignedAt?: string | null;
  hrSignature?: string | null;
  declineReasonFull?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateIntangibleDeactivationDto {
  intangibleAssetIds: string[];
  digitalSignature: string;
  remarks?: string;
}
