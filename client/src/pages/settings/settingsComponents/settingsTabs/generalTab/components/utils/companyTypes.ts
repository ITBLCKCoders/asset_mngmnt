export interface Company {
  id: string;
  name: string;
  email: string;
  code: string;
  prefix?: string;
  taxId?: string;
  phone?: string;
  website?: string;
  logo_url?: string | null;
  industry?: string;
  size?: string;
  unit_no?: string;
  building_street?: string;
  region_name?: string;
  province_name?: string;
  city_name?: string;
  barangay_name?: string;
  zipcode?: string;
  is_active?: boolean;
  is_main?: boolean;
}
