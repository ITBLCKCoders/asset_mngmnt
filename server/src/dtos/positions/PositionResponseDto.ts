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
