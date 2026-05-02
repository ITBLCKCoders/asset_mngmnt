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
