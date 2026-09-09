# Plan: Asset by Type — add chart variant toggle to the Breakdown by type card

**Goal:** Let the "Asset by Type" dashboard card switch between the existing card grid and chart variants (bar, pie, radar, radial, area), matching the behavior of every other dashboard chart card.

**Current context / assumptions:**
- The card lives in `client/src/pages/dashboard/dashboard.tsx` at lines 1057-1071 and renders `<AssetByTypeCards data={dashboardData?.assetByType ?? []} />` with no variant switcher.
- Every other dashboard chart already uses `DashboardChartShell` + `DashboardMultiSeriesChart` with a persisted `chartId` (see `dashboardChartPrefs.ts`).
- `assetByType` data shape is `AssetByTypeItem[]` = `{ typeName, typeId, typeCode?, total, inUse }[]`. Backend already returns it; no API change is needed.
- `recharts` is installed. `DashboardMultiSeriesChart` already handles area/bar/pie/radar/radial. `buildDashboardChartConfig` builds the `ChartConfig` from a list of series.
- The card grid component `AssetByTypeCards` lives in `client/src/pages/dashboard/components/assetByTypeCards.tsx` and exports its own `AssetByTypeItem` interface, which duplicates the one in `dashboard.tsx:84-90`. That duplication is a pre-existing smell but out of scope for this task unless we touch the interface — we won't.

**Architecture / proposed approach:**
- Replace the standalone `<AssetByTypeCards>` block with a `<DashboardChartShell>` wrapping a `children(variant)` function.
- Default variant: `area` (matches existing default in `DashboardChartShell`). When the user has no saved preference, they see the card grid (rendered by `AssetByTypeCards`) — this preserves the current look for existing users.
- For non-`area` variants, render a `DashboardMultiSeriesChart` built from `assetByType` rows: one bar per type, two series (`In use`, `Available`), stacked for area/stacked-bar, plain for pie/radar/radial.
- Persist the chosen variant under `chartId="assetByType"` so the choice survives reloads.
- Remove the now-unused `<Card>`/`<CardHeader>` wrapper that was directly around `AssetByTypeCards`, since `DashboardChartShell` provides its own card + header + variant dropdown.

**Step-by-step tasks:**

## Task 1: Replace the Asset by Type section in `dashboard.tsx` with a chart shell

**File:** `client/src/pages/dashboard/dashboard.tsx`

**Before (lines 1057-1071):**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Asset by Type</CardTitle>
    <CardDescription>
      Breakdown by type — all types included
    </CardDescription>
  </CardHeader>
  <CardContent>
    {loading ? (
      <DashboardAssetTypeGridSkeleton />
    ) : (
      <AssetByTypeCards data={dashboardData?.assetByType ?? []} />
    )}
  </CardContent>
</Card>
```

**After:**
```tsx
<DashboardChartShell
  defaultTitle="Asset by Type"
  defaultDescription="Breakdown by type — all types included"
  defaultVariant="area"
  chartId="assetByType"
  empty={!dashboardData?.assetByType?.length}
  emptyMessage="No asset types"
>
  {loading ? (
    <DashboardAssetTypeGridSkeleton />
  ) : (variant) => {
    if (variant === 'area') {
      return <AssetByTypeCards data={dashboardData?.assetByType ?? []} />;
    }
    const rows = (dashboardData?.assetByType ?? []).map(t => ({
      name: t.typeName,
      full: t.typeName,
      inUse: t.inUse,
      available: Math.max(0, t.total - t.inUse),
    }));
    const series = [
      { key: 'inUse', label: 'In use' },
      { key: 'available', label: 'Available' },
    ] as const;
    const config = buildDashboardChartConfig([...series]);
    return (
      <DashboardMultiSeriesChart
        variant={variant}
        data={rows}
        indexKey="name"
        series={series}
        chartConfig={config}
        stacked={variant === 'area' || variant === 'bar'}
        className="h-[280px] w-full"
      />
    );
  }}
</DashboardChartShell>
```

**Notes:**
- You will need to import `buildDashboardChartConfig` and `DashboardMultiSeriesChart` from `./components/dashboardMultiSeriesChart` if they aren't already imported in this file. Check the top of `dashboard.tsx` for existing imports from that module; if `DashboardChartShell` is already imported, add the two missing names.
- `DashboardAssetTypeGridSkeleton` is already used in the old block; keep reusing it for the loading state — the shell's `children` is not called when `loading` is true in our ternary, so the skeleton renders inside the shell's card content correctly.
- If `DashboardChartShell` is NOT yet imported in `dashboard.tsx`, add:
  ```tsx
  import { DashboardChartShell } from './components/DashboardChartShell';
  ```
- Do NOT change the `AssetByTypeCards` component or the `AssetByTypeItem` interface in this task.

**Verification:**
1. Start dev server: `cd client && npm run dev` (or `npm run dev --workspace=client` from repo root).
2. Open the dashboard in a browser. The "Asset by Type" card should still show the card grid by default.
3. Open the variant dropdown (top-right of the card) and pick "Bar". The grid should be replaced by a stacked bar chart with one bar per type, split into In use / Available.
4. Reload the page — the chosen variant should persist (localStorage key `dashboard.chart.assetByType.variant`).
5. Switch back to "Area" — the card grid should reappear.

## Task 2: Pre-existing — no code change. (Optional) Remove duplicate `AssetByTypeItem` from `assetByTypeCards.tsx`

**File:** `client/src/pages/dashboard/components/assetByTypeCards.tsx`

**Why (optional, not required for the chart toggle to work):** `assetByTypeCards.tsx:6-12` redefines `AssetByTypeItem` that already exists in `dashboard.tsx:84-90`. If the project's lint/style favors a single source of truth, delete the local interface and re-export it from `dashboard.tsx` — but only if `AssetByTypeCards` is still imported by other files that rely on the local name. Otherwise leave it; this task's goal is the chart toggle, not the interface cleanup.

**Decision:** Skip this task unless the implementer has reason to believe another file imports `AssetByTypeItem` from `assetByTypeCards.tsx`. If unsure, grep for `import.*AssetByTypeItem.*assetByTypeCards` across the client; if nothing imports it, delete lines 6-12 and import the shared type from `../dashboard` instead. If something does import it, leave the duplicate as-is.

**Verification (if performed):**
- `cd client && npm run lint -- --max-warnings 0` (or the project's lint command) should pass.
- Existing dashboard tests / e2e should still pass.

## Task 3: No backend change. Confirm and note.

**Rationale:** `GET /api/dashboard` already returns `assetByType: AssetByTypeItem[]` with `total` and `inUse` per type. The chart needs exactly that. No route, service, or repository change is required.

**Verification:**
- `npm run test:unit --workspace=server` (or the project's server test command) should pass without modification.
- No new test is needed because behavior is unchanged on the server.

**Tests / validation (frontend, TDD-ish per task):**

For Task 1, the change is purely presentational wiring of existing components. The most useful verification is manual (Steps above). If the repo has component tests for the dashboard, add or update one test that:
- Renders the dashboard with mock `dashboardData.assetByType` = `[{ typeName: 'Laptop', typeId: 't1', total: 50, inUse: 30 }]`.
- Asserts the card grid shows "Laptop" and "50".
- Simulates selecting "Pie" from the variant dropdown.
- Asserts the pie chart is rendered (e.g. a `PieChart` or `Pie` element is in the DOM, or the `AssetByTypeCards` grid is absent).

If no such test exists, the manual verification above is sufficient for this task; do not spend time fabricating a test harness for a one-off presentational wire-up.

For Task 2 (optional interface cleanup), run the existing client + server tests and lint to confirm nothing breaks.

**Risks, tradeoffs, and open questions:**

- **Card grid disappears on non-area variants.** This is intentional — the card grid and the chart are mutually exclusive views of the same data, just like every other dashboard chart card. If the stakeholder wants the card grid to persist alongside the chart, that is a different feature (split view) and should be a follow-up.
- **Pie/radar/radial with two series.** `DashboardMultiSeriesChart` already renders pie with multiple `<Pie>` slices per series; radar/radial also support multiple series. The two-series setup (In use + Available) works for all variants. If the pie looks odd with two overlapping pies, that is a pre-existing `DashboardMultiSeriesChart` behavior, not introduced by this task.
- **Default variant choice.** We default to `area` and render the card grid for `area`. An alternative is to default to `bar` and skip the card grid entirely, but that would change the existing dashboard look for all users on first load. Keeping `area` → card grid preserves backward compatibility. If stakeholders want the chart as the default, change `defaultVariant` to `'bar'` and render the chart for `area` too (then the card grid becomes unreachable unless we add a dedicated `"cards"` pseudo-variant — out of scope).
- **`buildDashboardChartConfig` import.** Confirm it is exported from `dashboardMultiSeriesChart.ts`; the file clearly exports `buildDashboardChartConfig` (used in `dashboardAnalyticsCharts.tsx:67`). If for some reason it is not, add the export.
- **Skeleton inside shell.** The loading ternary renders `<DashboardAssetTypeGridSkeleton />` inside the shell's `children`, which is called only when `loading` is false in our code. Wait — re-examine: our `children` receives `variant` and is called by the shell; if we do `loading ? <Skeleton /> : (variant) => ...`, the skeleton is returned when loading, and the lambda otherwise. That is correct because the shell calls `children(variant)` and gets either the skeleton or the lambda — but the shell expects `children` to be a `(variant) => ReactNode` function, not a React node. **Correction:** `DashboardChartShell`'s `children` prop type is `(variant: DashboardChartVariant) => ReactNode`. If we pass a ternary that returns either a React node or a function, the shell will call it as a function only when loading is false — but when loading is true we return a node, and the shell will then try to call that node as a function → crash.

**Fix for that:** Do not return a skeleton from the `children` lambda. Instead, keep the loading check outside the shell's `children`, or return a skeleton-rendering function from the lambda. The cleanest fix that matches how other chart cards handle loading is to NOT pass `loading` into the shell at all, and let the shell show its own empty state while data loads. But the current dashboard already conditionally renders entire cards based on `loading` at the `dashboard.tsx` layout level — so the "Asset by Type" card is only rendered when `loading` is false in the surrounding page. That means inside the shell's `children` we always have data, and we don't need a skeleton at all for this card. **Revised After block:**

```tsx
<DashboardChartShell
  defaultTitle="Asset by Type"
  defaultDescription="Breakdown by type — all types included"
  defaultVariant="area"
  chartId="assetByType"
  empty={!dashboardData?.assetByType?.length}
  emptyMessage="No asset types"
>
  {(variant) => {
    if (variant === 'area') {
      return <AssetByTypeCards data={dashboardData?.assetByType ?? []} />;
    }
    const rows = (dashboardData?.assetByType ?? []).map(t => ({
      name: t.typeName,
      full: t.typeName,
      inUse: t.inUse,
      available: Math.max(0, t.total - t.inUse),
    }));
    const series = [
      { key: 'inUse', label: 'In use' },
      { key: 'available', label: 'Available' },
    ] as const;
    const config = buildDashboardChartConfig([...series]);
    return (
      <DashboardMultiSeriesChart
        variant={variant}
        data={rows}
        indexKey="name"
        series={series}
        chartConfig={config}
        stacked={variant === 'area' || variant === 'bar'}
        className="h-[280px] w-full"
      />
    );
  }}
</DashboardChartShell>
```

The surrounding `dashboard.tsx` already gates this whole card on `loading` (the parent layout only renders the chart grid when `loading` is false), so the skeleton is handled by the page-level skeleton, not by this card. Confirm by reading the surrounding code in `dashboard.tsx` around line 1057 — if the card is inside a `{loading ? ... : ...}` block, drop the skeleton from the shell's children. If it is NOT gated by loading at the layout level, then add `loading` handling inside the lambda by returning a skeleton component from the children function (the shell will call it each render).

- **Empty state.** The shell's `empty` prop drives the "No data for this view" message. We set `empty={!dashboardData?.assetByType?.length}` so an empty `assetByType` array shows that message instead of the card grid. That's consistent with other cards.
