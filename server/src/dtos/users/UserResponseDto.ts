import { RoleResponseDto } from '../roles/RoleResponseDto';
import { DepartmentResponseDto } from '../departments/DepartmentResponseDto';
import { CompanyResponseDto } from '../companies/CompanyResponseDto';

export interface UserResponseDto {
  userID: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string | null;
  position: string | null;
  employee_number: string | null;
  role_id: string;
  role: RoleResponseDto | null;
  department_id: string | null;
  department: DepartmentResponseDto | null;
  company_id: string | null;
  company: CompanyResponseDto | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface UserListResponseDto {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserProfileDto {
  userID: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string | null;
  position: string | null;
  employee_number: string | null;
  avatar_url: string | null;
  role: {
    id: string;
    name: string;
  } | null;
  department: {
    id: string;
    name: string;
  } | null;
  company: {
    id: string;
    name: string;
  } | null;
  last_login: string | null;
  created_at: string;
}

export interface UserPermissionsDto {
  permissions: Record<string, Record<string, boolean>>;
}
