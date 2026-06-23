import { describe, it, expect } from '@jest/globals';

const validationSchemas = require('../../utils/validationSchemas.js');

describe('validationSchemas', () => {
  it('should export validationSchemas map', () => {
    expect(validationSchemas.validationSchemas).toBeDefined();
    expect(typeof validationSchemas.validationSchemas).toBe('object');
  });

  it('should include common schemas', () => {
    expect(validationSchemas.UserDtoSchema).toBeDefined();
    expect(validationSchemas.UpdateUserDtoSchema).toBeDefined();
    expect(validationSchemas.SettingsDtoSchema).toBeDefined();
    expect(validationSchemas.PaginationParamsSchema).toBeDefined();
  });

  it('should have migrateValidationRules with validateSchema', () => {
    expect(validationSchemas.migrationValidationRules).toBeDefined();
    expect(typeof validationSchemas.migrationValidationRules.validateSchema).toBe('function');
  });
});
