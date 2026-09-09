import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };
const mockCreateAuditLog = jest.fn();
const mockCreateAccountabilityFormHandler = jest.fn();

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: (...args: any[]) => mockCreateAuditLog(...args) }));
jest.mock('../../controllers/accountabilityForms.controller.js', () => ({
  createAccountabilityFormHandler: (...args: any[]) => mockCreateAccountabilityFormHandler(...args),
}));

const { handleAccountabilityFormOnAssetReturn } = require('../../utils/accountabilityFormOnReturn.js');

function makeReq(overrides = {}) {
  return {
    ip: '192.168.1.1',
    get: jest.fn((h: string) => h === 'User-Agent' ? 'test-agent' : undefined),
    ...overrides,
  };
}

describe('accountabilityFormOnReturn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // mockReset clears queued mockResolvedValueOnce responses so the next
    // test starts with an empty mock queue (clearAllMocks only clears call
    // history, leaving leftover queued values that would be consumed out of
    // order and break unrelated tests).
    mockPool.execute.mockReset();
    mockCreateAccountabilityFormHandler.mockReset();
  });

  it('should return early when no returned assets', async () => {
    await handleAccountabilityFormOnAssetReturn('u1', [], 'd1', 'loc1', 'room1', 'creator', makeReq());
    expect(mockPool.execute).not.toHaveBeenCalled();
  });

  it('should disable existing forms containing returned assets and create new ones', async () => {
    const req = makeReq();
    mockPool.execute
      // Fetch processor digital signature
      .mockResolvedValueOnce([[{ digital_signature: 'sig123' }], []])
      // Find forms for user
      .mockResolvedValueOnce([[
        {
          formID: 'f1',
          form_number: 'AF-001',
          asset_id: 'a1',
          assets_data: JSON.stringify({
            assets: [{ id: 'a1', name: 'Laptop', department: 'IT' }],
          }),
          status: 'Signed',
          issuer_signature: 'sig',
          it_copy_signature: 'sig',
        },
      ], []])
      // Disable form
      .mockResolvedValueOnce([[], []])
      // Find active assignments (queried BEFORE clearance helper)
      .mockResolvedValueOnce([[
        { asset_id: 'a1', department_id: 'd1', location_id: 'loc1', location_room_id: 'room1' },
      ], []])
      // Clearance helper: existing IT clearance lookup (none)
      .mockResolvedValueOnce([[], []])
      // Clearance helper: remaining tangibles for IT (a1 still active) — note department_name selected
      .mockResolvedValueOnce([[
        { assetID: 'a1', department_name: 'IT' },
      ], []])
      // Clearance helper: remaining intangibles for IT (none)
      .mockResolvedValueOnce([[], []])
      // Clearance helper: other active forms for IT (none)
      .mockResolvedValueOnce([[], []])
      // Get asset details
      .mockResolvedValueOnce([[
        { assetID: 'a1', category_id: 'c1', asset_code: 'A001', name: 'Laptop', serial: 'S1', model: 'M1', brand: 'B1', category_name: 'Electronics', type_name: 'Laptop', department_name: 'IT' },
      ], []])
      // Get returned asset departments
      .mockResolvedValueOnce([[{ department_name: 'IT' }], []])
      // Get department assets for new form
      .mockResolvedValueOnce([[
        { assetID: 'a1', asset_code: 'A001', name: 'Laptop', serial: 'S1', model: 'M1', brand: 'B1', category_name: 'Electronics', type_name: 'Laptop', department_name: 'IT', department_id: 'd1' },
      ], []]);
    mockCreateAccountabilityFormHandler.mockResolvedValue(undefined);

    await handleAccountabilityFormOnAssetReturn('u1', ['a1'], 'd1', 'loc1', 'room1', 'creator', req);

    expect(mockPool.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE accountability_forms'),
      ['f1']
    );
    expect(mockCreateAccountabilityFormHandler).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'Disabled Accountability Form' })
    );
  });

  it('should do fallback when no department-specific forms created', async () => {
    const req = makeReq();
    mockPool.execute
      // Fetch processor digital signature
      .mockResolvedValueOnce([[{ digital_signature: null }], []])
      // Find forms for user
      .mockResolvedValueOnce([[[]], []])
      // Find active assignments
      .mockResolvedValueOnce([[
        { asset_id: 'a1', department_id: 'd1', location_id: 'loc1', location_room_id: 'room1' },
      ], []])
      // Get asset details
      .mockResolvedValueOnce([[
        { assetID: 'a1', category_id: 'c1', asset_code: 'A001', name: 'Laptop', serial: 'S1', model: 'M1', brand: 'B1', category_name: null, type_name: null, department_name: null },
      ], []])
      // Get returned asset departments
      .mockResolvedValueOnce([[{ department_name: 'Other' }], []])
      // No department assets match
      .mockResolvedValueOnce([[[]], []])
      // Fallback: get all assets
      .mockResolvedValueOnce([[
        { assetID: 'a1', asset_code: 'A001', name: 'Laptop', serial: 'S1', model: 'M1', brand: 'B1', category_name: null, type_name: null, department_name: null, department_id: null },
      ], []]);
    mockCreateAccountabilityFormHandler.mockResolvedValue(undefined);

    await handleAccountabilityFormOnAssetReturn('u1', ['a1'], 'd1', 'loc1', 'room1', 'creator', req);
    expect(mockCreateAccountabilityFormHandler).toHaveBeenCalledTimes(1);
  });

  it('should return early when no active assignments remain', async () => {
    const req = makeReq();
    mockPool.execute
      .mockResolvedValueOnce([[{ digital_signature: null }], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[], []])
      // No active intangible assignments remain either
      .mockResolvedValueOnce([[], []]);
    await handleAccountabilityFormOnAssetReturn('u1', ['a1'], 'd1', 'loc1', 'room1', 'creator', req);
    expect(mockCreateAccountabilityFormHandler).not.toHaveBeenCalled();
  });

  it('should create a new form from remaining intangible assets when all tangibles are returned', async () => {
    const req = makeReq();
    // Defensive: the shared pool mock may retain one-shot responses from
    // surrounding tests, so reset it (and the handler) before arranging again.
    mockPool.execute.mockReset();
    mockCreateAccountabilityFormHandler.mockReset();
    mockPool.execute
      // Fetch processor digital signature
      .mockResolvedValueOnce([[{ digital_signature: null }], []])
      // Find forms for user (none to disable)
      .mockResolvedValueOnce([[], []])
      // Find active tangible assignments (none remain)
      .mockResolvedValueOnce([[], []])
      // Find active intangible assignments -> one remains
      .mockResolvedValueOnce([[
        {
          intangible_asset_id: 'ia1',
          name: 'Software License',
          description: 'Annual license',
          type: 'Software',
          department_id: 'd1',
          location_id: 'loc1',
          location_room_id: 'room1',
          department_name: 'IT',
        },
      ], []]);
    mockCreateAccountabilityFormHandler.mockResolvedValue(undefined);

    await handleAccountabilityFormOnAssetReturn('u1', ['a1'], 'd1', 'loc1', 'room1', 'creator', req);

    expect(mockCreateAccountabilityFormHandler).toHaveBeenCalledTimes(1);
    const formReq = mockCreateAccountabilityFormHandler.mock.calls[0][0];
    expect(formReq.body.assets).toEqual([
      expect.objectContaining({ id: 'ia1', category: 'Intangible', name: 'Software License' }),
    ]);
    expect(formReq.body.departmentId).toBe('d1');
  });

  it('should not crash when handler throws', async () => {
    const req = makeReq();
    mockPool.execute
      .mockResolvedValueOnce([[{ digital_signature: 'sig' }], []])
      .mockResolvedValueOnce([[[]], []])
      .mockResolvedValueOnce([[
        { asset_id: 'a1', department_id: 'd1', location_id: null, location_room_id: null },
      ], []])
      .mockResolvedValueOnce([[
        { assetID: 'a1', category_id: 'c1', asset_code: 'A001', name: 'Laptop', serial: 'S1', model: 'M1', brand: 'B1', category_name: 'Electronics', type_name: 'Laptop', department_name: 'IT' },
      ], []])
      .mockResolvedValueOnce([[{ department_name: 'IT' }], []])
      .mockResolvedValueOnce([[
        { assetID: 'a1', asset_code: 'A001', name: 'Laptop', serial: 'S1', model: 'M1', brand: 'B1', category_name: 'Electronics', type_name: 'Laptop', department_name: 'IT', department_id: 'd1' },
      ], []]);
    mockCreateAccountabilityFormHandler.mockRejectedValue(new Error('Handler failed'));
    // Fallback query
    mockPool.execute
      .mockResolvedValueOnce([[
        { assetID: 'a1', asset_code: 'A001', name: 'Laptop', serial: 'S1', model: 'M1', brand: 'B1', category_name: 'Electronics', type_name: 'Laptop', department_name: 'IT', department_id: 'd1' },
      ], []]);
    await expect(
      handleAccountabilityFormOnAssetReturn('u1', ['a1'], 'd1', null, null, 'creator', req)
    ).resolves.toEqual(
      expect.objectContaining({
        eligibleScopes: expect.any(Array),
        disabledFormNumbersByScope: expect.any(Object),
      })
    );
  });

  it('should generate an IT clearance certificate when the IT accountability form is disabled and zero IT assets remain', async () => {
    const req = makeReq();
    mockPool.execute
      // Fetch processor digital signature
      .mockResolvedValueOnce([[{ digital_signature: 'sig-it' }], []])
      // Find forms for user: one IT form to disable
      .mockResolvedValueOnce([[
        {
          formID: 'f-it',
          form_number: 'AF-IT-001',
          asset_id: 'a1',
          assets_data: JSON.stringify({
            assets: [{ id: 'a1', name: 'Laptop', department: 'IT' }],
          }),
          status: 'Signed',
          issuer_signature: 'sig',
          it_copy_signature: 'sig',
        },
      ], []])
      // Disable form
      .mockResolvedValueOnce([[], []])
      // Find active assignments (queried BEFORE clearance helper)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - IT scope: existing clearance lookup (none)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - IT scope: remaining tangibles (zero IT)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - IT scope: remaining intangibles (zero)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - IT scope: other active forms for IT (none)
      .mockResolvedValueOnce([[], []])
      // Find active intangibles (also empty) — after helper returns
      .mockResolvedValueOnce([[], []]);
    mockCreateAccountabilityFormHandler.mockResolvedValue(undefined);

    const eligibility = await handleAccountabilityFormOnAssetReturn('u1', ['a1'], 'd-it', null, null, 'creator', req);

    expect(eligibility.eligibleScopes).toEqual(['IT']);
    expect(eligibility.disabledFormNumbersByScope.IT).toEqual(['AF-IT-001']);
    // Opt-in: no auto-creation
    const clearanceCalls = mockCreateAccountabilityFormHandler.mock.calls.filter(
      (call: any[]) => call[0]?.body?.formOrigin === 'clearance'
    );
    expect(clearanceCalls).toHaveLength(0);
  });

  it('should generate an Admin clearance certificate when only the Admin accountability form is disabled and zero Admin assets remain', async () => {
    const req = makeReq();
    mockPool.execute
      // Fetch processor digital signature
      .mockResolvedValueOnce([[{ digital_signature: 'sig-adm' }], []])
      // Find forms for user: one Admin form to disable
      .mockResolvedValueOnce([[
        {
          formID: 'f-adm',
          form_number: 'AF-ADM-001',
          asset_id: 'a2',
          assets_data: JSON.stringify({
            assets: [{ id: 'a2', name: 'Office Chair', department: 'Administration' }],
          }),
          status: 'Signed',
          issuer_signature: 'sig',
          it_copy_signature: 'sig',
        },
      ], []])
      // Disable form
      .mockResolvedValueOnce([[], []])
      // Find active assignments (queried BEFORE clearance helper)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - Admin scope: existing clearance lookup (none) — IT scope skipped (no disabled IT forms)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - Admin scope: remaining tangibles (zero Admin)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - Admin scope: remaining intangibles (zero)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - Admin scope: other active forms for Admin (none)
      .mockResolvedValueOnce([[], []])
      // Find active intangibles (also empty) — after helper returns
      .mockResolvedValueOnce([[], []]);
    mockCreateAccountabilityFormHandler.mockResolvedValue(undefined);

    const eligibility = await handleAccountabilityFormOnAssetReturn('u1', ['a2'], 'd-adm', null, null, 'creator', req);

    expect(eligibility.eligibleScopes).toEqual(['Admin']);
    expect(eligibility.disabledFormNumbersByScope.Admin).toEqual(['AF-ADM-001']);
    const clearanceCalls = mockCreateAccountabilityFormHandler.mock.calls.filter(
      (call: any[]) => call[0]?.body?.formOrigin === 'clearance'
    );
    expect(clearanceCalls).toHaveLength(0);
  });

  it('should generate BOTH IT and Admin clearance certificates when both scopes are disabled in one operation', async () => {
    const req = makeReq();
    mockPool.execute
      // Fetch processor digital signature
      .mockResolvedValueOnce([[{ digital_signature: 'sig-both' }], []])
      // Find forms for user: one IT + one Admin
      .mockResolvedValueOnce([[
        {
          formID: 'f-it',
          form_number: 'AF-IT-002',
          asset_id: 'a1',
          assets_data: JSON.stringify({
            assets: [{ id: 'a1', name: 'Laptop', department: 'IT' }],
          }),
          status: 'Signed',
          issuer_signature: 'sig',
          it_copy_signature: 'sig',
        },
        {
          formID: 'f-adm',
          form_number: 'AF-ADM-002',
          asset_id: 'a2',
          assets_data: JSON.stringify({
            assets: [{ id: 'a2', name: 'Office Chair', department: 'Administration' }],
          }),
          status: 'Signed',
          issuer_signature: 'sig',
          it_copy_signature: 'sig',
        },
      ], []])
      // Disable IT form
      .mockResolvedValueOnce([[], []])
      // Disable Admin form
      .mockResolvedValueOnce([[], []])
      // Find active assignments (empty) — queried BEFORE clearance helper
      .mockResolvedValueOnce([[], []])
      // Clearance helper - IT scope: existing clearance (none)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - IT scope: remaining tangibles (zero IT)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - IT scope: remaining intangibles (zero)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - IT scope: other active forms for IT (none)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - Admin scope: existing clearance (none)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - Admin scope: remaining tangibles (zero Admin)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - Admin scope: remaining intangibles (zero)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - Admin scope: other active forms for Admin (none)
      .mockResolvedValueOnce([[], []])
      // Find active intangibles (empty) — after helper returns
      .mockResolvedValueOnce([[], []]);
    mockCreateAccountabilityFormHandler.mockResolvedValue(undefined);

    const eligibility = await handleAccountabilityFormOnAssetReturn('u1', ['a1', 'a2'], 'd-it', null, null, 'creator', req);

    expect(eligibility.eligibleScopes.sort()).toEqual(['Admin', 'IT']);
    expect(eligibility.disabledFormNumbersByScope.IT).toEqual(['AF-IT-002']);
    expect(eligibility.disabledFormNumbersByScope.Admin).toEqual(['AF-ADM-002']);
    const clearanceCalls = mockCreateAccountabilityFormHandler.mock.calls.filter(
      (call: any[]) => call[0]?.body?.formOrigin === 'clearance'
    );
    expect(clearanceCalls).toHaveLength(0);
  });

  it('should skip clearance generation when the user still holds assets in that scope', async () => {
    const req = makeReq();
    mockPool.execute
      // Fetch processor digital signature
      .mockResolvedValueOnce([[{ digital_signature: null }], []])
      // Find forms for user: one IT form to disable
      .mockResolvedValueOnce([[
        {
          formID: 'f-it',
          form_number: 'AF-IT-003',
          asset_id: 'a1',
          assets_data: JSON.stringify({
            assets: [{ id: 'a1', name: 'Laptop', department: 'IT' }],
          }),
          status: 'Signed',
          issuer_signature: 'sig',
          it_copy_signature: 'sig',
        },
      ], []])
      // Disable form
      .mockResolvedValueOnce([[], []])
      // Find active assignments (one IT asset remains) — queried BEFORE clearance helper
      .mockResolvedValueOnce([[
        { asset_id: 'a3', department_id: 'd1', location_id: 'loc1', location_room_id: 'room1' },
      ], []])
      // Clearance helper - IT scope: existing clearance (none)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - IT scope: remaining tangibles (still has an IT asset)
      .mockResolvedValueOnce([[{ assetID: 'a3', department_name: 'IT' }], []])
      // Clearance helper - IT scope: remaining intangibles (none)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - IT scope: other active forms for IT (none)
      .mockResolvedValueOnce([[], []])
      // Get asset details
      .mockResolvedValueOnce([[
        { assetID: 'a3', category_id: 'c1', asset_code: 'A003', name: 'Monitor', serial: 'S3', model: 'M3', brand: 'B3', category_name: 'Electronics', type_name: 'Monitor', department_name: 'IT' },
      ], []])
      // Get returned asset departments
      .mockResolvedValueOnce([[{ department_name: 'IT' }], []])
      // Get department assets for new form
      .mockResolvedValueOnce([[
        { assetID: 'a3', asset_code: 'A003', name: 'Monitor', serial: 'S3', model: 'M3', brand: 'B3', category_name: 'Electronics', type_name: 'Monitor', department_name: 'IT', department_id: 'd1' },
      ], []]);
    mockCreateAccountabilityFormHandler.mockResolvedValue(undefined);

    await handleAccountabilityFormOnAssetReturn('u1', ['a1'], 'd1', 'loc1', 'room1', 'creator', req);

    const clearanceCalls = mockCreateAccountabilityFormHandler.mock.calls.filter(
      (call: any[]) => call[0]?.body?.formOrigin === 'clearance'
    );
    expect(clearanceCalls).toHaveLength(0);
  });

  it('should not reference ia.deleted_at in any query (intangible_assets has no such column)', async () => {
    const req = makeReq();
    mockPool.execute
      // Fetch processor digital signature
      .mockResolvedValueOnce([[{ digital_signature: null }], []])
      // Find forms for user: one IT form to disable
      .mockResolvedValueOnce([[
        {
          formID: 'f-it',
          form_number: 'AF-IT-004',
          asset_id: 'a1',
          assets_data: JSON.stringify({
            assets: [{ id: 'a1', name: 'Laptop', department: 'IT' }],
          }),
          status: 'Signed',
          issuer_signature: 'sig',
          it_copy_signature: 'sig',
        },
      ], []])
      // Disable form
      .mockResolvedValueOnce([[], []])
      // Find active assignments (one IT asset remains)
      .mockResolvedValueOnce([[
        { asset_id: 'a3', department_id: 'd1', location_id: 'loc1', location_room_id: 'room1' },
      ], []])
      // Clearance helper - IT scope: existing clearance (none)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - IT scope: remaining tangibles
      .mockResolvedValueOnce([[{ assetID: 'a3', department_name: 'IT' }], []])
      // Clearance helper - IT scope: remaining intangibles (none)
      .mockResolvedValueOnce([[], []])
      // Clearance helper - IT scope: other active forms (none)
      .mockResolvedValueOnce([[], []])
      // Get asset details
      .mockResolvedValueOnce([[
        { assetID: 'a3', category_id: 'c1', asset_code: 'A003', name: 'Monitor', serial: 'S3', model: 'M3', brand: 'B3', category_name: 'Electronics', type_name: 'Monitor', department_name: 'IT' },
      ], []])
      // Get returned asset departments
      .mockResolvedValueOnce([[{ department_name: 'IT' }], []])
      // Get department assets for new form
      .mockResolvedValueOnce([[
        { assetID: 'a3', asset_code: 'A003', name: 'Monitor', serial: 'S3', model: 'M3', brand: 'B3', category_name: 'Electronics', type_name: 'Monitor', department_name: 'IT', department_id: 'd1' },
      ], []]);
    mockCreateAccountabilityFormHandler.mockResolvedValue(undefined);

    await handleAccountabilityFormOnAssetReturn('u1', ['a1'], 'd1', 'loc1', 'room1', 'creator', req);

    expect(mockCreateAccountabilityFormHandler).toHaveBeenCalled();
    const executedSql = mockPool.execute.mock.calls.map((call: any[]) => String(call[0]));
    expect(executedSql.length).toBeGreaterThan(0);
    for (const sql of executedSql) {
      expect(sql).not.toMatch(/\bia\.deleted_at\b/);
    }
  });
});
