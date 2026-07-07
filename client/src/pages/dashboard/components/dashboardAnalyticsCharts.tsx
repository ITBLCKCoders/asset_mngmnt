import { DashboardAnalyticsGridSkeleton } from '@/components/common/pageSkeletons';
import { DashboardChartShell } from './DashboardChartShell';
import {
  buildDashboardChartConfig,
  DashboardMultiSeriesChart,
} from './dashboardMultiSeriesChart';
import type {
  DashboardData,
  NamedCountItem,
  NamedValueItem,
} from '../dashboard';

function namedCountRows(items: NamedCountItem[]) {
  return items.map(d => ({
    name: d.name.length > 22 ? `${d.name.slice(0, 20)}…` : d.name,
    full: d.name,
    total: d.total,
  }));
}

function namedValueRows(items: NamedValueItem[]) {
  return items.map(d => ({
    name: d.name.length > 16 ? `${d.name.slice(0, 14)}…` : d.name,
    full: d.name,
    value: d.value,
  }));
}

export function DashboardAnalyticsCharts({
  loading,
  dashboardData,
  movementPeriod,
  variant = 'full',
}: {
  loading: boolean;
  dashboardData: DashboardData | null;
  movementPeriod: 'weekly' | 'monthly';
  variant?: 'full' | 'simplified';
}) {
  if (loading) {
    return <DashboardAnalyticsGridSkeleton />;
  }

  if (!dashboardData) return null;

  const movement = dashboardData.movement?.[movementPeriod] ?? [];
  const byType = dashboardData.assetByType ?? [];
  const dept = dashboardData.assetsByDepartment ?? [];
  const location = dashboardData.assetsByLocation ?? [];
  const categoryMix = dashboardData.categoryMix ?? [];
  const brandMix = dashboardData.brandMix ?? [];
  const aging = dashboardData.agingBuckets ?? [];
  const warranty = dashboardData.warrantyRunway ?? [];
  const pipeline = dashboardData.requestPipeline ?? [];

  const utilizationRows = byType.map(t => ({
    name:
      t.typeName.length > 18 ? `${t.typeName.slice(0, 16)}…` : t.typeName,
    inUse: t.inUse,
    idle: Math.max(0, t.total - t.inUse),
  }));

  const utilizationSeries = [
    { key: 'inUse', label: 'In use' },
    { key: 'idle', label: 'Not in use' },
  ] as const;
  const utilizationConfig = buildDashboardChartConfig([...utilizationSeries]);

  const pipelineRows = pipeline.map(r => ({
    stage:
      r.stage.length > 18 ? `${r.stage.slice(0, 16)}…` : r.stage,
    returnCount: r.returnCount,
    transferCount: r.transferCount,
    borrowCount: r.borrowCount ?? 0,
  }));
  const pipelineSeries = [
    { key: 'returnCount', label: 'Return forms' },
    { key: 'transferCount', label: 'Transfer forms' },
    { key: 'borrowCount', label: 'Borrow requests' },
  ] as const;
  const pipelineConfig = buildDashboardChartConfig([...pipelineSeries]);

  const deptRows = namedCountRows(dept);
  const locationRows = namedCountRows(location);
  const countSeries = [{ key: 'total', label: 'Assets' }] as const;
  const countConfig = buildDashboardChartConfig([...countSeries]);

  const categoryRows = namedValueRows(categoryMix);
  const brandRows = namedValueRows(brandMix);
  const agingRows = namedValueRows(aging);
  const warrantyRows = namedValueRows(warranty);
  const valueSeries = [{ key: 'value', label: 'Assets' }] as const;
  const valueConfig = buildDashboardChartConfig([...valueSeries]);

  const netRows = movement.map(d => ({
    label: d.label || d.period,
    newAssignments: d.newAssignments ?? 0,
    returned: d.returned ?? 0,
    borrowRequests: d.borrowRequests ?? 0,
  }));
  const netSeries = [
    { key: 'newAssignments', label: 'New assignments' },
    { key: 'returned', label: 'Returns completed' },
    { key: 'borrowRequests', label: 'Borrow requests' },
  ] as const;
  const netConfig = buildDashboardChartConfig([...netSeries]);

  const agingEmpty = !aging.length || !aging.some(a => a.value > 0);
  const warrantyEmpty =
    !warranty.length || !warranty.some(a => a.value > 0);

  const simplified = variant === 'simplified';

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold tracking-tight">Analytics</h2>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <DashboardChartShell
          defaultTitle="Utilization by type"
          defaultDescription="In use vs not in use, stacked by asset type"
          defaultVariant="area"
          empty={!byType.length}
        >
          {v => (
            <DashboardMultiSeriesChart
              variant={v}
              data={utilizationRows}
              indexKey="name"
              series={[...utilizationSeries]}
              chartConfig={utilizationConfig}
              stacked
              className="min-h-[300px] w-full"
            />
          )}
        </DashboardChartShell>

        <DashboardChartShell
          defaultTitle="Request pipeline"
          defaultDescription="Return, transfer, and borrow requests by workflow stage"
          defaultVariant="bar"
          empty={!pipeline.length}
        >
          {v => (
            <DashboardMultiSeriesChart
              variant={v}
              data={pipelineRows}
              indexKey="stage"
              series={[...pipelineSeries]}
              chartConfig={pipelineConfig}
              className="min-h-[300px] w-full"
            />
          )}
        </DashboardChartShell>

        <DashboardChartShell
          defaultTitle="Assets by department"
          defaultDescription="Top departments by asset count"
          defaultVariant="bar"
          empty={!dept.length}
        >
          {v => (
            <DashboardMultiSeriesChart
              variant={v}
              data={deptRows}
              indexKey="name"
              series={[...countSeries]}
              chartConfig={countConfig}
              barLayout="vertical"
              className="min-h-[280px] w-full"
            />
          )}
        </DashboardChartShell>

        <DashboardChartShell
          defaultTitle="Fleet age (purchase date)"
          defaultDescription="Age buckets from recorded purchase date"
          defaultVariant="bar"
          empty={agingEmpty}
        >
          {v => (
            <DashboardMultiSeriesChart
              variant={v}
              data={agingRows}
              indexKey="name"
              series={[...valueSeries]}
              chartConfig={valueConfig}
              className="min-h-[260px] w-full"
            />
          )}
        </DashboardChartShell>

        {simplified ? null : (
          <DashboardChartShell
            defaultTitle="Warranty runway"
            defaultDescription="Time to warranty end from purchase + warranty months"
            defaultVariant="bar"
            empty={warrantyEmpty}
          >
            {v => (
              <DashboardMultiSeriesChart
                variant={v}
                data={warrantyRows}
                indexKey="name"
                series={[...valueSeries]}
                chartConfig={valueConfig}
                className="min-h-[260px] w-full"
              />
            )}
          </DashboardChartShell>
        )}

        {simplified ? null : (
          <DashboardChartShell
            defaultTitle="Assets by location"
            defaultDescription="Top locations by asset count"
            defaultVariant="bar"
            empty={!location.length}
          >
            {v => (
              <DashboardMultiSeriesChart
                variant={v}
                data={locationRows}
                indexKey="name"
                series={[...countSeries]}
                chartConfig={countConfig}
                barLayout="vertical"
                className="min-h-[280px] w-full"
              />
            )}
          </DashboardChartShell>
        )}

        {simplified ? null : (
          <DashboardChartShell
            defaultTitle="Category mix"
            defaultDescription="Top categories by asset count"
            defaultVariant="bar"
            empty={!categoryMix.length}
          >
            {v => (
              <DashboardMultiSeriesChart
                variant={v}
                data={categoryRows}
                indexKey="name"
                series={[...valueSeries]}
                chartConfig={valueConfig}
                className="min-h-[260px] w-full"
              />
            )}
          </DashboardChartShell>
        )}

        {simplified ? null : (
          <DashboardChartShell
            defaultTitle="Brand mix"
            defaultDescription="Top brands by asset count"
            defaultVariant="bar"
            empty={!brandMix.length}
          >
            {v => (
              <DashboardMultiSeriesChart
                variant={v}
                data={brandRows}
                indexKey="name"
                series={[...valueSeries]}
                chartConfig={valueConfig}
                className="min-h-[260px] w-full"
              />
            )}
          </DashboardChartShell>
        )}

        {simplified ? null : (
          <DashboardChartShell
            defaultTitle="Assignment flow vs returns"
            defaultDescription="New assignments and returns completed in each period"
            defaultVariant="area"
            empty={!movement.length}
          >
            {v => (
              <DashboardMultiSeriesChart
                variant={v}
                data={netRows}
                indexKey="label"
                series={[...netSeries]}
                chartConfig={netConfig}
                className="min-h-[280px] w-full"
              />
            )}
          </DashboardChartShell>
        )}
      </div>
    </div>
  );
}
