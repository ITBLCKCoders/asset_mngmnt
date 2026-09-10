import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockPool = { execute: jest.fn() };

jest.mock('../../db.js', () => ({ pool: mockPool }));

const {
  stripInactiveIntangiblesFromForms,
  pruneInactiveIntangibleAssets,
} = require('../../utils/accountabilityIntangibleFilter.js');

function pendingCopyForm() {
  return {
    formID: 'f-pending-copy',
    form_number: 'AF-001',
    user_id: 'owner-1',
    approval_status: 'pending_admin_copy_signature',
    assets_data: JSON.stringify({
      assets: [
        { id: 'INT-001', name: 'MS Office License', category: 'Intangible', type: 'IT scope' },
      ],
      assignment_ids: ['assign-1'],
    }),
  };
}

describe('accountabilityIntangibleFilter', () => {
  beforeEach(() => {
    mockPool.execute.mockReset();
    // No Active intangible assignments for the owner (pending-copy rows are
    // deliberately held as Inactive until the copy is signed).
    mockPool.execute.mockResolvedValueOnce([[], []]);
  });

  describe('stripInactiveIntangiblesFromForms', () => {
    it('keeps a pending-copy intangible-only form visible to the copy signer when no deactivation exists', async () => {
      const rows = await stripInactiveIntangiblesFromForms([pendingCopyForm()]);
      expect(rows).toHaveLength(1);
      expect(String(rows[0].formID)).toBe('f-pending-copy');
    });

    it('prunes an HR-deactivated intangible from a pending-admin-copy replacement form', async () => {
      const row = {
        ...pendingCopyForm(),
        formID: 'f-replacement',
        approval_status: 'pending_admin_copy_signature',
        assets_data: JSON.stringify({
          assets: [
            { id: 'INT-001', name: 'MS Office License', category: 'Intangible', type: 'IT scope' },
          ],
          assignment_ids: ['assign-1'],
        }),
      };
      // Simulate: INT-001 has an approved deactivation form.
      const deadRow = { user_id: 'owner-1', assets_data: JSON.stringify({ intangibleAssetIds: ['INT-001'] }) };
      mockPool.execute.mockResolvedValueOnce([[deadRow], []]);
      mockPool.execute.mockResolvedValueOnce([[], []]);
      const rows = await stripInactiveIntangiblesFromForms([row]);
      expect(rows).toHaveLength(0);
    });

    it('keeps a pending-copy intangible with no approved deactivation', async () => {
      const row = {
        ...pendingCopyForm(),
        formID: 'f-hold-inactive',
        approval_status: 'pending_admin_copy_signature',
        assets_data: JSON.stringify({
          assets: [
            { id: 'INT-002', name: 'Held Inactive License', category: 'Intangible', type: 'IT scope' },
          ],
          assignment_ids: ['assign-2'],
        }),
      };
      // No approved deactivation for INT-002, but no active assignments either.
      mockPool.execute.mockResolvedValueOnce([[]]);
      mockPool.execute.mockResolvedValueOnce([[], []]);
      const rows = await stripInactiveIntangiblesFromForms([row]);
      expect(rows).toHaveLength(1);
    });

    it('still hides an approved form whose intangibles are all inactive', async () => {
      const row = { ...pendingCopyForm(), formID: 'f-approved', approval_status: 'approved' };
      const rows = await stripInactiveIntangiblesFromForms([row]);
      expect(rows).toHaveLength(0);
    });

    it('keeps mixed forms while pruning only the inactive intangibles', async () => {
      const row = {
        ...pendingCopyForm(),
        formID: 'f-mixed',
        approval_status: 'approved',
        assets_data: JSON.stringify({
          assets: [
            { id: 'AST-001', code: 'AST-001', name: 'Laptop', category: 'Hardware', type: 'Laptop' },
            { id: 'INT-001', name: 'MS Office License', category: 'Intangible', type: 'IT scope' },
          ],
          assignment_ids: ['assign-1'],
        }),
      };
      const rows = await stripInactiveIntangiblesFromForms([row]);
      expect(rows).toHaveLength(1);
      const parsed = JSON.parse(String(rows[0].assets_data));
      expect(parsed.assets.map((a) => a.id)).toEqual(['AST-001']);
    });

    it('prunes HR-deactivated intangible from an approved replacement form', async () => {
      const row = {
        ...pendingCopyForm(),
        formID: 'f-approved-replacement',
        approval_status: 'approved',
        assets_data: JSON.stringify({
          assets: [
            { id: 'INT-001', name: 'Deactivated License', category: 'Intangible', type: 'IT scope' },
          ],
          assignment_ids: ['assign-1'],
        }),
      };
      const deadRow = { user_id: 'owner-1', assets_data: JSON.stringify({ intangibleAssetIds: ['INT-001'] }) };
      mockPool.execute.mockResolvedValueOnce([[deadRow], []]);
      mockPool.execute.mockResolvedValueOnce([[], []]);
      const rows = await stripInactiveIntangiblesFromForms([row]);
      expect(rows).toHaveLength(0);
    });
  });

  describe('pruneInactiveIntangibleAssets', () => {
    it('drops inactive intangibles but keeps tangible assets', () => {
      const assets = [
        { id: 'AST-001', category: 'Hardware' },
        { id: 'INT-001', category: 'Intangible' },
      ];
      expect(pruneInactiveIntangibleAssets(assets, new Set())).toEqual([
        { id: 'AST-001', category: 'Hardware' },
      ]);
    });
  });
});
