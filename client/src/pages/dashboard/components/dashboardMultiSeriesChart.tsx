'use client';

import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { DashboardChartVariant } from './dashboardChartPrefs';

const SLICE_FILLS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export type DashboardSeriesDef = {
  key: string;
  label: string;
};

type DashboardMultiSeriesChartProps = {
  data: Record<string, string | number>[];
  indexKey: string;
  series: DashboardSeriesDef[];
  chartConfig: ChartConfig;
  variant: DashboardChartVariant;
  stacked?: boolean;
  className?: string;
  barLayout?: 'horizontal' | 'vertical';
  maxRadarPoints?: number;
  rowFills?: string[];
};

function rowNum(row: Record<string, string | number>, key: string): number {
  const v = row[key];
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function DashboardMultiSeriesChart({
  data,
  indexKey,
  series,
  chartConfig,
  variant,
  stacked = false,
  className = 'min-h-[280px] w-full',
  barLayout = 'horizontal',
  maxRadarPoints = 10,
  rowFills,
}: DashboardMultiSeriesChartProps) {
  if (!data.length || !series.length) {
    return null;
  }

  const stackId = stacked ? 'stack' : undefined;

  if (variant === 'area') {
    return (
      <motion.div
        key="area"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <ChartContainer config={chartConfig} className={className}>
          <AreaChart
            data={data}
            margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey={indexKey}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              width={36}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {series.map(s => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stackId={stackId}
                stroke={`var(--color-${s.key})`}
                fill={`var(--color-${s.key})`}
                fillOpacity={stacked ? 0.65 : 0.35}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </motion.div>
    );
  }

  if (variant === 'bar') {
    if (barLayout === 'vertical') {
      return (
        <motion.div
          key="bar-vertical"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <ChartContainer config={chartConfig} className={className}>
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey={indexKey}
                width={108}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {series.map(s => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  stackId={stackId}
                  fill={`var(--color-${s.key})`}
                  radius={[0, 4, 4, 0]}
                >
                  {rowFills &&
                  rowFills.length === data.length &&
                  series.length === 1 &&
                  series[0]?.key === s.key
                    ? rowFills.map((fill, i) => (
                        <Cell key={i} fill={fill} stroke="transparent" />
                      ))
                    : null}
                </Bar>
              ))}
            </BarChart>
          </ChartContainer>
        </motion.div>
      );
    }

    return (
      <motion.div
        key="bar-horizontal"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <ChartContainer config={chartConfig} className={className}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, left: 4, bottom: 48 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey={indexKey}
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-24}
              textAnchor="end"
              height={56}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              width={32}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {series.map(s => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId={stackId}
                fill={`var(--color-${s.key})`}
                radius={[4, 4, 0, 0]}
              >
                {rowFills &&
                rowFills.length === data.length &&
                series.length === 1 &&
                series[0]?.key === s.key
                  ? rowFills.map((fill, i) => (
                      <Cell key={i} fill={fill} stroke="transparent" />
                    ))
                  : null}
              </Bar>
            ))}
          </BarChart>
        </ChartContainer>
      </motion.div>
    );
  }

  if (variant === 'pie') {
    if (series.length > 1) {
      const pieData = series.map(s => ({
        name: s.label,
        key: s.key,
        value: data.reduce((acc, row) => acc + rowNum(row, s.key), 0),
      }));
      return (
        <motion.div
          key="pie-multi"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <ChartContainer config={chartConfig} className={className}>
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={88}
                paddingAngle={2}
              >
                {pieData.map(entry => (
                  <Cell
                    key={entry.key}
                    fill={`var(--color-${entry.key})`}
                    stroke="transparent"
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </motion.div>
      );
    }

    const sk = series[0]!.key;
    const pieSlices = data.map((row, i) => ({
      name: String(row[indexKey] ?? ''),
      value: rowNum(row, sk),
      fill:
        rowFills && rowFills[i]
          ? rowFills[i]!
          : SLICE_FILLS[i % SLICE_FILLS.length]!,
    }));

    const pieConfig = chartConfig;

    return (
      <motion.div
        key="pie-single"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <ChartContainer config={pieConfig} className={className}>
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Pie
              data={pieSlices}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={88}
              paddingAngle={2}
            >
              {pieSlices.map((entry, i) => (
                <Cell
                  key={`${entry.name}-${i}`}
                  fill={entry.fill}
                  stroke="transparent"
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </motion.div>
    );
  }

  if (variant === 'radar') {
    const tail = data.slice(-maxRadarPoints);
    const radarRows = tail.map(row => {
      const out: Record<string, string | number> = {
        subject:
          String(row[indexKey] ?? '').length > 14
            ? `${String(row[indexKey]).slice(0, 12)}…`
            : String(row[indexKey] ?? ''),
      };
      for (const s of series) {
        out[s.key] = rowNum(row, s.key);
      }
      return out;
    });

    return (
      <motion.div
        key="radar"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <ChartContainer config={chartConfig} className={className}>
          <RadarChart
            data={radarRows}
            margin={{ top: 16, right: 24, bottom: 16, left: 24 }}
          >
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 'auto']}
              tick={{ fontSize: 9 }}
            />
            {series.map(s => (
              <Radar
                key={s.key}
                name={s.label}
                dataKey={s.key}
                stroke={`var(--color-${s.key})`}
                fill={`var(--color-${s.key})`}
                fillOpacity={0.35}
                strokeWidth={2}
                dot={{ r: 4, fill: `var(--color-${s.key})` }}
              />
            ))}
          </RadarChart>
        </ChartContainer>
      </motion.div>
    );
  }

  if (variant === 'radial') {
    let radialData: { name: string; value: number; fill: string }[];

    if (series.length > 1) {
      radialData = series.map(s => ({
        name: s.label,
        value: data.reduce((acc, row) => acc + rowNum(row, s.key), 0),
        fill: `var(--color-${s.key})`,
      }));
    } else {
      const sk = series[0]!.key;
      radialData = data.map((row, i) => ({
        name: String(row[indexKey] ?? ''),
        value: rowNum(row, sk),
        fill:
          rowFills && rowFills[i]
            ? rowFills[i]!
            : SLICE_FILLS[i % SLICE_FILLS.length]!,
      }));
    }

    return (
      <motion.div
        key="radial"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <ChartContainer config={chartConfig} className={className}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="18%"
            outerRadius="88%"
            data={radialData}
            startAngle={90}
            endAngle={-270}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <PolarAngleAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 9 }}
              tickLine={false}
            />
            <RadialBar
              dataKey="value"
              background
              cornerRadius={4}
              label={{
                position: 'insideStart',
                fill: '#f8fafc',
                fontSize: 10,
              }}
            />
          </RadialBarChart>
        </ChartContainer>
      </motion.div>
    );
  }

  return null;
}

export function buildDashboardChartConfig(
  series: DashboardSeriesDef[]
): ChartConfig {
  const colors = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
  ];
  const config: ChartConfig = {};
  series.forEach((s, i) => {
    config[s.key] = {
      label: s.label,
      color: colors[i % colors.length],
    };
  });
  return config;
}
