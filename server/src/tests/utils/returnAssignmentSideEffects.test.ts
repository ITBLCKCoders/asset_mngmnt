import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockCreateAuditLog = jest.fn();
const mockConn = { execute: jest.fn() };

jest.mock('../../utils/audit.js', () => ({ createAuditLog: (...args: any[]) => mockCreateAuditLog(...args) }));

const { applyReturnAssignmentSideEffectsOnConnection } = require('../../utils/returnAssignmentSideEffects.js');

describe('returnAssignmentSideEffects', () => {
  const assignment = { assignmentID: 'as1', asset_id: 'a1', user_id: 'u1', status: 'Active' };
  const meta = { ipAddress: '127.0.0.1', userAgent: 'test' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update builder to Available when all assets returned', async () => {
    mockConn.execute
      .mockResolvedValueOnce([[{ builderID: 'b1', name: 'Builder A', builder_status: 'Assigned' }], []])
      .mockResolvedValueOnce([[{ assigned_count: 0 }], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[{ asset_code: 'A001' }], []]);
    mockCreateAuditLog.mockResolvedValue(undefined);

    await applyReturnAssignmentSideEffectsOnConnection(mockConn as any, assignment, 'Returned OK', 'admin', meta);

    expect(mockConn.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE asset_builders'),
      expect.arrayContaining(['admin', 'b1'])
    );
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'Updated Asset Builder Status' })
    );
  });

  it('should remove asset from builder when some assets remain assigned', async () => {
    mockConn.execute
      .mockResolvedValueOnce([[{ builderID: 'b1', name: 'Builder A', builder_status: 'Assigned' }], []])
      .mockResolvedValueOnce([[{ assigned_count: 2 }], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[{ asset_code: 'A001' }], []]);

    await applyReturnAssignmentSideEffectsOnConnection(mockConn as any, assignment, 'Partial return', 'admin', meta);

    expect(mockConn.execute).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM asset_builder_items'),
      ['a1']
    );
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'Removed from Asset Builder' })
    );
  });

  it('should create Returned Asset audit log', async () => {
    mockConn.execute.mockResolvedValue([[[]], []]);

    await applyReturnAssignmentSideEffectsOnConnection(mockConn as any, assignment, 'Returned', 'admin', meta);

    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'Returned Asset' })
    );
  });

  it('should handle missing builder gracefully', async () => {
    mockConn.execute.mockResolvedValue([[[]], []]);

    await applyReturnAssignmentSideEffectsOnConnection(mockConn as any, assignment, '', 'admin', meta);

    expect(mockCreateAuditLog).toHaveBeenCalledTimes(1);
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'Returned Asset' })
    );
  });
});
