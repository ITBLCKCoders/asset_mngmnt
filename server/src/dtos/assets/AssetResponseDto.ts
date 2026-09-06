// Import types directly since they're defined in this file
// These types are defined below in the same file

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
  book_value?: number | null;
  accumulated_depreciation?: number | null;
  monthly_depreciation?: number | null;
  past_book_value?: number | null;
  past_accumulated_depreciation?: number | null;
  past_monthly_depreciation?: number | null;
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
  status:
    | 'Pending'
    | 'Signed'
    | 'Completed'
    | 'Revoked'
    | 'Disabled'
    | 'Declined';
  declineReason?: string | null;
  created_at: string;
  signed_at: string | null;
}
