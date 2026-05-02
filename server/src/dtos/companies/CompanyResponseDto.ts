export interface CompanyResponseDto {
  companyID: string;
  name: string;
  email: string;
  code: string;
  prefix: string;
  tax_id: string | null;
  phone: string | null;
  website: string | null;
  unit_no: string | null;
  building_street: string | null;
  barangay_name: string | null;
  city_name: string | null;
  province_name: string | null;
  region_name: string | null;
  zipcode: string | null;
  full_address: string | null;
  address: string | null;
  logo_url: string | null;
  industry: string | null;
  size: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface CompanyListResponseDto {
  companies: CompanyResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActiveCompanyResponseDto {
  id: string;
  name: string;
  email: string;
  code: string;
  prefix: string;
  tax_id: string | null;
  phone: string | null;
  website: string | null;
  unit_no: string | null;
  building_street: string | null;
  barangay_name: string | null;
  city_name: string | null;
  province_name: string | null;
  region_name: string | null;
  zipcode: string | null;
  full_address: string | null;
  address: string | null;
  logo_url: string | null;
  industry: string | null;
  size: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}
