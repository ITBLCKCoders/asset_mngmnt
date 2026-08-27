import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));

const {
  generateReturnFormNumberFallback,
  generateReturnFormNumber,
} = require('../../utils/returnFormNumber.js');

describe('returnFormNumber', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReturnFormNumberFallback', () => {
    it('starts the sequence at 0001 with MMYYYY date when no forms exist', async () => {
      mockPool.execute.mockResolvedValue([[{ next_seq: 1 }], []]);
      const now = new Date();
      const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
      const result = await generateReturnFormNumberFallback();
      expect(result).toBe(`RET-${dateStr}-0001`);
      expect(mockPool.execute).toHaveBeenCalledWith(
        expect.stringContaining('FROM asset_return_forms'),
        [`RET-%${now.getFullYear()}-%`]
      );
    });

    it('continues the sequence across months within the same year', async () => {
      mockPool.execute.mockResolvedValue([[{ next_seq: 16 }], []]);
      const now = new Date();
      const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
      const result = await generateReturnFormNumberFallback();
      expect(result).toBe(`RET-${dateStr}-0016`);
    });

    it('resets to 0001 when only prior-year forms exist (year-scoped lookup)', async () => {
      mockPool.execute.mockResolvedValue([[{ next_seq: 1 }], []]);
      const result = await generateReturnFormNumberFallback();
      expect(result).toMatch(/^RET-\d{6}-0001$/);
    });
  });

  describe('generateReturnFormNumber', () => {
    it('falls back when no settings exist', async () => {
      mockPool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('asset_return_form_settings')) return [[], []];
        return [[{ next_seq: 3 }], []];
      });
      const now = new Date();
      const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
      const result = await generateReturnFormNumber('c1', null);
      expect(result).toBe(`RET-${dateStr}-0003`);
    });

    it('scopes the sequence per year for MMYYYY date format', async () => {
      mockPool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('asset_return_form_settings')) {
          return [[{ company_format: 'code', department_format: 'none', include_date: 1, date_format: 'MMYYYY', it_asset_return_code: '1009', admin_asset_return_code: '1009' }], []];
        }
        if (sql.includes('FROM companies')) return [[{ code: '005' }], []];
        return [[{ next_seq: 7 }], []];
      });
      const now = new Date();
      const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
      const result = await generateReturnFormNumber('c1', null);
      expect(result).toBe(`005-1009-${dateStr}-0007`);
      const seqCall = (mockPool.execute as any).mock.calls.find((c: any[]) =>
        String(c[0]).includes('SUBSTRING_INDEX(form_number')
      );
      expect(seqCall[1][0]).toBe(`005-1009-%${now.getFullYear()}-%`);
    });

    it('scopes the sequence per year even for a non-standard month-inclusive date format', async () => {
      mockPool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('asset_return_form_settings')) {
          return [[{ company_format: 'code', department_format: 'none', include_date: 1, date_format: 'MM-DD-YYYY', it_asset_return_code: '1009', admin_asset_return_code: '1009' }], []];
        }
        if (sql.includes('FROM companies')) return [[{ code: '005' }], []];
        return [[{ next_seq: 2 }], []];
      });
      const now = new Date();
      const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
      const result = await generateReturnFormNumber('c1', null);
      expect(result).toBe(`005-1009-${dateStr}-0002`);
      const seqCall = (mockPool.execute as any).mock.calls.find((c: any[]) =>
        String(c[0]).includes('SUBSTRING_INDEX(form_number')
      );
      expect(seqCall[1][0]).toBe(`005-1009-%${now.getFullYear()}-%`);
    });

    it('scopes the sequence per day for YYYYMMDD date format', async () => {
      mockPool.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('asset_return_form_settings')) {
          return [[{ company_format: 'code', department_format: 'none', include_date: 1, date_format: 'YYYYMMDD', it_asset_return_code: '1009', admin_asset_return_code: '1009' }], []];
        }
        if (sql.includes('FROM companies')) return [[{ code: '005' }], []];
        return [[{ next_seq: 4 }], []];
      });
      const now = new Date();
      const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const result = await generateReturnFormNumber('c1', null);
      expect(result).toBe(`005-1009-${ymd}-0004`);
      const seqCall = (mockPool.execute as any).mock.calls.find((c: any[]) =>
        String(c[0]).includes('SUBSTRING_INDEX(form_number')
      );
      expect(seqCall[1][0]).toBe(`005-1009-${ymd}-%`);
    });
  });
});
