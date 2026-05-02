// User type definitions for the asset management system

export interface User {
  id: string;
  name: string;
  firstName: string | null;
  middleName?: string | null;
  lastName: string | null;
  email: string;
  username: string | null;
  contactNumber: string | null;
  position: string | null;
  department: string | null;
  department_id: string | null;
  company: string | null;
  employeeId: string | null;
  role_id: string | null;
  role?: Role;
  avatarUrl?: string;
  verified: boolean;
  createdAt: string;

  address: {
    unitNo: string;
    buildingNo: string;
    street: string;
    subdivision: string;
    barangay: string;
    city: string;
    province: string;
    region: string;
  };
}

export interface Role {
  roleID: string;
  name: string;
  description?: string;
  permissions?: string[];
}

export interface Department {
  departmentID: string;
  name: string;
  description?: string;
  headOfDepartment?: string;
}

// API Response types
export interface UserProfileUpdateRequest {
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  username?: string;
  contactNumber?: string | null;
  position?: string | null;
  digitalSignature?: string | null;
  avatarUrl?: string;

  address?: {
    unitNo?: string;
    buildingNo?: string;
    street?: string;
    subdivision?: string;
    barangay?: string;
    city?: string;
    province?: string;
    region?: string;
  };
}

export interface UserProfileUpdateResponse {
  message: string;
  user: User;
}

export interface UploadAvatarResponse {
  url: string;
  filename: string;
}
