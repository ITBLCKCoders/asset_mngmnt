import { describe, it, expect } from '@jest/globals';

const { DtoTransformers } = require('../../utils/dtoTransformers.js');

describe('DtoTransformers', () => {
  describe('transformAsset', () => {
    it('should map asset fields to DTO', () => {
      const asset = { assetID: 'a1', name: 'Laptop', asset_code: 'LAP-001', category_id: 'c1', category_name: 'Electronics' };
      const result = DtoTransformers.transformAsset(asset);
      expect(result.assetID).toBe('a1');
      expect(result.name).toBe('Laptop');
      expect(result.asset_code).toBe('LAP-001');
      expect(result.documents).toEqual([]);
      expect(result.currentAssignment).toBeNull();
    });
  });

  describe('transformAssetDocument', () => {
    it('should map document fields', () => {
      const doc = { documentID: 'd1', file_name: 'doc.pdf', file_url: '/uploads/doc.pdf', file_size: 1024, file_type: 'pdf', created_at: '2026-01-01' };
      const result = DtoTransformers.transformAssetDocument(doc);
      expect(result.documentID).toBe('d1');
      expect(result.fileName).toBe('doc.pdf');
    });
  });

  describe('transformAssetAssignment', () => {
    it('should map assignment fields with user details', () => {
      const assignment = {
        assignmentID: 'as1',
        user_id: 'u1',
        assigned_user_name: 'John Doe',
        assigned_user_email: 'john@test.com',
        employee_number: 'EMP001',
        position: 'Engineer',
        department_name: 'IT',
        location_name: 'Building A',
        room_name: 'Room 101',
        assigned_date: '2026-01-15',
        actual_return_date: null,
        status: 'Active',
        assigned_by_name: 'Admin',
        assignment_notes: null,
      };
      const result = DtoTransformers.transformAssetAssignment(assignment);
      expect(result.assignmentID).toBe('as1');
      expect(result.user.name).toBe('John Doe');
      expect(result.location).toContain('Building A');
      expect(result.department).toBe('IT');
    });

    it('should handle missing location', () => {
      const assignment = { assignmentID: 'as1', user_id: 'u1', assigned_user_name: 'John', assigned_user_email: 'j@t.com' };
      const result = DtoTransformers.transformAssetAssignment(assignment);
      expect(result.location).toBeNull();
    });
  });

  describe('transformAccountabilityForm', () => {
    it('should map form fields', () => {
      const form = { formID: 'f1', form_number: 'AF-001', status: 'Signed', created_at: '2026-01-01', signed_at: '2026-01-02' };
      const result = DtoTransformers.transformAccountabilityForm(form);
      expect(result.id).toBe('f1');
      expect(result.formNumber).toBe('AF-001');
      expect(result.status).toBe('Signed');
    });
  });

  describe('transformUser', () => {
    it('should map user fields', () => {
      const user = { userID: 'u1', email: 'test@test.com', first_name: 'John', last_name: 'Doe', username: 'johndoe', position: 'Engineer', employee_number: 'E001' };
      const result = DtoTransformers.transformUser(user);
      expect(result.userID).toBe('u1');
      expect(result.email).toBe('test@test.com');
      expect(result.first_name).toBe('John');
    });
  });

  describe('transformUserProfile', () => {
    it('should map user profile fields', () => {
      const user = { userID: 'u1', email: 'test@test.com', first_name: 'John', last_name: 'Doe', username: 'johndoe', role: { roleID: 'r1', name: 'Admin' }, department: { departmentID: 'd1', name: 'IT' }, company: { companyID: 'c1', name: 'Corp' } };
      const result = DtoTransformers.transformUserProfile(user);
      expect(result.userID).toBe('u1');
      expect(result.role?.name).toBe('Admin');
      expect(result.department?.name).toBe('IT');
      expect(result.company?.name).toBe('Corp');
    });
  });

  describe('transformRole', () => {
    it('should map role fields', () => {
      const role = { roleID: 'r1', name: 'Admin', description: 'Administrator' };
      const result = DtoTransformers.transformRole(role);
      expect(result.roleID).toBe('r1');
      expect(result.name).toBe('Admin');
    });
  });

  describe('transformDepartment', () => {
    it('should map department fields', () => {
      const dept = { departmentID: 'd1', name: 'IT', code: 'IT', prefix: 'IT' };
      const result = DtoTransformers.transformDepartment(dept);
      expect(result.departmentID).toBe('d1');
      expect(result.code).toBe('IT');
    });
  });

  describe('transformCompany', () => {
    it('should map company fields', () => {
      const company = { companyID: 'c1', name: 'Corp', email: 'corp@test.com', code: 'CORP' };
      const result = DtoTransformers.transformCompany(company);
      expect(result.companyID).toBe('c1');
      expect(result.name).toBe('Corp');
    });
  });

  describe('transformActiveCompany', () => {
    it('should map active company fields', () => {
      const company = { companyID: 'c1', name: 'Active Corp', email: 'active@test.com', code: 'ACT' };
      const result = DtoTransformers.transformActiveCompany(company);
      expect(result.id).toBe('c1');
      expect(result.name).toBe('Active Corp');
    });
  });
});
