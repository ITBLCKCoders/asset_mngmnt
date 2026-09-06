import {
  AssetResponseDto,
  AssetDocumentDto,
  AssetAssignmentDto,
  AccountabilityFormDto,
  AssetChildDto,
} from '../dtos/assets/AssetResponseDto.js';
import { UserResponseDto, UserProfileDto } from '../dtos/users/UserResponseDto.js';
import { RoleResponseDto } from '../dtos/roles/RoleResponseDto.js';
import { DepartmentResponseDto } from '../dtos/departments/DepartmentResponseDto.js';
import {
  CompanyResponseDto,
  ActiveCompanyResponseDto,
} from '../dtos/companies/CompanyResponseDto.js';

export class DtoTransformers {
  static transformAsset(asset: any): AssetResponseDto {
    return {
      assetID: asset.assetID,
      asset_code: asset.asset_code,
      name: asset.name,
      description: asset.description,
      category_id: asset.category_id,
      category_name: asset.category_name || asset.category_name,
      supplier: asset.supplier,
      type_id: asset.type_id,
      type_name: asset.type_name || asset.type_name,
      brand: asset.brand,
      model: asset.model,
      serial: asset.serial,
      image_url: asset.image_url,
      purchase_date: asset.purchase_date,
      asset_value: asset.asset_value,
      salvage_value: asset.salvage_value,
      depreciation_method: asset.depreciation_method,
      useful_life_years: asset.useful_life_years,
      annual_depreciation: asset.annual_depreciation,
      book_value: asset.book_value,
      accumulated_depreciation: asset.accumulated_depreciation,
      monthly_depreciation: asset.monthly_depreciation,
      past_book_value: asset.past_book_value ?? null,
      past_accumulated_depreciation: asset.past_accumulated_depreciation ?? null,
      past_monthly_depreciation: asset.past_monthly_depreciation ?? null,
      depreciation_start_date: asset.depreciation_start_date,
      company_id: asset.company_id,
      company_name: asset.company_name || asset.company_name,
      location_id: asset.location_id,
      location_name: asset.location_name || asset.location_name,
      location_room_id: asset.location_room_id,
      location_room_name: asset.location_room_name || asset.location_room_name,
      department_id: asset.department_id,
      department_name: asset.department_name || asset.department_name,
      location_notes: asset.location_notes,
      warranty_months: asset.warranty_months,
      condition: asset.condition,
      maintenance_schedule: asset.maintenance_schedule,
      status: asset.status,
      is_old_unit: asset.is_old_unit,
      created_at: asset.created_at,
      created_by: asset.created_by,
      updated_at: asset.updated_at,
      updated_by: asset.updated_by,
      documents: [],
      currentAssignment: null,
      assignmentHistory: [],
      accountabilityForms: [],
      isAssetBuilder: false,
      builderStatus: null,
      children: [],
    };
  }

  static transformAssetDocument(doc: any): AssetDocumentDto {
    return {
      documentID: doc.documentID,
      fileName: doc.file_name,
      fileUrl: doc.file_url,
      fileSize: doc.file_size,
      fileType: doc.file_type,
      createdAt: doc.created_at,
    };
  }

  static transformAssetAssignment(assignment: any): AssetAssignmentDto {
    return {
      assignmentID: assignment.assignmentID,
      user: {
        id: assignment.user_id,
        name: assignment.assigned_user_name,
        email: assignment.assigned_user_email,
        employeeNumber: assignment.employee_number,
        position: assignment.position,
      },
      department: assignment.department_name,
      location: assignment.location_name
        ? `${assignment.location_name}${assignment.room_name ? ` - ${assignment.room_name}` : ''}`
        : null,
      assignedDate: assignment.assigned_date,
      actualReturnDate: assignment.actual_return_date,
      status: assignment.status,
      assignedBy: assignment.assigned_by_name,
      assignmentNotes: assignment.assignment_notes,
    };
  }

  static transformAccountabilityForm(form: any): AccountabilityFormDto {
    return {
      id: form.formID,
      formNumber: form.form_number,
      status: form.status as 'Pending' | 'Signed' | 'Completed',
      created_at: form.created_at,
      signed_at: form.signed_at,
    };
  }

  static transformAssetChild(child: any): AssetChildDto {
    return {
      id: child.asset_code,
      name: child.name,
    };
  }

  static transformUser(user: any): UserResponseDto {
    return {
      userID: user.userID,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      position: user.position,
      employee_number: user.employee_number,
      role_id: user.role_id,
      role: user.role ? this.transformRole(user.role) : null,
      department_id: user.department_id,
      department: user.department
        ? this.transformDepartment(user.department)
        : null,
      company_id: user.company_id,
      company: user.company ? this.transformCompany(user.company) : null,
      avatar_url: user.avatar_url,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at,
      created_by: user.created_by,
      updated_at: user.updated_at,
      updated_by: user.updated_by,
      deleted_at: user.deleted_at,
      deleted_by: user.deleted_by,
    };
  }

  static transformUserProfile(user: any): UserProfileDto {
    return {
      userID: user.userID,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      position: user.position,
      employee_number: user.employee_number,
      avatar_url: user.avatar_url,
      role: user.role
        ? {
            id: user.role.roleID,
            name: user.role.name,
          }
        : null,
      department: user.department
        ? {
            id: user.department.departmentID,
            name: user.department.name,
          }
        : null,
      company: user.company
        ? {
            id: user.company.companyID,
            name: user.company.name,
          }
        : null,
      last_login: user.last_login,
      created_at: user.created_at,
    };
  }

  static transformRole(role: any): RoleResponseDto {
    return {
      roleID: role.roleID,
      name: role.name,
      description: role.description,
      created_at: role.created_at,
      created_by: role.created_by,
      updated_at: role.updated_at,
      updated_by: role.updated_by,
      deleted_at: role.deleted_at,
      deleted_by: role.deleted_by,
    };
  }

  static transformDepartment(department: any): DepartmentResponseDto {
    return {
      departmentID: department.departmentID,
      name: department.name,
      code: department.code,
      prefix: department.prefix,
      description: department.description,
      created_at: department.created_at,
      created_by: department.created_by,
      updated_at: department.updated_at,
      updated_by: department.updated_by,
      deleted_at: department.deleted_at,
      deleted_by: department.deleted_by,
    };
  }

  static transformCompany(company: any): CompanyResponseDto {
    return {
      companyID: company.companyID,
      name: company.name,
      email: company.email,
      code: company.code,
      prefix: company.prefix,
      tax_id: company.tax_id,
      phone: company.phone,
      website: company.website,
      unit_no: company.unit_no,
      building_street: company.building_street,
      barangay_name: company.barangay_name,
      city_name: company.city_name,
      province_name: company.province_name,
      region_name: company.region_name,
      zipcode: company.zipcode,
      full_address: company.full_address,
      address: company.address,
      logo_url: company.logo_url,
      industry: company.industry,
      size: company.size,
      is_active: company.is_active,
      created_at: company.created_at,
      created_by: company.created_by,
      updated_at: company.updated_at,
      updated_by: company.updated_by,
      deleted_at: company.deleted_at,
      deleted_by: company.deleted_by,
    };
  }

  static transformActiveCompany(company: any): ActiveCompanyResponseDto {
    return {
      id: company.companyID,
      name: company.name,
      email: company.email,
      code: company.code,
      prefix: company.prefix,
      tax_id: company.tax_id,
      phone: company.phone,
      website: company.website,
      unit_no: company.unit_no,
      building_street: company.building_street,
      barangay_name: company.barangay_name,
      city_name: company.city_name,
      province_name: company.province_name,
      region_name: company.region_name,
      zipcode: company.zipcode,
      full_address: company.full_address,
      address: company.address,
      logo_url: company.logo_url,
      industry: company.industry,
      size: company.size,
      is_active: company.is_active,
      created_at: company.created_at,
      created_by: company.created_by,
      updated_at: company.updated_at,
      updated_by: company.updated_by,
      deleted_at: company.deleted_at,
      deleted_by: company.deleted_by,
    };
  }
}
