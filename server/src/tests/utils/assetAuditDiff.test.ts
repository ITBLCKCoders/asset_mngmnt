import {
  buildAssetUpdateAuditDiff,
  mergeAssignmentIntoDiff,
  ASSET_AUDIT_DIFF_KEYS,
} from '../../utils/assetAuditDiff.js';

function baseRow(overrides: Record<string, unknown> = {}) {
  const row: Record<string, unknown> = {};
  for (const k of ASSET_AUDIT_DIFF_KEYS) {
    if (k === 'name') row[k] = 'Asset A';
    else if (k === 'status') row[k] = 'Available';
    else if (k === 'is_old_unit') row[k] = 0;
    else if (k === 'salvage_value') row[k] = '0.00';
    else if (k === 'condition') row[k] = 'Good';
    else if (k === 'maintenance_schedule') row[k] = 'None';
    else if (k === 'depreciation_method') row[k] = 'straight-line';
    else row[k] = null;
  }
  return { ...row, ...overrides };
}

describe('buildAssetUpdateAuditDiff', () => {
  it('returns no keys when old and new are equivalent', () => {
    const row = baseRow();
    const diff = buildAssetUpdateAuditDiff(row, { ...row });
    expect(diff.changeCount).toBe(0);
    expect(Object.keys(diff.oldValues)).toHaveLength(0);
    expect(Object.keys(diff.newValues)).toHaveLength(0);
  });

  it('detects a single scalar field change', () => {
    const oldRow = baseRow({ name: 'Old' });
    const newRow = baseRow({ name: 'New' });
    const diff = buildAssetUpdateAuditDiff(oldRow, newRow);
    expect(diff.changeCount).toBe(1);
    expect(diff.oldValues.name).toBe('Old');
    expect(diff.newValues.name).toBe('New');
  });

  it('normalizes date strings for comparison', () => {
    const oldRow = baseRow({ purchase_date: '2024-01-15T00:00:00.000Z' });
    const newRow = baseRow({ purchase_date: '2024-01-16' });
    const same = buildAssetUpdateAuditDiff(
      baseRow({ purchase_date: '2024-01-15' }),
      baseRow({ purchase_date: '2024-01-15T12:00:00.000Z' })
    );
    expect(same.changeCount).toBe(0);

    const changed = buildAssetUpdateAuditDiff(oldRow, newRow);
    expect(changed.changeCount).toBe(1);
  });

  it('normalizes decimal strings', () => {
    const oldRow = baseRow({ asset_value: '100.00' });
    const newRow = baseRow({ asset_value: 100 });
    const diff = buildAssetUpdateAuditDiff(oldRow, newRow);
    expect(diff.changeCount).toBe(0);
  });

  it('detects asset_value change when values differ numerically', () => {
    const oldRow = baseRow({ asset_value: '100.00' });
    const newRow = baseRow({ asset_value: '200.50' });
    const diff = buildAssetUpdateAuditDiff(oldRow, newRow);
    expect(diff.changeCount).toBe(1);
    expect(diff.oldValues.asset_value).toBe('100.00');
    expect(diff.newValues.asset_value).toBe('200.50');
  });

  it('maps image_url changes to placeholders', () => {
    const oldRow = baseRow({
      image_url: 'https://example.com/long-url/path/to/image.png',
    });
    const newRow = baseRow({ image_url: 'https://other.com/x.jpg' });
    const diff = buildAssetUpdateAuditDiff(oldRow, newRow);
    expect(diff.oldValues.image_url).toBe('[image]');
    expect(diff.newValues.image_url).toBe('[image]');
  });

  it('treats is_old_unit 0 and 1 as distinct', () => {
    const oldRow = baseRow({ is_old_unit: 0 });
    const newRow = baseRow({ is_old_unit: 1 });
    const diff = buildAssetUpdateAuditDiff(oldRow, newRow);
    expect(diff.changeCount).toBe(1);
    expect(diff.newValues.is_old_unit).toBe(1);
  });
});

describe('mergeAssignmentIntoDiff', () => {
  it('adds assigned_to old → new when assignee changes', () => {
    const diff = { oldValues: {}, newValues: {}, changeCount: 0 };
    const merged = mergeAssignmentIntoDiff(
      diff,
      'Jane Doe',
      'John Smith'
    );
    expect(merged.changeCount).toBe(1);
    expect(merged.oldValues.assigned_to).toBe('Jane Doe');
    expect(merged.newValues.assigned_to).toBe('John Smith');
  });

  it('does not mutate the input diff', () => {
    const diff = { oldValues: { name: 'Old' }, newValues: { name: 'New' }, changeCount: 1 };
    const merged = mergeAssignmentIntoDiff(diff, 'Jane Doe', 'John Smith');
    expect(diff.oldValues.assigned_to).toBeUndefined();
    expect(diff.newValues.assigned_to).toBeUndefined();
    expect(diff.changeCount).toBe(1);
    expect(merged.oldValues.name).toBe('Old');
    expect(merged.changeCount).toBe(2);
  });

  it('returns diff unchanged when assignee is the same', () => {
    const diff = { oldValues: {}, newValues: {}, changeCount: 0 };
    const merged = mergeAssignmentIntoDiff(diff, 'Jane Doe', 'Jane Doe');
    expect(merged).toBe(diff);
    expect(merged.changeCount).toBe(0);
  });

  it('maps a cleared assignment to null', () => {
    const diff = { oldValues: {}, newValues: {}, changeCount: 0 };
    const merged = mergeAssignmentIntoDiff(diff, 'Jane Doe', '');
    expect(merged.changeCount).toBe(1);
    expect(merged.oldValues.assigned_to).toBe('Jane Doe');
    expect(merged.newValues.assigned_to).toBeNull();
  });

  it('normalizes surrounding whitespace in names', () => {
    const diff = { oldValues: {}, newValues: {}, changeCount: 0 };
    const merged = mergeAssignmentIntoDiff(diff, ' Jane Doe ', 'John Smith');
    expect(merged.oldValues.assigned_to).toBe('Jane Doe');
  });
});
