// Common types shared between frontend and backend

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface AssetSummary {
  assigned: number;
  available: number;
  inMaintenance: number;
  needsAttention: number;
  forDisposal: number;
  totalValue: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationError[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    summary?: AssetSummary;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BaseEntity {
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

// Common enums
export enum AssetStatus {
  Available = 'Available',
  Assigned = 'Assigned',
  InUse = 'In Use',
  ForInvestigation = 'For Investigation',
  ForDisposal = 'For Disposal',
  Borrowed = 'Borrowed',
  ServiceUnit = 'Service Unit',
  ForIsolation = 'For Isolation',
  Repairing = 'Repairing',
  UnderMaintenance = 'Under Maintenance',
  Retired = 'Retired',
  Disposed = 'Disposed',
  Lost = 'Lost',
}

export enum AssetCondition {
  Excellent = 'Excellent',
  Good = 'Good',
  Fair = 'Fair',
  Poor = 'Poor',
  Damaged = 'Damaged',
}

export enum MaintenanceSchedule {
  Monthly = 'Monthly',
  Quarterly = 'Quarterly',
  SemiAnnual = 'Semi-Annual',
  Annually = 'Annually',
  AsNeeded = 'As Needed',
  None = 'None',
}

export enum DepreciationMethod {
  StraightLine = 'straight-line',
  DecliningBalance = 'declining-balance',
  DoubleDeclining = 'double-declining',
  UnitsOfProduction = 'units-of-production',
}

export enum AssignmentStatus {
  Active = 'Active',
  Reserved = 'Reserved',
  Returned = 'Returned',
  Pending = 'Pending',
}

export enum AccountabilityFormStatus {
  Pending = 'Pending',
  Signed = 'Signed',
  Completed = 'Completed',
  Declined = 'Declined',
}

export enum AccountabilityFormApprovalStatus {
  PendingAdminCopySignature = 'pending_admin_copy_signature',
  PendingApproval = 'pending_approval',
  PendingIt = 'pending_it',
  PendingAdmin = 'pending_admin',
  PendingHr = 'pending_hr',
  Approved = 'approved',
}

export type ClearanceScopeUnified = 'Unified';

export enum IntangibleDeactivationStatus {
  Pending = 'Pending',
  PendingHrApproval = 'PendingHrApproval',
  Approved = 'Approved',
  Declined = 'Declined',
}

export enum UserRole {
  Admin = 'Admin',
  Manager = 'Manager',
  User = 'User',
  Viewer = 'Viewer',
}

export enum AssetType {
  IT = 'it',
  Admin = 'admin',
}

export enum ManagerRole {
  OverallManager = 'overallManager',
  DepartmentManager = 'departmentManager',
}

export interface UserPermissions {
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
}
