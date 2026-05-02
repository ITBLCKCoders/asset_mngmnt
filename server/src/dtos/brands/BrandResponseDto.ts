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
