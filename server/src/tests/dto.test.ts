import { describe, it, expect } from '@jest/globals';
import {
  CreateAssetDtoSchema,
  UpdateAssetDtoSchema,
} from '../dtos/assets/CreateAssetDto.js';
import { DtoTransformers } from '../utils/dtoTransformers.js';

describe('DTO Validation', () => {
  describe('CreateAssetDtoSchema', () => {
    it('should validate required fields', () => {
      const validData = {
        name: 'Test Asset',
        categoryId: 'test-category-id',
      };

      expect(() => CreateAssetDtoSchema.parse(validData)).not.toThrow();
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        name: 'Test Asset',
        // missing categoryId
      };

      expect(() => CreateAssetDtoSchema.parse(invalidData)).toThrow();
    });

    it('should accept optional fields', () => {
      const validData = {
        name: 'Test Asset',
        categoryId: 'test-category-id',
        description: 'Test description',
        supplier: 'Test Supplier',
        brand: 'Test Brand',
        model: 'Test Model',
        serial: 'SN123456',
        assetValue: 1000,
        salvageValue: 100,
        depreciationMethod: 'straight-line',
        usefulLifeYears: 5,
        annualDepreciation: 180,
        depreciationStartDate: '2024-01-01',
        companyId: 'test-company-id',
        locationId: 'test-location-id',
        locationRoomId: 'test-room-id',
        departmentId: 'test-department-id',
        locationNotes: 'Test notes',
        warrantyMonths: 24,
        condition: 'Good',
        maintenanceSchedule: 'Annually',
        status: 'Available',
        isOldUnit: false,
        assignedUser: 'test-user-id',
      };

      expect(() => CreateAssetDtoSchema.parse(validData)).not.toThrow();
    });

    it('should validate enum values', () => {
      const invalidData = {
        name: 'Test Asset',
        categoryId: 'test-category-id',
        condition: 'Invalid Condition',
        maintenanceSchedule: 'Invalid Schedule',
        status: 'Invalid Status',
        depreciationMethod: 'invalid-method',
      };

      expect(() => CreateAssetDtoSchema.parse(invalidData)).toThrow();
    });
  });

  describe('UpdateAssetDtoSchema', () => {
    it('should require assetId', () => {
      const invalidData = {
        name: 'Updated Asset',
        // missing assetId
      };

      expect(() => UpdateAssetDtoSchema.parse(invalidData)).toThrow();
    });

    it('should allow partial updates', () => {
      const validData = {
        assetId: 'test-asset-id',
        name: 'Updated Asset Name',
      };

      expect(() => UpdateAssetDtoSchema.parse(validData)).not.toThrow();
    });
  });
});

describe('DTO Transformers', () => {
  describe('DtoTransformers.transformAsset', () => {
    it('should transform database asset to DTO', () => {
      const dbAsset = {
        assetID: 'test-asset-id',
        asset_code: 'AST-001',
        name: 'Test Asset',
        description: 'Test Description',
        category_id: 'test-category-id',
        category_name: 'Test Category',
        supplier: 'Test Supplier',
        type_id: 'test-type-id',
        type_name: 'Test Type',
        brand: 'Test Brand',
        model: 'Test Model',
        serial: 'SN123456',
        image_url: 'https://example.com/image.jpg',
        purchase_date: '2024-01-01',
        asset_value: 1000,
        salvage_value: 100,
        depreciation_method: 'straight-line',
        useful_life_years: 5,
        annual_depreciation: 180,
        depreciation_start_date: '2024-01-01',
        company_id: 'test-company-id',
        company_name: 'Test Company',
        location_id: 'test-location-id',
        location_name: 'Test Location',
        location_room_id: 'test-room-id',
        location_room_name: 'Test Room',
        department_id: 'test-department-id',
        department_name: 'Test Department',
        location_notes: 'Test Notes',
        warranty_months: 24,
        condition: 'Good',
        maintenance_schedule: 'Annual',
        status: 'Available',
        is_old_unit: 0,
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'test-user-id',
        updated_at: '2024-01-02T00:00:00Z',
        updated_by: 'test-user-id',
      };

      const dto = DtoTransformers.transformAsset(dbAsset);

      expect(dto).toEqual({
        assetID: 'test-asset-id',
        asset_code: 'AST-001',
        name: 'Test Asset',
        description: 'Test Description',
        category_id: 'test-category-id',
        category_name: 'Test Category',
        supplier: 'Test Supplier',
        type_id: 'test-type-id',
        type_name: 'Test Type',
        brand: 'Test Brand',
        model: 'Test Model',
        serial: 'SN123456',
        image_url: 'https://example.com/image.jpg',
        purchase_date: '2024-01-01',
        asset_value: 1000,
        salvage_value: 100,
        depreciation_method: 'straight-line',
        useful_life_years: 5,
        annual_depreciation: 180,
        depreciation_start_date: '2024-01-01',
        company_id: 'test-company-id',
        company_name: 'Test Company',
        location_id: 'test-location-id',
        location_name: 'Test Location',
        location_room_id: 'test-room-id',
        location_room_name: 'Test Room',
        department_id: 'test-department-id',
        department_name: 'Test Department',
        location_notes: 'Test Notes',
        warranty_months: 24,
        condition: 'Good',
        maintenance_schedule: 'Annual',
        status: 'Available',
        is_old_unit: 0,
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'test-user-id',
        updated_at: '2024-01-02T00:00:00Z',
        updated_by: 'test-user-id',
        documents: [],
        currentAssignment: null,
        assignmentHistory: [],
        accountabilityForms: [],
        isAssetBuilder: false,
        builderStatus: null,
        children: [],
      });
    });

    it('should handle null values', () => {
      const dbAsset = {
        assetID: 'test-asset-id',
        asset_code: 'AST-001',
        name: 'Test Asset',
        description: null,
        category_id: 'test-category-id',
        category_name: null,
        supplier: null,
        type_id: null,
        type_name: null,
        brand: null,
        model: null,
        serial: null,
        image_url: null,
        purchase_date: null,
        asset_value: null,
        salvage_value: 0,
        depreciation_method: null,
        useful_life_years: null,
        annual_depreciation: null,
        depreciation_start_date: null,
        company_id: null,
        company_name: null,
        location_id: null,
        location_name: null,
        location_room_id: null,
        location_room_name: null,
        department_id: null,
        department_name: null,
        location_notes: null,
        warranty_months: null,
        condition: 'Good',
        maintenance_schedule: 'Annual',
        status: 'Available',
        is_old_unit: 0,
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'test-user-id',
        updated_at: '2024-01-02T00:00:00Z',
        updated_by: 'test-user-id',
      };

      const dto = DtoTransformers.transformAsset(dbAsset);

      expect(dto.description).toBe(null);
      expect(dto.category_name).toBe(null);
      expect(dto.supplier).toBe(null);
      expect(dto.type_id).toBe(null);
      expect(dto.type_name).toBe(null);
      expect(dto.brand).toBe(null);
      expect(dto.model).toBe(null);
      expect(dto.serial).toBe(null);
      expect(dto.image_url).toBe(null);
      expect(dto.purchase_date).toBe(null);
      expect(dto.asset_value).toBe(null);
      expect(dto.depreciation_method).toBe(null);
      expect(dto.useful_life_years).toBe(null);
      expect(dto.annual_depreciation).toBe(null);
      expect(dto.depreciation_start_date).toBe(null);
      expect(dto.company_id).toBe(null);
      expect(dto.company_name).toBe(null);
      expect(dto.location_id).toBe(null);
      expect(dto.location_name).toBe(null);
      expect(dto.location_room_id).toBe(null);
      expect(dto.location_room_name).toBe(null);
      expect(dto.department_id).toBe(null);
      expect(dto.department_name).toBe(null);
      expect(dto.location_notes).toBe(null);
      expect(dto.warranty_months).toBe(null);
    });
  });
});
