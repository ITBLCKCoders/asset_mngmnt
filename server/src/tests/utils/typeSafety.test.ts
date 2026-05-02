import { describe, it, expect } from '@jest/globals';
import {
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  validateWithSchema,
  safeParseWithSchema,
  assertString,
  assertNumber,
  getNestedProperty,
  setNestedProperty,
  isValidEnumValue,
  uniqueBy,
  groupBy,
  validators,
  createFeatureFlags,
} from '../../utils/typeSafety.js';
import { z } from 'zod';

describe('typeSafety', () => {
  describe('type guards', () => {
    it('isString returns true for strings', () => {
      expect(isString('a')).toBe(true);
      expect(isString('')).toBe(true);
      expect(isString(1)).toBe(false);
      expect(isString(null)).toBe(false);
    });
    it('isNumber returns true for finite numbers', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(1.5)).toBe(true);
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber('1')).toBe(false);
    });
    it('isBoolean returns true only for booleans', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean(0)).toBe(false);
    });
    it('isArray returns true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2])).toBe(true);
      expect(isArray({ length: 0 })).toBe(false);
    });
    it('isObject returns true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
      expect(isObject(null)).toBe(false);
      expect(isObject([])).toBe(false);
    });
  });

  describe('validateWithSchema', () => {
    it('returns parsed data when valid', () => {
      const schema = z.object({ name: z.string() });
      expect(validateWithSchema(schema, { name: 'x' })).toEqual({ name: 'x' });
    });
    it('throws when invalid', () => {
      const schema = z.object({ name: z.string() });
      expect(() => validateWithSchema(schema, {})).toThrow(/Validation failed/);
    });
  });

  describe('safeParseWithSchema', () => {
    it('returns success and data when valid', () => {
      const schema = z.object({ id: z.number() });
      const result = safeParseWithSchema(schema, { id: 1 });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toEqual({ id: 1 });
    });
    it('returns success false and error when invalid', () => {
      const schema = z.object({ id: z.number() });
      const result = safeParseWithSchema(schema, { id: 'x' });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBeDefined();
    });
  });

  describe('assertString', () => {
    it('does not throw for string', () => {
      expect(() => assertString('ok', 'field')).not.toThrow();
    });
    it('throws for non-string', () => {
      expect(() => assertString(1, 'field')).toThrow(/must be a string/);
    });
  });

  describe('assertNumber', () => {
    it('does not throw for number', () => {
      expect(() => assertNumber(1, 'field')).not.toThrow();
    });
    it('throws for NaN', () => {
      expect(() => assertNumber(NaN, 'field')).toThrow(/must be a number/);
    });
  });

  describe('getNestedProperty', () => {
    it('returns nested value', () => {
      const obj = { a: { b: { c: 42 } } };
      expect(getNestedProperty(obj, 'a', 'b', 'c')).toBe(42);
      expect(getNestedProperty(obj, 'a')).toEqual({ b: { c: 42 } });
    });
    it('returns undefined for missing path', () => {
      expect(getNestedProperty({ a: {} }, 'a', 'b')).toBeUndefined();
    });
  });

  describe('setNestedProperty', () => {
    it('sets nested value', () => {
      const obj: any = { a: {} };
      setNestedProperty(obj, 'a', 'b', 10);
      expect(obj.a.b).toBe(10);
    });
  });

  describe('isValidEnumValue', () => {
    it('returns true when value is in enum', () => {
      const e = { A: 'a', B: 'b' };
      expect(isValidEnumValue(e, 'a')).toBe(true);
      expect(isValidEnumValue(e, 'x')).toBe(false);
    });
  });

  describe('uniqueBy', () => {
    it('deduplicates by key', () => {
      const arr = [
        { id: 1, n: 'a' },
        { id: 2, n: 'b' },
        { id: 1, n: 'c' },
      ];
      expect(uniqueBy(arr, 'id')).toHaveLength(2);
      expect(uniqueBy(arr, 'id').map(x => x.id)).toEqual([1, 2]);
    });
  });

  describe('groupBy', () => {
    it('groups by key', () => {
      const arr = [{ type: 'a' }, { type: 'b' }, { type: 'a' }];
      const g = groupBy(arr, 'type');
      expect(g.a).toHaveLength(2);
      expect(g.b).toHaveLength(1);
    });
  });

  describe('validators', () => {
    it('email validates', () => {
      expect(validators.email('a@b.co')).toBe(true);
      expect(validators.email('invalid')).toBe(false);
    });
    it('url validates', () => {
      expect(validators.url('https://example.com')).toBe(true);
      expect(validators.url('not-a-url')).toBe(false);
    });
  });

  describe('createFeatureFlags', () => {
    it('isEnabled returns flag value', () => {
      const flags = createFeatureFlags({ foo: true, bar: false });
      expect(flags.isEnabled('foo')).toBe(true);
      expect(flags.isEnabled('bar')).toBe(false);
      expect(flags.isEnabled('missing')).toBe(false);
    });
    it('enable/disable mutate flags', () => {
      const flags = createFeatureFlags({ a: false });
      flags.enable('a');
      expect(flags.isEnabled('a')).toBe(true);
      flags.disable('a');
      expect(flags.isEnabled('a')).toBe(false);
    });
  });
});
