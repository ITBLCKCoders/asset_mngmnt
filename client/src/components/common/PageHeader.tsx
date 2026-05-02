'use client';

import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Shimmer } from '@/components/ui/shimmer';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  loading?: boolean;
  children?: React.ReactNode;
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  loading = false,
  children,
}: PageHeaderProps) {
  return (
    <Card className="border-0 shadow-md bg-gradient-to-br from-white to-gray-50/50">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full min-w-0">
          {loading ? (
            <>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Shimmer className="h-10 w-10 rounded-lg shrink-0" />
                <div className="space-y-2 min-w-0 flex-1">
                  <Shimmer className="h-6 w-48 max-w-full" />
                  <Shimmer className="h-3 w-64 max-w-full" />
                </div>
              </div>
              {children && (
                <div className="flex items-center gap-3 hidden sm:flex shrink-0">
                  <Shimmer className="h-9 w-24 rounded-md" />
                  <Shimmer className="h-9 w-32 rounded-md" />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="p-2 bg-red-600 rounded-lg shrink-0">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 break-words">
                    {title}
                  </h1>
                  <p className="text-xs text-gray-500 break-words mt-0.5">
                    {description}
                  </p>
                </div>
              </div>
              {children && (
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-start sm:self-center">
                  {children}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
