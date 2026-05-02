export interface DepartmentResponseDto {
  departmentID: string;
  name: string;
  code: string;
  prefix: string | null;
  description: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface DepartmentListResponseDto {
  departments: DepartmentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
