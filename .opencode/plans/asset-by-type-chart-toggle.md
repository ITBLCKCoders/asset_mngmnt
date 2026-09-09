# Plan: Asset by Type — switchable card/chart views on Dashboard

## Goal
Let the "Asset by Type" dashboard section ("Breakdown by type — all types included") switch between the existing card grid and chart views (area/bar/pie/radar/radial), persisted per user like the other dashboard charts.

User-confirmed choices:
- Variants offered: **All + Cards** (Cards, Area, Bar, Pie, Radar, Radial)
- Default view: **Cards** (preserves current look; chart is opt-in)

## Current state
- `dashboard.tsx:1057-1071` renders a plain `Card` with `AssetByTypeCards` (always card grid, no switcher).
- Infrastructure already exists:
  - `DashboardChartShell.tsx` — card wrapper + variant `<Select>` + localStorage persistence via `chartId`
  - `dashboardChartPrefs.ts` — `DashboardChartVariant` union (`area|bar|pie|radar|radial`), save/load helpers
  - `dashboardMultiSeriesChart.tsx` — `DashboardMultiSeriesChart` + `buildDashboardChartConfig`, supports stacked bars, vertical bar layout (`barLayout="vertical"`), `rowFills`
  - `DashboardAssetTypeGridSkeleton` in `pageSkeletons.tsx`
- Data shape: `dashboardData.assetByType: AssetByTypeItem[]` (`typeName`, `typeId`, `typeCode?`, `total`, `inUse`).

## Changes

### 1. `client/src/pages/dashboard/components/dashboardChartPrefs.ts`
- Add `'cards'` to the `DashboardChartVariant` union and to the `VALID` array so it round-trips through `saveChartVariant`/`loadChartVariant`.

### 2. `client/src/pages/dashboard/components/DashboardChartShell.tsx`
- Add `{ value: 'cards', label: 'Cards' }` to `VARIANT_OPTIONS`.
- Add optional prop `variantOptions?: DashboardChartVariant[]` (default: all 6) — filter `VARIANT_OPTIONS` by it, so existing charts that pass no options are unaffected. (Not strictly needed for this task but keeps the option list exact; if you prefer zero API change, skip this prop and just add the Cards option globally.)
- `children(variant)` signature already passes the variant through, so no other change is needed.

### 3. `client/src/pages/dashboard/dashboard.tsx` (block at lines 1057-1071 only)
Replace the plain `Card` with:

```tsx
<DashboardChartShell
  defaultTitle="Asset by Type"
  defaultDescription="Breakdown by type — all types included"
  defaultVariant="cards"
  chartId="assetByType"
  empty={!dashboardData?.assetByType?.length}
  emptyMessage="No asset types"
>
  {(variant) => {
    if (loading) {
      return <DashboardAssetTypeGridSkeleton />;
    }
    if (variant === 'cards') {
      return <AssetByTypeCards data={dashboardData?.assetByType ?? []} />;
    }
    const rows = (dashboardData?.assetByType ?? []).map(t => ({
      name: t.typeName.length > 18 ? `${t.typeName.slice(0, 16)}…` : t.typeName,
      full: t.typeName,
      inUse: t.inUse,
      available: Math.max(0, t.total - t.inUse),
    }));
    const series: { key: string; label: string }[] = [
      { key: 'inUse', label: 'In use' },
      { key: 'available', label: 'Available' },
    ];
    const config = buildDashboardChartConfig(series);
    return (
      <DashboardMultiSeriesChart
        variant={variant}
        data={rows}
        indexKey="name"
        series={series}
        chartConfig={config}
        stacked={variant === 'bar'}
        barLayout={variant === 'bar' ? 'vertical' : 'horizontal'}
        className="h-[280px] w-full"
      />
    );
  }}
</DashboardChartShell>
```

Notes:
- Keep the outer `loading` guard pattern consistent with the current block (skeleton while loading).
- Vertical bar layout for `bar` keeps long type names readable (same pattern as "Assets by department" in `dashboardAnalyticsCharts.tsx:171`).
- `name` truncation mirrors `namedCountRows` in `dashboardAnalyticsCharts.tsx:13-19`.
- `AssetByTypeCards`, `DashboardAssetTypeGridSkeleton`, `buildDashboardChartConfig`, `DashboardMultiSeriesChart` imports already exist in `dashboard.tsx`.

### 4. `client/src/__tests__/pages/dashboard/Dashboard.test.tsx`
- Extend the dashboard mock's `assetByType` with a sample item (e.g. `{ typeName: 'Laptop', typeId: 't1', total: 5, inUse: 3 }`) and switch the mock user role to Admin for a new test.
- Add test: renders "Asset by Type" title, the type card (e.g. "Laptop"), and the chart-type Select trigger (aria-label "Asset by Type chart type"); switching variant is covered implicitly by prefs round-trip.
- Optional unit test for `dashboardChartPrefs`: `saveChartVariant('x', 'cards')` then `loadChartVariant('x', 'area') === 'cards'`.

## Verification
- `npm run test:run --workspace=client` (existing + new dashboard tests)
- `npm run lint --workspace=client`
- Manual: open dashboard → Asset by Type shows cards by default → switch to Bar/Pie etc. → reload page → choice persists.

## Files to modify
- `client/src/pages/dashboard/components/dashboardChartPrefs.ts`
- `client/src/pages/dashboard/components/DashboardChartShell.tsx`
- `client/src/pages/dashboard/dashboard.tsx`
- `client/src/__tests__/pages/dashboard/Dashboard.test.tsx`
