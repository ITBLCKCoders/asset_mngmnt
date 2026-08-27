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
        { formID: 'f1', form_number: 'AF-001', asset_id: 'a1', assets_data: null, status: 'Signed', issuer_signature: 'sig', it_copy_signature: 'sig' },
      ], []])
      // Disable form
      .mockResolvedValueOnce([[], []])
      // Find active assignments
      .mockResolvedValueOnce([[
        { asset_id: 'a1', department_id: 'd1', location_id: 'loc1', location_room_id: 'room1' },
      ], []])
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
    ).resolves.toBeUndefined();
  });
});
