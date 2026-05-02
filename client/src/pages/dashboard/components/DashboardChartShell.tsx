'use client';

import { type ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { DashboardChartVariant } from './dashboardChartPrefs';

type DashboardChartShellProps = {
  defaultTitle: string;
  defaultDescription: string;
  defaultVariant?: DashboardChartVariant;
  empty?: boolean;
  emptyMessage?: string;
  headerActions?: ReactNode;
  children: (variant: DashboardChartVariant) => ReactNode;
};

export function DashboardChartShell({
  defaultTitle,
  defaultDescription,
  defaultVariant = 'area',
  empty = false,
  emptyMessage = 'No data for this view',
  headerActions,
  children,
}: DashboardChartShellProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">{defaultTitle}</CardTitle>
          <CardDescription>{defaultDescription}</CardDescription>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {headerActions}
        </div>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            {emptyMessage}
          </p>
        ) : (
          children(defaultVariant)
        )}
      </CardContent>
    </Card>
  );
}
