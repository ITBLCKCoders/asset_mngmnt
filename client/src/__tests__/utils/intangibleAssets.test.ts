import { describe, it, expect } from 'vitest';
import {
  isIntangibleAssignedToUser,
  getIntangibleAssigneeCount,
} from '@/utils/intangibleAssets';

describe('intangibleAssets utils', () => {
  it('detects assignment via assignees array', () => {
    const asset = {
      id: 'ia-1',
      assignees: [{ userId: 'u-1', firstName: 'Jane', lastName: 'Doe' }],
    };
    expect(isIntangibleAssignedToUser(asset, 'u-1')).toBe(true);
    expect(isIntangibleAssignedToUser(asset, 'u-2')).toBe(false);
  });

  it('falls back to legacy assigned_to field', () => {
    const asset = { id: 'ia-1', assigned_to: 'u-1' };
    expect(isIntangibleAssignedToUser(asset, 'u-1')).toBe(true);
  });

  it('counts assignees from array or legacy field', () => {
    expect(
      getIntangibleAssigneeCount({
        id: 'ia-1',
        assignees: [{ userId: 'u-1' }, { userId: 'u-2' }],
      })
    ).toBe(2);
    expect(getIntangibleAssigneeCount({ id: 'ia-1', assigned_to: 'u-1' })).toBe(1);
    expect(getIntangibleAssigneeCount({ id: 'ia-1' })).toBe(0);
  });
});
