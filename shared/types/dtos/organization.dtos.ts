// Shared organization DTOs (users, roles, departments, companies, positions,
// permissions). These cluster together because Users carry references to
// Role / Department / Company.

// User DTOs
export interface UserDto {
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  position?: string;
  employeeNumber?: string;
  roleId?: string;
  departmentId?: string;
  companyId?: string;
  avatarUrl?: string;
  isActive?: boolean;
}

export interface UpdateUserDto extends Partial<UserDto> {
  userId: string;
}

export interface UserResponseDto {
  userID: string;
  email: string;
  first_name: string;
  last_name: string;
  username?: string;
  position?: string;
  employee_number?: string;
  role_id?: string;
  role?: RoleResponseDto;
  department_id?: string;
  department?: DepartmentResponseDto;
  company_id?: string;
  company?: CompanyResponseDto;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface UserListResponseDto {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Role DTOs
export interface RoleResponseDto {
  roleID: string;
  name: string;
  description?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface RoleListResponseDto {
  roles: RoleResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Department DTOs
export interface DepartmentResponseDto {
  departmentID: string;
  name: string;
  code: string;
  prefix?: string;
  description?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface DepartmentListResponseDto {
  departments: DepartmentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Company DTOs
export interface CompanyResponseDto {
  id: string;
  name: string;
  email: string;
  code: string;
  prefix: string;
  tax_id?: string;
  phone?: string;
  website?: string;
  unit_no?: string;
  building_street?: string;
  barangay_name?: string;
  city_name?: string;
  province_name?: string;
  region_name?: string;
  zipcode?: string;
  full_address?: string;
  address?: string;
  logo_url?: string;
  industry?: string;
  size?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CompanyListResponseDto {
  companies: CompanyResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Snapshot of the currently active company at request time. Identical shape
 * to CompanyResponseDto but documented separately because it represents
 * "the company in use right now" rather than a directory entry.
 */
export interface ActiveCompany {
  id: string;
  name: string;
  email: string;
  code: string;
  prefix: string;
  tax_id?: string;
  phone?: string;
  website?: string;
  unit_no?: string;
  building_street?: string;
  barangay_name?: string;
  city_name?: string;
  province_name?: string;
  region_name?: string;
  zipcode?: string;
  full_address?: string;
  address?: string;
  logo_url?: string;
  industry?: string;
  size?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Position DTOs
export interface CreatePositionDto {
  name: string;
  description?: string | null;
  departmentId: string;
}

export interface UpdatePositionDto extends Partial<CreatePositionDto> {
  positionId: string;
}

export interface PositionResponseDto {
  positionID: string;
  name: string;
  description: string | null;
  department_id: string;
  department_name: string;
  department_code: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface PositionListResponseDto {
  positions: PositionResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Permission DTOs
export interface UserPermissionsDto {
  userId: string;
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canAssign: boolean;
    canManageUsers: boolean;
    canManageRoles: boolean;
    canManageDepartments: boolean;
    canManageLocations: boolean;
    canManageCategories: boolean;
    canManageTypes: boolean;
    canManageSuppliers: boolean;
    canManageBrands: boolean;
    canManageCompanies: boolean;
    canManageCustodians: boolean;
    canViewReports: boolean;
    canExportData: boolean;
    canImportData: boolean;
    canManageSettings: boolean;
  };
}
