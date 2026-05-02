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
