import { describe, it, expect } from 'vitest';
import {
  isIntangibleAssetLike,
  fetchAssignedIntangibleAssetsForForm,
  getFormAssignedIntangibleAssets,
  getFormDisplayAssets,
  splitDisplayAssets,
  mergeAssetsById,
} from '@/pages/assets/accountability/accountabilityFormAssets';

const tangible = { id: 't1', code: 'AST-001', category: 'Hardware', name: 'Laptop' };
const intangible = { id: 'i1', code: 'INT-001', category: 'Intangible', name: 'Software License' };
const resolvedIntangible = {
  id: 'i2',
  code: 'INT-002',
  name: 'Domain',
  category: 'Intangible',
  risk_level: { id: 'rl1', name: 'Medium' },
  description: 'Company domain',
  type_department: { id: 'td1', name: 'IT' },
  assignees: [{ userId: 'u1' }],
};

const makeForm = (overrides: Record<string, any> = {}) => ({
  id: 'f1',
  formNumber: 'AF-0001',
  status: 'Pending',
  created_at: '2024-01-01',
  user: { id: 'u1', first_name: 'John', last_name: 'Doe', email: 'j@t.com' },
  assets: [tangible, intangible],
  ...overrides,
});

describe('isIntangibleAssetLike', () => {
  it('detects intangibles by category', () => {
    expect(isIntangibleAssetLike(intangible)).toBe(true);
    expect(isIntangibleAssetLike(tangible)).toBe(false);
  });

  it('detects resolved intangibles by type_department / risk_level', () => {
    expect(isIntangibleAssetLike({ id: 'x', risk_level: { id: 'r' } })).toBe(true);
    expect(isIntangibleAssetLike({ id: 'x', type_department: { id: 'td' } })).toBe(true);
    expect(isIntangibleAssetLike({ id: 'x', name: 'Plain' })).toBe(false);
  });
});

describe('fetchAssignedIntangibleAssetsForForm', () => {
  it('returns only embedded intangibles from the form snapshot', () => {
    const result = fetchAssignedIntangibleAssetsForForm(makeForm());
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('i1');
  });

  it('returns an empty array when the form has no assets', () => {
    expect(fetchAssignedIntangibleAssetsForForm(makeForm({ assets: [] }))).toEqual([]);
  });
});

describe('getFormAssignedIntangibleAssets', () => {
  it('matches intangibles assigned to the form user via assignees', () => {
    const list = [resolvedIntangible, { ...resolvedIntangible, id: 'i3', assignees: [{ userId: 'u9' }] }];
    const result = getFormAssignedIntangibleAssets(list, makeForm());
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('i2');
  });

  it('matches userID camelCase variant', () => {
    const list = [{ ...resolvedIntangible, assignees: [{ userID: 'u1' }] }];
    expect(getFormAssignedIntangibleAssets(list, makeForm())).toHaveLength(1);
  });

  it('ignores assets without assignees', () => {
    const list = [{ ...resolvedIntangible, assignees: [] }];
    expect(getFormAssignedIntangibleAssets(list, makeForm())).toEqual([]);
  });
});

describe('getFormDisplayAssets', () => {
  it('merges embedded assets with resolved assigned intangibles', () => {
    const result = getFormDisplayAssets(makeForm(), [resolvedIntangible]);
    expect(result.map(a => a.id)).toEqual(['t1', 'i1', 'i2']);
  });

  it('dedupes assets that already exist in the embedded list', () => {
    const embedded = [{ ...resolvedIntangible, category: 'Intangible' }];
    const result = getFormDisplayAssets(makeForm({ assets: [tangible, embedded[0]] }), [embedded[0]]);
    expect(result.map(a => a.id)).toEqual(['t1', 'i2']);
  });
});

describe('splitDisplayAssets', () => {
  it('splits display assets into tangible and intangible groups', () => {
    const { tangible: tang, intangible: intang } = splitDisplayAssets([
      tangible,
      intangible,
      resolvedIntangible,
    ]);
    expect(tang.map(a => a.id)).toEqual(['t1']);
    expect(intang.map(a => a.id)).toEqual(['i1', 'i2']);
  });
});

describe('mergeAssetsById', () => {
  it('unions asset lists by id, skipping duplicates', () => {
    const result = mergeAssetsById([intangible, resolvedIntangible], [resolvedIntangible, tangible]);
    expect(result.map(a => a.id)).toEqual(['i1', 'i2', 't1']);
  });

  it('skips entries without an id', () => {
    expect(mergeAssetsById([intangible, { name: 'NoId' }])).toHaveLength(1);
  });
});