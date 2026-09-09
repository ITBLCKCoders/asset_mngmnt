import { describe, it, expect, beforeEach } from 'vitest';
import {
  chartVariantStorageKey,
  isDashboardChartVariant,
  loadChartVariant,
  saveChartVariant,
} from '@/pages/dashboard/components/dashboardChartPrefs';

describe('dashboardChartPrefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should persist the cards variant and load it back', () => {
    expect(isDashboardChartVariant('cards')).toBe(true);

    saveChartVariant('assetByType', 'cards');
    expect(localStorage.getItem(chartVariantStorageKey('assetByType'))).toBe(
      'cards'
    );
    expect(loadChartVariant('assetByType', 'area')).toBe('cards');
  });

  it('should fall back to the default when nothing is saved', () => {
    expect(loadChartVariant('assetByType', 'cards')).toBe('cards');
  });
});
