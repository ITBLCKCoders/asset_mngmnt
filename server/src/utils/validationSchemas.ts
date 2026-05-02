import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Import and re-export from dtos (single source of truth)
import {
  CreateAssetDtoSchema,
  UpdateAssetDtoSchema,
} from '../dtos/assets/CreateAssetDto.js';
import {
  CreateLocationDtoSchema,
  UpdateLocationDtoSchema,
  CreateLocationRoomDtoSchema,
  UpdateLocationRoomDtoSchema,
} from '../dtos/locations/LocationDto.js';
import {
  CreateCategoryDtoSchema,
  UpdateCategoryDtoSchema,
} from '../dtos/categories/CategoryDto.js';
import {
  CreateTypeDtoSchema,
  UpdateTypeDtoSchema,
} from '../dtos/types/TypeDto.js';
import {
  CreateSupplierDtoSchema,
  UpdateSupplierDtoSchema,
} from '../dtos/suppliers/SupplierDto.js';
import {
  CreateBrandDtoSchema,
  UpdateBrandDtoSchema,
} from '../dtos/brands/BrandDto.js';
import {
  CreatePositionDtoSchema,
  UpdatePositionDtoSchema,
} from '../dtos/positions/PositionDto.js';
import {
  LoginDtoSchema,
  RegisterDtoSchema,
  VerifyOTPDtoSchema,
  ForgotPasswordDtoSchema,
  ResetPasswordDtoSchema,
  ChangePasswordDtoSchema,
  UpdateProfileDtoSchema,
} from '../dtos/auth/AuthDto.js';

export {
  CreateAssetDtoSchema,
  UpdateAssetDtoSchema,
} from '../dtos/assets/CreateAssetDto.js';
export {
  CreateLocationDtoSchema,
  UpdateLocationDtoSchema,
  CreateLocationRoomDtoSchema,
  UpdateLocationRoomDtoSchema,
} from '../dtos/locations/LocationDto.js';
export {
  CreateCategoryDtoSchema,
  UpdateCategoryDtoSchema,
} from '../dtos/categories/CategoryDto.js';
export {
  CreateTypeDtoSchema,
  UpdateTypeDtoSchema,
} from '../dtos/types/TypeDto.js';
export {
  CreateSupplierDtoSchema,
  UpdateSupplierDtoSchema,
} from '../dtos/suppliers/SupplierDto.js';
export {
  CreateBrandDtoSchema,
  UpdateBrandDtoSchema,
} from '../dtos/brands/BrandDto.js';
export {
  CreatePositionDtoSchema,
  UpdatePositionDtoSchema,
} from '../dtos/positions/PositionDto.js';
export {
  LoginDtoSchema,
  RegisterDtoSchema,
  VerifyOTPDtoSchema,
  ForgotPasswordDtoSchema,
  ResetPasswordDtoSchema,
  ChangePasswordDtoSchema,
  UpdateProfileDtoSchema,
} from '../dtos/auth/AuthDto.js';
export type {
  CreateAssetDto,
  UpdateAssetDto,
} from '../dtos/assets/CreateAssetDto.js';
export type {
  CreateLocationDto,
  UpdateLocationDto,
  CreateLocationRoomDto,
  UpdateLocationRoomDto,
} from '../dtos/locations/LocationDto.js';
export type {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../dtos/categories/CategoryDto.js';
export type { CreateTypeDto, UpdateTypeDto } from '../dtos/types/TypeDto.js';
export type {
  CreateSupplierDto,
  UpdateSupplierDto,
} from '../dtos/suppliers/SupplierDto.js';
export type {
  CreateBrandDto,
  UpdateBrandDto,
} from '../dtos/brands/BrandDto.js';
export type {
  CreatePositionDto,
  UpdatePositionDto,
} from '../dtos/positions/PositionDto.js';
export type {
  LoginDto,
  RegisterDto,
  VerifyOTPDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from '../dtos/auth/AuthDto.js';

// User validation schemas (used by users.routes, no dto equivalent for admin create flow)
export const UserDtoSchema = z.object({
  email: z.string().email('Invalid email format'),
  first_name: z.string().min(1, 'First name is required').max(255),
  last_name: z.string().min(1, 'Last name is required').max(255),
  username: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  employee_number: z.string().optional().nullable(),
  role_id: z.string().optional().nullable(),
  department_id: z.string().optional().nullable(),
  company_id: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const UpdateUserDtoSchema = UserDtoSchema.partial();

// Permission validation schemas
export const UserPermissionsDtoSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  permissions: z.object({
    canView: z.boolean(),
    canCreate: z.boolean(),
    canEdit: z.boolean(),
    canDelete: z.boolean(),
    canAssign: z.boolean(),
    canManageUsers: z.boolean(),
    canManageRoles: z.boolean(),
    canManageDepartments: z.boolean(),
    canManageLocations: z.boolean(),
    canManageCategories: z.boolean(),
    canManageTypes: z.boolean(),
    canManageSuppliers: z.boolean(),
    canManageBrands: z.boolean(),
    canManageCompanies: z.boolean(),
    canManageCustodians: z.boolean(),
    canViewReports: z.boolean(),
    canExportData: z.boolean(),
    canImportData: z.boolean(),
    canManageSettings: z.boolean(),
  }),
});

// Settings validation schemas
export const SettingsDtoSchema = z.object({
  key: z.string().min(1, 'Settings key is required'),
  value: z.any(),
  description: z.string().optional().nullable(),
  type: z.enum(['string', 'number', 'boolean', 'object']),
  isPublic: z.boolean().default(false),
});

// Migration validation schemas
export const CreateMigrationDtoSchema = z.object({
  name: z.string().min(1, 'Migration name is required').max(255),
  description: z.string().min(1, 'Description is required').max(1000),
  sqlContent: z.string().min(1, 'SQL content is required'),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Version must be in format x.x.x')
    .default('1.0.0'),
});

// Pagination validation schemas
export const PaginationParamsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional().nullable(),
  sortBy: z.string().optional().nullable(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// Export all schemas for easy import
export const validationSchemas = {
  CreateAssetDto: CreateAssetDtoSchema,
  UpdateAssetDto: UpdateAssetDtoSchema,
  UserDto: UserDtoSchema,
  UpdateUserDto: UpdateUserDtoSchema,
  CreateLocationDto: CreateLocationDtoSchema,
  UpdateLocationDto: UpdateLocationDtoSchema,
  CreateLocationRoomDto: CreateLocationRoomDtoSchema,
  UpdateLocationRoomDto: UpdateLocationRoomDtoSchema,
  CreateCategoryDto: CreateCategoryDtoSchema,
  UpdateCategoryDto: UpdateCategoryDtoSchema,
  CreateTypeDto: CreateTypeDtoSchema,
  UpdateTypeDto: UpdateTypeDtoSchema,
  CreateSupplierDto: CreateSupplierDtoSchema,
  UpdateSupplierDto: UpdateSupplierDtoSchema,
  CreateBrandDto: CreateBrandDtoSchema,
  UpdateBrandDto: UpdateBrandDtoSchema,
  CreatePositionDto: CreatePositionDtoSchema,
  UpdatePositionDto: UpdatePositionDtoSchema,
  LoginDto: LoginDtoSchema,
  RegisterDto: RegisterDtoSchema,
  VerifyOTPDto: VerifyOTPDtoSchema,
  ForgotPasswordDto: ForgotPasswordDtoSchema,
  ResetPasswordDto: ResetPasswordDtoSchema,
  ChangePasswordDto: ChangePasswordDtoSchema,
  UpdateProfileDto: UpdateProfileDtoSchema,
  UserPermissionsDto: UserPermissionsDtoSchema,
  SettingsDto: SettingsDtoSchema,
  PaginationParams: PaginationParamsSchema,
  CreateMigrationDto: CreateMigrationDtoSchema,
};

// Migration validation rules for route usage
export const migrationValidationRules = {
  validateSchema: (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = CreateMigrationDtoSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          errors: error.issues.map((err: z.ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
          message: 'Migration validation failed',
        });
      } else {
        next(error);
      }
    }
  },
};

// Type exports (for schemas defined in this file)
export type UserDto = z.infer<typeof UserDtoSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserDtoSchema>;
export type UserPermissionsDto = z.infer<typeof UserPermissionsDtoSchema>;
export type SettingsDto = z.infer<typeof SettingsDtoSchema>;
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
export type CreateMigrationDto = z.infer<typeof CreateMigrationDtoSchema>;
