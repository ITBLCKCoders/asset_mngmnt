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
