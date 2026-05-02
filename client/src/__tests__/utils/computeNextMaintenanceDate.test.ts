import { describe, it, expect } from 'vitest';
import { computeNextMaintenanceDate } from '@/utils/computeNextMaintenanceDate';
import { mapApiMaintenanceScheduleToForm } from '@/pages/assets/assets-list/assetsComponents/assetTypes/assetFormTypes';

describe('computeNextMaintenanceDate', () => {
  it('returns null for None and As Needed', () => {
    const anchor = { createdAt: new Date('2020-01-01') };
    expect(
      computeNextMaintenanceDate('None', anchor, new Date('2026-06-01'))
    ).toBeNull();
    expect(
      computeNextMaintenanceDate('As Needed', anchor, new Date('2026-06-01'))
    ).toBeNull();
  });

  it('returns null when no anchor dates', () => {
    expect(
      computeNextMaintenanceDate('Monthly', {}, new Date('2026-06-01'))
    ).toBeNull();
  });

  it('returns anchor when anchor is after today', () => {
    const now = new Date(2026, 0, 15);
    const purchaseDate = new Date(2026, 11, 1);
    const next = computeNextMaintenanceDate('Monthly', { purchaseDate }, now);
    expect(next).not.toBeNull();
    expect(next!.getFullYear()).toBe(2026);
    expect(next!.getMonth()).toBe(11);
    expect(next!.getDate()).toBe(1);
  });

  it('advances annual schedule until on or after today', () => {
    const now = new Date(2026, 5, 15, 12, 0, 0);
    const purchaseDate = new Date(2024, 5, 10);
    const next = computeNextMaintenanceDate('Annually', { purchaseDate }, now);
    expect(next).not.toBeNull();
    expect(next!.getFullYear()).toBe(2027);
    expect(next!.getMonth()).toBe(5);
    expect(next!.getDate()).toBe(10);
  });

  it('prefers lastMaintenanceDate over purchaseDate', () => {
    const now = new Date(2026, 2, 20);
    const next = computeNextMaintenanceDate(
      'Monthly',
      {
        lastMaintenanceDate: new Date(2026, 1, 10),
        purchaseDate: new Date(2020, 0, 1),
        createdAt: new Date(2019, 0, 1),
      },
      now
    );
    expect(next).not.toBeNull();
    expect(next!.getFullYear()).toBe(2026);
    expect(next!.getMonth()).toBe(3);
    expect(next!.getDate()).toBe(10);
  });
});

describe('mapApiMaintenanceScheduleToForm', () => {
  it('passes through canonical Annually from API', () => {
    expect(mapApiMaintenanceScheduleToForm('Annually')).toBe('Annually');
  });

  it('maps annually (lowercase) to Annually', () => {
    expect(mapApiMaintenanceScheduleToForm('annually')).toBe('Annually');
  });
});
