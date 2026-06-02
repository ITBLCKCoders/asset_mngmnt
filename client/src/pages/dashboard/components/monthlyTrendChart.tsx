'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type TrendTooltipPayload = {
  dataKey?: string | number;
  name?: string;
  value?: number;
  color?: string;
};

type TrendTooltipProps = {
  active?: boolean;
  payload?: TrendTooltipPayload[];
  label?: string;
};

const ASSIGNED_COLOR = 'hsl(221, 83%, 53%)'; // blue-600
const RETURNED_COLOR = 'hsl(160, 84%, 39%)'; // emerald-600
const AVAILABLE_COLOR = 'hsl(262, 83%, 58%)'; // violet-500
const TRANSFER_COLOR = 'hsl(25, 95%, 53%)'; // orange-500
const REPAIR_COLOR = 'hsl(0, 84%, 60%)'; // red-500

function CustomTooltip({ active, payload, label }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: TrendTooltipPayload) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MonthlyTrendChart({ data }: { data: any[] }) {
  const [isClient, setIsClient] = useState(false);
  const [chartError, setChartError] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !data || data.length === 0) {
    return (
      <div className="h-72 w-full flex items-center justify-center rounded-lg border border-border/50 bg-muted/30">
        <p className="text-sm text-muted-foreground">No movement data</p>
      </div>
    );
  }

  if (chartError) {
    return (
      <div className="h-72 w-full flex items-center justify-center rounded-lg border border-border/50 bg-muted/30">
        <p className="text-sm text-destructive">Chart failed to load</p>
      </div>
    );
  }

  return (
    <motion.div
      className="h-72 w-full min-h-[260px] rounded-lg border border-border/50 bg-card/50 p-3 sm:p-4"
      style={{ minHeight: '288px' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 12, right: 8, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            width={24}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '8px' }}
            formatter={value => (
              <span className="text-sm text-muted-foreground">{value}</span>
            )}
            iconType="circle"
            iconSize={8}
          />
          <Line
            type="monotone"
            dataKey="assigned"
            stroke={ASSIGNED_COLOR}
            strokeWidth={2.5}
            dot={{ fill: ASSIGNED_COLOR, r: 4, strokeWidth: 0 }}
            activeDot={{
              r: 6,
              fill: ASSIGNED_COLOR,
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
            name="Assigned"
          />
          <Line
            type="monotone"
            dataKey="returned"
            stroke={RETURNED_COLOR}
            strokeWidth={2.5}
            dot={{ fill: RETURNED_COLOR, r: 4, strokeWidth: 0 }}
            activeDot={{
              r: 6,
              fill: RETURNED_COLOR,
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
            name="Returned"
          />
          <Line
            type="monotone"
            dataKey="available"
            stroke={AVAILABLE_COLOR}
            strokeWidth={2.5}
            dot={{ fill: AVAILABLE_COLOR, r: 4, strokeWidth: 0 }}
            activeDot={{
              r: 6,
              fill: AVAILABLE_COLOR,
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
            name="Available"
          />
          <Line
            type="monotone"
            dataKey="transfer"
            stroke={TRANSFER_COLOR}
            strokeWidth={2.5}
            dot={{ fill: TRANSFER_COLOR, r: 4, strokeWidth: 0 }}
            activeDot={{
              r: 6,
              fill: TRANSFER_COLOR,
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
            name="Transfer"
          />
          <Line
            type="monotone"
            dataKey="repair"
            stroke={REPAIR_COLOR}
            strokeWidth={2.5}
            dot={{ fill: REPAIR_COLOR, r: 4, strokeWidth: 0 }}
            activeDot={{
              r: 6,
              fill: REPAIR_COLOR,
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
            name="Repair"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
