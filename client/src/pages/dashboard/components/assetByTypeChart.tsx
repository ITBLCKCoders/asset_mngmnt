'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface AssetByTypeItem {
  typeName: string;
  typeId: string;
  total: number;
  inUse: number;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function AssetByTypeChart({
  data,
}: {
  data: AssetByTypeItem[];
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const chartData = data.map(d => ({
    name: d.typeName || 'Uncategorized',
    inUse: d.inUse,
    total: d.total,
    available: Math.max(0, d.total - d.inUse),
  }));

  if (!isClient || !chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        {!chartData.length ? 'No data' : 'Loading…'}
      </div>
    );
  }

  return (
    <motion.div
      className="h-64 w-full"
      style={{ minHeight: '256px' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={300}
        minHeight={200}
      >
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
            }}
            formatter={(value: number, name: string) => [
              value,
              name === 'inUse'
                ? 'In use'
                : name === 'available'
                  ? 'Available'
                  : name,
            ]}
            labelStyle={{ fontWeight: 'bold' }}
          />
          <Legend />
          <Bar
            dataKey="inUse"
            name="In use"
            fill={COLORS[0]}
            radius={[0, 4, 4, 0]}
            stackId="a"
          />
          <Bar
            dataKey="available"
            name="Available"
            fill={COLORS[1]}
            radius={[0, 4, 4, 0]}
            stackId="a"
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
