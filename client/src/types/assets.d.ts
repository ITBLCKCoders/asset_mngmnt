export interface Company {
  id: string;
  name: string;
  email: string;
  code: string;
  prefix: string;
  tax_id?: string;
  phone?: string;
  website?: string;
  unit_no?: string;
  building_street?: string;
  barangay_name?: string;
  city_name?: string;
  province_name?: string;
  region_name?: string;
  zipcode?: string;
  full_address?: string;
  address?: string;
  logo_url?: string;
  industry?: string;
  size?: string;
  is_active?: boolean;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface LocationRoom {
  roomID: string;
  room_name: string;
}

export interface Location {
  locationID: string;
  name: string;
  floor_unit: string;
  building: string;
  room_areas: LocationRoom[];
  department_id?: string;
  department?: Department;
  company_id?: string;
  description?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface Department {
  departmentID: string;
  name: string;
  code: string;
  prefix?: string;
  company_id?: string;
  description?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface Position {
  positionID: string;
  name: string;
  description?: string;
  department_id: string;
  department_name?: string;
  department_code?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface Role {
  roleID: string;
  name: string;
  description?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string;
  deleted_by?: string;
  asset_type?: string | null;
  manager_role?: string | null;
  hr_accountability_receiver?: boolean;
  manager_approver_1?: boolean;
  manager_approver_2?: boolean;
  manager_approver_3?: boolean;
  finance_approver?: boolean;
  sub_approver_2?: boolean;
  sub_approver_1?: boolean;
}

export interface User {
  userID: string;
  email: string;
  first_name: string;
  last_name: string;
  username?: string;
  position?: string;
  employee_number?: string;
  role_id?: string;
  role?: Role;
  department_id?: string;
  department?: Department;
  company_id?: string;
  company?: Company;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  lockout_until?: string;
  failed_login_attempts?: number;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string;
  deleted_by?: string;
  /** Per-user approver flags (from user_custodian_settings) */
  hr_accountability_receiver?: boolean;
  manager_approver_1?: boolean;
  manager_approver_2?: boolean;
  manager_approver_3?: boolean;
  finance_approver?: boolean;
  sub_approver_2?: boolean;
  sub_approver_1?: boolean;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
