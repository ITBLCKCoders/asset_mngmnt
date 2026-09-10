import { describe, it, expect } from 'vitest';
import type { AccountabilityForm } from "../../pages/assets/accountability/accountabilityFormTypes";
import {
  isIntangibleAssetLike,
  fetchAssignedIntangibleAssetsForForm,
  getFormAssignedIntangibleAssets,
  getFormDisplayAssets,
  getAssetDisplayScope,
  getFormScopes,
  intangibleMatchesFormScope,
  splitDisplayAssets,
  mergeAssetsById,
  getEmbeddedIntangibleIds,
} from "../../pages/assets/accountability/accountabilityFormAssets";

const tangible = {
  id: 't1',
  code: 'AST-001',
  category: 'Hardware',
  name: 'Laptop',
  type: 'Computer',
  serialNo: 'SN1',
};
const intangible = {
  id: 'i1',
  code: 'INT-001',
  category: 'Intangible',
  name: 'Software License',
  type: 'Software',
  serialNo: '',
};
const resolvedIntangible = {
  id: 'i2',
  code: 'INT-002',
  name: 'Domain',
  category: 'Intangible',
  type: 'Domain',
  serialNo: '',
  risk_level: { id: 'rl1', name: 'Medium' },
  description: 'Company domain',
  type_department: { id: 'td1', name: 'IT' },
  assignees: [{ userId: 'u1' }],
};

const makeForm = (overrides: Record<string, any> = {}): AccountabilityForm => ({
  id: 'f1',
  formNumber: 'AF-0001',
  status: 'Pending',
  created_at: '2024-01-01',
  user: { id: 'u1', first_name: 'John', last_name: 'Doe', email: 'j@t.com' },
  department: { id: 'd1', name: 'IT Department' },
  assets: [tangible, intangible],
  assignment: { id: 'as1', assigned_date: '2024-01-01' },
  ...overrides,
});

const adminForm = () =>
  makeForm({
    department: { id: 'd2', name: 'Administration Department' },
    assets: [
      { id: 'a1', code: 'ADM-001', category: 'Furniture', name: 'Chair', type: 'Sofa', serialNo: '' },
    ],
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

describe('getAssetDisplayScope', () => {
  it('classifies an intangible as Admin when its type department is Administration', () => {
    const asset = {
      id: 'i1',
      category: 'Intangible',
      type_department: { id: 'td', name: 'Administration' },
    };
    expect(getAssetDisplayScope(asset, makeForm())).toBe('Admin');
  });

  it('classifies an intangible as Admin when its type department is Admin', () => {
    const asset = {
      id: 'i1',
      category: 'Intangible',
      type_department: { name: 'Admin' },
    };
    expect(getAssetDisplayScope(asset, makeForm())).toBe('Admin');
  });

  it('classifies an intangible as IT when its type department is IT', () => {
    const asset = {
      id: 'i1',
      category: 'Intangible',
      type_department: { name: 'IT' },
    };
    expect(getAssetDisplayScope(asset, makeForm())).toBe('IT');
  });

  it('classifies an intangible as IT when its type has no department', () => {
    const asset = { id: 'i1', category: 'Intangible', type: 'Software' };
    expect(getAssetDisplayScope(asset, makeForm())).toBe('IT');
  });

  it('ignores the assignment department for intangibles', () => {
    const asset = {
      id: 'i1',
      category: 'Intangible',
      department: 'Admin',
      type: 'Software',
    };
    expect(getAssetDisplayScope(asset, makeForm())).toBe('IT');
  });

  it('ignores a type name containing admin for intangibles without a type department', () => {
    const asset = { id: 'i1', category: 'Intangible', type: 'Admin Support Tool' };
    expect(getAssetDisplayScope(asset, makeForm())).toBe('IT');
  });

  it('accepts a flat string type department', () => {
    const asset = { id: 'i1', category: 'Intangible', type_department: 'Admin' };
    expect(getAssetDisplayScope(asset, makeForm())).toBe('Admin');
  });

  it('classifies tangible assets by category department', () => {
    expect(
      getAssetDisplayScope(
        { id: 't1', category: 'Hardware', categoryDepartment: 'Admin' },
        makeForm()
      )
    ).toBe('Admin');
    expect(
      getAssetDisplayScope(
        { id: 't2', category: 'Hardware', categoryDepartment: 'IT' },
        makeForm()
      )
    ).toBe('IT');
  });

  it('falls back to the form department for tangible assets without a category department', () => {
    const form = makeForm({ department: { id: 'd1', name: 'Administration' } });
    expect(getAssetDisplayScope({ id: 't1', category: 'Hardware' }, form)).toBe(
      'Admin'
    );
  });
});

describe('getFormDisplayAssets type_department gap-fill', () => {
  it('fills type_department from the resolved intangible when the embedded snapshot lacks it', () => {
    const embeddedIntangible = {
      id: 'i2',
      code: 'INT-002',
      name: 'Domain',
      category: 'Intangible',
      department: 'Admin',
    };
    const resolved = {
      id: 'i2',
      code: 'INT-002',
      name: 'Domain',
      category: 'Intangible',
      type_department: { id: 'td1', name: 'IT' },
    };
    const form = makeForm({ assets: [tangible, embeddedIntangible] });
    const result = getFormDisplayAssets(form, [resolved]);
    const merged = result.find(a => a.id === 'i2');
    expect(merged?.type_department).toEqual({ id: 'td1', name: 'IT' });
  });
});

describe('getFormScopes', () => {
  it('derives the Admin scope from Administration tangibles', () => {
    const scopes = getFormScopes(adminForm());
    expect([...scopes]).toEqual(['Admin']);
  });

  it('derives the IT scope from IT tangibles', () => {
    const scopes = getFormScopes(
      makeForm({
        assets: [
          { id: 'a1', code: 'IT-001', category: 'Computer', name: 'Laptop', type: 'Computer', serialNo: 'SN' },
        ],
      })
    );
    expect([...scopes]).toEqual(['IT']);
  });

  it('ignores embedded intangibles when deriving the form scope', () => {
    const form = makeForm({ department: undefined, assets: [intangible] });
    expect(getFormScopes(form).size).toBe(0);
  });

  it('falls back to the form department when there are no tangibles', () => {
    expect([...getFormScopes(makeForm({ assets: [] }))]).toEqual(['IT']);
  });
});

describe('intangibleMatchesFormScope', () => {
  const itIntangible = {
    id: 'i1',
    category: 'Intangible',
    type_department: { id: 'td', name: 'IT' },
  };
  const adminIntangible = {
    id: 'i1',
    category: 'Intangible',
    type_department: { id: 'td', name: 'Administration' },
  };

  it('excludes IT intangibles from an Admin form', () => {
    expect(intangibleMatchesFormScope(itIntangible, adminForm())).toBe(false);
  });

  it('includes IT intangibles on an IT form', () => {
    expect(intangibleMatchesFormScope(itIntangible, makeForm())).toBe(true);
  });

  it('includes Admin intangibles on an Admin form', () => {
    expect(intangibleMatchesFormScope(adminIntangible, adminForm())).toBe(true);
  });

  it('excludes Admin intangibles from an IT form', () => {
    expect(intangibleMatchesFormScope(adminIntangible, makeForm())).toBe(false);
  });
});

describe('getFormAssignedIntangibleAssets form-scope filter', () => {
  const itIntangible = {
    id: 'i10',
    code: 'INT-010',
    name: 'HR NAS',
    category: 'Intangible',
    type_department: { id: 'td', name: 'IT' },
    assignees: [{ userId: 'u1' }],
  };
  const adminIntangible = {
    id: 'i11',
    code: 'INT-011',
    name: 'Lease',
    category: 'Intangible',
    type_department: { id: 'td', name: 'Administration' },
    assignees: [{ userId: 'u1' }],
  };

  it('excludes IT intangibles assigned to the user from an Admin form', () => {
    const result = getFormAssignedIntangibleAssets(
      [itIntangible, adminIntangible],
      adminForm()
    );
    expect(result.map(a => a.id)).toEqual(['i11']);
  });

  it('includes IT intangibles on an IT form and excludes Admin intangibles', () => {
    const result = getFormAssignedIntangibleAssets(
      [itIntangible, adminIntangible],
      makeForm()
    );
    expect(result.map(a => a.id)).toEqual(['i10']);
  });
});

describe('getFormDisplayAssets form-scope filter', () => {
  it('drops IT intangibles from an Admin form (regression: 005-103-6012-062026-0037)', () => {
    const itIntangible = {
      id: 'i2',
      code: 'INT-002',
      name: 'HR NAS / Shared Drive Ownership',
      category: 'Intangible',
      type_department: { id: 'td', name: 'IT' },
    };
    const result = getFormDisplayAssets(adminForm(), [itIntangible]);
    expect(result.map(a => a.id)).toEqual(['a1']);
  });

  it('keeps IT intangibles on an IT form', () => {
    const itIntangible = {
      id: 'i2',
      code: 'INT-002',
      name: 'Domain',
      category: 'Intangible',
      type_department: { id: 'td', name: 'IT' },
    };
    const form = makeForm({
      assets: [
        { id: 'a1', code: 'IT-001', category: 'Computer', name: 'Laptop', type: 'Computer', serialNo: 'SN' },
      ],
    });
    const result = getFormDisplayAssets(form, [itIntangible]);
    expect(result.map(a => a.id)).toEqual(['a1', 'i2']);
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

describe('getEmbeddedIntangibleIds', () => {
  it('returns ids of embedded intangible assets', () => {
    const form = makeForm();
    expect(getEmbeddedIntangibleIds(form)).toEqual(new Set(['i1']));
  });

  it('returns an empty set when the form has no intangibles', () => {
    expect(getEmbeddedIntangibleIds(makeForm({ assets: [tangible] }))).toEqual(new Set());
  });
});

describe('getFormDisplayAssets replacement-form defense', () => {
  const deadFetchedIntangible = {
    id: 'i-dead',
    code: 'INT-DEAD',
    name: 'Deactivated Domain',
    category: 'Intangible',
    type: 'Domain',
    serialNo: '',
    risk_level: { id: 'rl1', name: 'Medium' },
    description: 'Was deactivated',
    type_department: { id: 'td1', name: 'IT' },
    assignees: [{ userId: 'u1' }],
  };

  const aliveFetchedIntangible = {
    id: 'i-alive',
    code: 'INT-ALIVE',
    name: 'Live Software',
    category: 'Intangible',
    type: 'Software',
    serialNo: '',
    risk_level: { id: 'rl2', name: 'Low' },
    description: 'Still active',
    type_department: { id: 'td1', name: 'IT' },
    assignees: [{ userId: 'u1' }],
  };

  it('excludes fetched intangibles not in the snapshot when the form is a replacement', () => {
    const form = makeForm({
      assets: [tangible, { id: 'i-alive', category: 'Intangible', name: 'Live Software' }],
      previous_form_original_status: 'Pending',
    });
    const result = getFormDisplayAssets(form, [deadFetchedIntangible, aliveFetchedIntangible]);
    expect(result.map(a => a.id)).toEqual(['t1', 'i-alive']);
    expect(result.find(a => a.id === 'i-dead')).toBeUndefined();
  });

  it('merges fetched intangibles normally when the form is NOT a replacement', () => {
    const form = makeForm({
      assets: [tangible],
    });
    const result = getFormDisplayAssets(form, [aliveFetchedIntangible]);
    expect(result.map(a => a.id)).toEqual(['t1', 'i-alive']);
  });

  it('still dedups when a fetched id matches an embedded id on a replacement form', () => {
    const embedded = { id: 'i-shared', category: 'Intangible', name: 'Shared' };
    const fetched = { ...embedded, type_department: { name: 'IT' } };
    const form = makeForm({
      assets: [tangible, embedded],
      previous_form_original_status: 'Pending',
    });
    const result = getFormDisplayAssets(form, [fetched]);
    const merged = result.find(a => a.id === 'i-shared');
    expect(merged?.type_department).toEqual({ name: 'IT' });
    expect(result.map(a => a.id)).toEqual(['t1', 'i-shared']);
  });
});