// Shared Asset-related DTOs (assets, locations, categories, types, suppliers,
// brands, audit-log filters, accountability-form summary).
import {
  AssetStatus,
  AssetCondition,
  MaintenanceSchedule,
  DepreciationMethod,
  AccountabilityFormStatus,
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
  depreciationStartDate?: string | null;
  companyId?: string | null;
  locationId?: string | null;
  locationRoomId?: string | null;
  departmentId?: string | null;
  locationNotes?: string | null;
  warrantyMonths?: number | null;
  condition?: AssetCondition;
  maintenanceSchedule?: MaintenanceSchedule;
  status?: AssetStatus;
  isOldUnit?: boolean;
  assignedUser?: string | null;
}

export interface UpdateAssetDto extends Partial<CreateAssetDto> {
  assetId: string;
}

export interface AssetResponseDto {
  assetID: string;
  asset_code: string;
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
  depreciation_start_date: string | null;
  company_id: string | null;
  company_name: string | null;
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
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;

  // Related data
  documents: AssetDocumentDto[];
  currentAssignment: AssetAssignmentDto | null;
  assignmentHistory: AssetAssignmentDto[];
  accountabilityForms: AccountabilityFormDto[];
  isAssetBuilder: boolean;
  builderStatus: string | null;
  children: AssetChildDto[];
}

export interface AssetChildDto {
  id: string;
  name: string;
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
  declineReason?: string | null;
  created_at: string;
  signed_at: string | null;
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
