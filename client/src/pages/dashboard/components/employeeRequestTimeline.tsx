import { DashboardChartShell } from './DashboardChartShell';
import {
  buildDashboardChartConfig,
  DashboardMultiSeriesChart,
} from './dashboardMultiSeriesChart';

export default function EmployeeRequestTimeline({
  data,
  loading,
}: {
  data: Array<{ label: string; requests: number }>;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="h-[280px] bg-muted rounded-lg animate-pulse" />
    );
  }

  const series = [{ key: 'requests', label: 'Requests' }] as const;
  const config = buildDashboardChartConfig([...series]);

  return (
    <DashboardChartShell
      defaultTitle="My Request Timeline"
      defaultDescription="Asset and borrowing requests over recent weeks"
      defaultVariant="area"
      chartId="myRequestTimeline"
      empty={!data.length}
      emptyMessage="No request activity"
    >
      {v => (
        <DashboardMultiSeriesChart
          variant={v}
          data={data as Array<Record<string, string | number>>}
          indexKey="label"
          series={[...series]}
          chartConfig={config}
          className="h-[280px] w-full"
        />
      )}
    </DashboardChartShell>
  );
}
