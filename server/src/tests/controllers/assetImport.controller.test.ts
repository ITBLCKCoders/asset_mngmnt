import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { importAssetsHandler } from '../../controllers/assetImport.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../db.js', () => ({ pool: { execute: jest.fn() } }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));
jest.mock('../../utils/activeCompany.js', () => ({ getScopedActiveCompany: jest.fn() }));
jest.mock('../../repositories/asset.repository.js', () => ({
  getCategoryIdByIdOrName: jest.fn(),
  getTypeIdByIdOrName: jest.fn(),
  typeMatchesCategory: jest.fn(),
  brandExistsForType: jest.fn(),
  brandExistsByName: jest.fn(),
  supplierExistsForCategory: jest.fn(),
  getAssetIdFormatSettings: jest.fn(),
  getLocationIdByIdOrName: jest.fn(),
  getRoomIdByIdOrName: jest.fn(),
  getDepartmentIdByIdOrName: jest.fn(),
  getAssetByCodeForAssign: jest.fn(),
}));

const assetRepo = jest.requireMock('../../repositories/asset.repository.js');
const { pool } = jest.requireMock('../../db.js');
const { getScopedActiveCompany } = jest.requireMock('../../utils/activeCompany.js');

const ACTIVE = { id: 'company-1', name: 'ACME Corp' };

function makeReq(body: any): any {
  return {
    body,
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('test-agent'),
    user: { userID: 'u1' },
  };
}

const row = (overrides: any = {}) => ({
  name: 'Dell OptiPlex 7090',
  category: 'Computer',
  company: 'ACME Corp',
  ...overrides,
});

describe('importAssetsHandler (active-company lock)', () => {
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    res = createMockRes();
    getScopedActiveCompany.mockResolvedValue(ACTIVE);
  });

  it('returns 400 when the user has no active company', async () => {
    getScopedActiveCompany.mockResolvedValue(null);
    await importAssetsHandler(makeReq({ assets: [row()] }), res as any);
    expect(res._status).toBe(400);
    expect(assetRepo.getCategoryIdByIdOrName).not.toHaveBeenCalled();
  });

  it('skips rows whose company does not match the active company', async () => {
    assetRepo.getCategoryIdByIdOrName.mockResolvedValue('cat-1');
    assetRepo.getAssetIdFormatSettings.mockResolvedValue({ id: 'fmt-1' });
    pool.execute.mockImplementation(async (sql: string) => {
      if (String(sql).startsWith('CALL sp_create_asset')) {
        return [[[{ assetID: 'a1', asset_code: 'AST-001', name: 'PC' }]]];
      }
      return [[]];
    });

    await importAssetsHandler(
      makeReq({ assets: [row({ company: 'Other Co' }), row()] }),
      res as any
    );

    expect(res._status).toBe(201);
    const body: any = res._json;
    expect(body.data.created).toBe(1);
    expect(body.data.failed).toBe(1);
    expect(body.data.errors[0].message).toMatch(/does not match your active company/);
    // Only one asset creation call (the matching row)
    const calls = pool.execute.mock.calls.filter((c: any[]) =>
      String(c[0]).startsWith('CALL sp_create_asset')
    );
    expect(calls).toHaveLength(1);
  });

  it('rejects a type that does not belong to the category', async () => {
    assetRepo.getCategoryIdByIdOrName.mockResolvedValue('cat-1');
    assetRepo.getTypeIdByIdOrName.mockResolvedValue('type-9');
    assetRepo.typeMatchesCategory.mockResolvedValue(false);

    await importAssetsHandler(makeReq({ assets: [row({ type: 'Sedan' })] }), res as any);

    const body: any = res._json;
    expect(body.data.created).toBe(0);
    expect(body.data.errors[0].message).toMatch(/does not belong to category/);
  });

  it('rejects a brand that is not found for the type', async () => {
    assetRepo.getCategoryIdByIdOrName.mockResolvedValue('cat-1');
    assetRepo.getTypeIdByIdOrName.mockResolvedValue('type-1');
    assetRepo.typeMatchesCategory.mockResolvedValue(true);
    assetRepo.brandExistsForType.mockResolvedValue(false);

    await importAssetsHandler(
      makeReq({ assets: [row({ type: 'Desktop', brand: 'Unknown' })] }),
      res as any
    );

    const body: any = res._json;
    expect(body.data.created).toBe(0);
    expect(body.data.errors[0].message).toMatch(/Brand "Unknown" not found for type "Desktop"/);
  });

  it('imports into the active company and scopes lookups to it', async () => {
    assetRepo.getCategoryIdByIdOrName.mockResolvedValue('cat-1');
    assetRepo.getAssetIdFormatSettings.mockResolvedValue({ id: 'fmt-1' });
    pool.execute.mockImplementation(async (sql: string) => {
      if (String(sql).startsWith('CALL sp_create_asset')) {
        return [[[{ assetID: 'a1', asset_code: 'AST-001', name: 'PC' }]]];
      }
      return [[]];
    });

    await importAssetsHandler(makeReq({ assets: [row()] }), res as any);

    expect(assetRepo.getCategoryIdByIdOrName).toHaveBeenCalledWith('Computer', 'company-1');
    const spCall = pool.execute.mock.calls.find((c: any[]) =>
      String(c[0]).startsWith('CALL sp_create_asset')
    );
    // companyId is passed through to sp_create_asset
    expect(spCall[1]).toContain('company-1');
    const body: any = res._json;
    expect(body.data.created).toBe(1);
    expect(body.data.assets[0]).toMatchObject({ assetCode: 'AST-001', name: 'PC' });
  });
});
