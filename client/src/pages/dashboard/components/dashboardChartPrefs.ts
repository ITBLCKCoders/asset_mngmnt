const PREFIX = 'dashboard.chart';

export type DashboardChartVariant =
  | 'area'
  | 'bar'
  | 'pie'
  | 'radar'
  | 'radial';

export function chartVariantStorageKey(chartId: string): string {
  return `${PREFIX}.${chartId}.variant`;
}

export function chartTitleStorageKey(chartId: string): string {
  return `${PREFIX}.${chartId}.title`;
}

const VALID: DashboardChartVariant[] = [
  'area',
  'bar',
  'pie',
  'radar',
  'radial',
];

export function isDashboardChartVariant(v: string): v is DashboardChartVariant {
  return VALID.includes(v as DashboardChartVariant);
}

export function loadChartVariant(
  chartId: string,
  fallback: DashboardChartVariant
): DashboardChartVariant {
  try {
    const raw = localStorage.getItem(chartVariantStorageKey(chartId));
    if (raw && isDashboardChartVariant(raw)) return raw;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function saveChartVariant(
  chartId: string,
  variant: DashboardChartVariant
): void {
  try {
    localStorage.setItem(chartVariantStorageKey(chartId), variant);
  } catch {
    /* ignore */
  }
}

export function loadChartTitle(chartId: string): string | null {
  try {
    const t = localStorage.getItem(chartTitleStorageKey(chartId));
    if (t == null || t === '') return null;
    return t;
  } catch {
    return null;
  }
}

export function saveChartTitle(chartId: string, title: string | null): void {
  try {
    if (title == null || title.trim() === '') {
      localStorage.removeItem(chartTitleStorageKey(chartId));
    } else {
      localStorage.setItem(chartTitleStorageKey(chartId), title.trim());
    }
  } catch {
    /* ignore */
  }
}
