'use client';

import { useState, type ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  loadChartVariant,
  saveChartVariant,
  type DashboardChartVariant,
} from './dashboardChartPrefs';

const VARIANT_OPTIONS: Array<{
  value: DashboardChartVariant;
  label: string;
}> = [
  { value: 'area', label: 'Area' },
  { value: 'bar', label: 'Bar' },
  { value: 'pie', label: 'Pie' },
  { value: 'radar', label: 'Radar' },
  { value: 'radial', label: 'Radial' },
];

type DashboardChartShellProps = {
  defaultTitle: string;
  defaultDescription: string;
  defaultVariant?: DashboardChartVariant;
  chartId?: string;
  empty?: boolean;
  emptyMessage?: string;
  headerActions?: ReactNode;
  children: (variant: DashboardChartVariant) => ReactNode;
};

export function DashboardChartShell({
  defaultTitle,
  defaultDescription,
  defaultVariant = 'area',
  chartId,
  empty = false,
  emptyMessage = 'No data for this view',
  headerActions,
  children,
}: DashboardChartShellProps) {
  const [variant, setVariant] = useState<DashboardChartVariant>(() =>
    chartId ? loadChartVariant(chartId, defaultVariant) : defaultVariant
  );

  const handleVariantChange = (next: string) => {
    if (chartId) saveChartVariant(chartId, next as DashboardChartVariant);
    setVariant(next as DashboardChartVariant);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base leading-tight">{defaultTitle}</CardTitle>
          <CardDescription className="mt-1 line-clamp-2">
            {defaultDescription}
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {headerActions}
          <Select
            value={variant}
            onValueChange={handleVariantChange}
          >
            <SelectTrigger
              className="h-7 w-[92px] text-xs"
              aria-label={`${defaultTitle} chart type`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VARIANT_OPTIONS.map(option => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {empty ? (
          <p className="text-sm text-muted-foreground py-10 text-center m-auto">
            {emptyMessage}
          </p>
        ) : (
          children(variant)
        )}
      </CardContent>
    </Card>
  );
}