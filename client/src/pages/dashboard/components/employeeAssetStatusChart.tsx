import { DashboardChartShell } from './DashboardChartShell';
import {
  buildDashboardChartConfig,
  DashboardMultiSeriesChart,
} from './dashboardMultiSeriesChart';

export default function EmployeeAssetStatusChart({
  data,
  loading,
}: {
  data: Array<{ name: string; value: number }>;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="h-[300px] bg-muted rounded-lg animate-pulse" />
    );
  }

  const series = [{ key: 'value', label: 'Assets' }] as const;
  const config = buildDashboardChartConfig([...series]);

  return (
    <DashboardChartShell
      defaultTitle="My Assets by Status"
      defaultDescription="Current status breakdown of assets assigned to you"
      defaultVariant="pie"
      empty={!data.length}
      emptyMessage="No assets assigned"
    >
      {v => (
        <DashboardMultiSeriesChart
          variant={v}
          data={data as Array<Record<string, string | number>>}
          indexKey="name"
          series={[...series]}
          chartConfig={config}
          className="min-h-[280px] w-full"
        />
      )}
    </DashboardChartShell>
  );
}
