import type { ReactNode } from 'react';
import { Package } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Shimmer } from '@/components/ui/shimmer';
import { Skeleton } from '@/components/ui/skeleton';
import { TabsContent } from '@/components/ui/tabs';
import { PageHeader } from './PageHeader';

function SettingsTableBodySkeleton({
  rows = 4,
  minHeight = 'min-h-[4.5rem]',
}: {
  rows?: number;
  minHeight?: string;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-border/60">
      <div className="flex gap-4 px-4 py-3 bg-muted/40 border-b">
        <Shimmer className="h-4 w-36" />
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-4 w-16" />
        <Shimmer className="h-4 w-28" />
        <div className="ml-auto">
          <Shimmer className="h-4 w-16" />
        </div>
      </div>
      <div className="divide-y divide-border/60 bg-card">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className={`flex items-center gap-4 px-4 py-4 ${minHeight}`}
          >
            <Shimmer className="h-5 w-40" />
            <Shimmer className="h-6 w-16 rounded-md" />
            <Shimmer className="h-6 w-14 rounded-md" />
            <Shimmer className="h-4 flex-1 max-w-md" />
            <div className="flex gap-2 ml-auto shrink-0">
              <Shimmer className="h-8 w-8 rounded-md" />
              <Shimmer className="h-8 w-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsSectionShell({
  titleWidth,
  descriptionWidth,
  actionWidth,
  children,
}: {
  titleWidth: string;
  descriptionWidth: string;
  actionWidth: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="bg-red-600 rounded-t-2xl p-6 mb-0">
        <div className="flex items-start justify-between gap-6">
          <div>
            <Shimmer className={`h-8 rounded bg-white/20 ${titleWidth}`} />
            <Shimmer
              className={`h-5 rounded mt-2 bg-white/20 ${descriptionWidth}`}
            />
          </div>
          <Shimmer
            className={`rounded-xl bg-white/20 shrink-0 ${actionWidth}`}
          />
        </div>
      </div>
      <div className="p-5 border border-t-0 border-gray-200 rounded-b-2xl bg-card">
        {children}
      </div>
    </section>
  );
}

export function SettingsGeneralTabSkeleton() {
  return (
    <TabsContent value="general" className="mt-8 space-y-8">
      {/* Active Company Card Skeleton */}
      <Card className="relative overflow-hidden border-2 border-red-500/30 bg-gradient-to-br from-red-50 to-white shadow-lg">
        <div className="absolute top-0 right-0 flex flex-col gap-1">
          <div className="bg-red-600 text-white px-8 py-3 rounded-bl-2xl">
            <Shimmer className="h-6 w-48 rounded bg-white/20" />
          </div>
          <div className="bg-red-600 text-white px-8 py-3 rounded-bl-2xl">
            <Shimmer className="h-6 w-40 rounded bg-white/20" />
          </div>
        </div>

        <CardHeader className="pb-4">
          <div className="flex items-start gap-6">
            <Shimmer className="h-28 w-28 rounded-lg" />
            <div className="flex-1">
              <Shimmer className="h-9 w-64 rounded-lg" />
              <Shimmer className="h-5 w-96 rounded mt-2" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 text-base">
          <div className="space-y-6">
            <div>
              <Shimmer className="h-4 w-16 rounded" />
              <Shimmer className="h-5 w-48 rounded" />
            </div>
            <div>
              <Shimmer className="h-4 w-24 rounded" />
              <Shimmer className="h-8 w-32 rounded-lg" />
            </div>
            <div>
              <Shimmer className="h-4 w-16 rounded" />
              <Shimmer className="h-5 w-40 rounded" />
            </div>
            <div>
              <Shimmer className="h-4 w-16 rounded" />
              <Shimmer className="h-5 w-36 rounded" />
            </div>
            <div>
              <Shimmer className="h-4 w-16 rounded" />
              <Shimmer className="h-5 w-44 rounded" />
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <Shimmer className="h-4 w-40 rounded" />
              <Shimmer className="h-5 w-full rounded mt-2" />
              <Shimmer className="h-5 w-5/6 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-6 pt-4">
              <div>
                <Shimmer className="h-4 w-16 rounded" />
                <Shimmer className="h-5 w-20 rounded" />
              </div>
              <div>
                <Shimmer className="h-4 w-20 rounded" />
                <Shimmer className="h-5 w-24 rounded" />
              </div>
              <div>
                <Shimmer className="h-4 w-24 rounded" />
                <Shimmer className="h-5 w-28 rounded" />
              </div>
              <div>
                <Shimmer className="h-4 w-28 rounded" />
                <Shimmer className="h-5 w-32 rounded" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Companies List Card Skeleton */}
      <Card>
        <CardHeader className="bg-red-600 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <Shimmer className="h-8 w-72 rounded bg-white/20" />
            <Shimmer className="h-12 w-52 rounded-xl bg-white/20" />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-2xl border-2 p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <Shimmer className="h-20 w-20 rounded-lg" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <Shimmer className="h-8 w-48 rounded" />
                        <Shimmer className="h-8 w-24 rounded-lg" />
                        <Shimmer className="h-8 w-16 rounded" />
                      </div>
                      <Shimmer className="h-4 w-64 rounded" />
                      <div className="flex gap-6">
                        <Shimmer className="h-4 w-32 rounded" />
                        <Shimmer className="h-4 w-28 rounded" />
                      </div>
                      <Shimmer className="h-4 w-48 rounded" />
                      <div className="flex gap-6">
                        <Shimmer className="h-4 w-24 rounded" />
                        <Shimmer className="h-4 w-32 rounded" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Shimmer className="h-12 w-32 rounded-lg" />
                    <Shimmer className="h-12 w-28 rounded-lg" />
                    <Shimmer className="h-12 w-12 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

export function SettingsLocationsTabSkeleton() {
  return (
    <TabsContent value="locations" className="mt-0">
      <SettingsSectionShell
        titleWidth="w-48"
        descriptionWidth="w-80"
        actionWidth="h-12 w-40"
      >
        <div className="mb-4">
          <div className="flex space-x-4 mb-4">
            <Shimmer className="h-6 w-16" />
            <Shimmer className="h-6 w-20" />
            <Shimmer className="h-6 w-12" />
            <Shimmer className="h-6 w-24" />
            <Shimmer className="h-6 w-16" />
            <div className="ml-auto">
              <Shimmer className="h-6 w-16" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-20 border-b flex items-center space-x-4 p-4"
            >
              <Shimmer className="h-6 w-32" />
              <Shimmer className="h-6 w-48" />
              <Shimmer className="h-6 w-16 rounded" />
              <Shimmer className="h-6 w-24 rounded" />
              <div className="flex items-center gap-2">
                <Shimmer className="h-4 w-4 rounded" />
                <Shimmer className="h-4 w-16" />
              </div>
              <div className="flex space-x-2 ml-auto">
                <Shimmer className="h-8 w-8 rounded" />
                <Shimmer className="h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      </SettingsSectionShell>
    </TabsContent>
  );
}

/**
 * Shimmer for the nested sub-tab bar (matches the segmented tab list chrome).
 * Rendered above the section shell so the skeleton mirrors the real sub-tab layout.
 */
function SettingsSubTabsBarSkeleton({ count }: { count: number }) {
  return (
    <div
      aria-hidden
      className="flex w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100/90 p-1 shadow-sm"
    >
      {Array.from({ length: count }).map((_, index) => (
        <Shimmer key={index} className="h-9 flex-1 rounded-lg min-w-24" />
      ))}
    </div>
  );
}

export function SettingsAssetsTabSkeleton() {
  return (
    <TabsContent value="assets" className="mt-0 space-y-6">
      <SettingsSubTabsBarSkeleton count={6} />
      <SettingsSectionShell
        titleWidth="w-48"
        descriptionWidth="w-full max-w-md"
        actionWidth="h-11 w-44"
      >
        <SettingsTableBodySkeleton rows={4} />
      </SettingsSectionShell>
    </TabsContent>
  );
}

export function SettingsDepartmentsTabSkeleton() {
  return (
    <TabsContent value="departments" className="mt-0 space-y-6">
      <SettingsSubTabsBarSkeleton count={2} />
      <SettingsSectionShell
        titleWidth="w-56"
        descriptionWidth="w-full max-w-md"
        actionWidth="h-11 w-52"
      >
        <SettingsTableBodySkeleton rows={4} />
      </SettingsSectionShell>
    </TabsContent>
  );
}

export function SettingsUsersTabSkeleton() {
  return (
    <TabsContent value="users" className="mt-0 space-y-6">
      <SettingsSubTabsBarSkeleton count={2} />
      <SettingsSectionShell
        titleWidth="w-56"
        descriptionWidth="w-full max-w-md"
        actionWidth="h-9 w-40"
      >
        <div className="rounded-xl overflow-hidden border border-border/60">
          <div className="flex gap-3 px-4 py-3 bg-muted/40 border-b shrink-0">
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-4 w-40" />
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-4 w-20" />
            <Shimmer className="h-4 w-16" />
            <div className="ml-auto">
              <Shimmer className="h-4 w-14" />
            </div>
          </div>
          <div className="divide-y divide-border/60 bg-card">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-4 py-4 min-h-[5rem]"
              >
                <Shimmer className="h-5 w-36" />
                <Shimmer className="h-4 w-48" />
                <Shimmer className="h-5 w-24 rounded-full" />
                <Shimmer className="h-5 w-20 rounded-full" />
                <Shimmer className="h-4 w-16" />
                <div className="flex gap-2 ml-auto shrink-0">
                  <Shimmer className="h-8 w-8 rounded-md" />
                  <Shimmer className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </SettingsSectionShell>
    </TabsContent>
  );
}

export function DashboardStatsGridSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export function DashboardChartCardSkeleton({
  titleWidth = 'w-48',
  descriptionWidth = 'max-w-md',
}: {
  titleWidth?: string;
  descriptionWidth?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className={`h-5 ${titleWidth}`} />
        <Skeleton className={`h-4 w-full mt-2 ${descriptionWidth}`} />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardAssetTypeGridSkeleton({
  count = 6,
}: {
  count?: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DashboardRecentActivitySkeleton({
  rows = 5,
}: {
  rows?: number;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export function DashboardAnalyticsGridSkeleton({
  count = 8,
}: {
  count?: number;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function RouteContentFallback() {
  return (
    <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-200">
      <Shimmer className="h-10 w-64 rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Shimmer key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Shimmer className="h-64 w-full rounded-xl" />
    </div>
  );
}

export function AssetDetailsPageSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-background dark:bg-transparent">
      <main className="flex-1 w-full min-w-0 p-4 sm:p-6 md:p-8 lg:p-10 space-y-4 sm:space-y-6">
        <PageHeader
          icon={Package}
          title="Asset Details"
          description="Loading asset details"
          loading
        />

        {/* Status Badge Skeleton */}
        <div className="flex justify-center">
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>

        {/* Tabs Card */}
        <Card className="border-0 shadow-sm w-full min-w-0 overflow-hidden">
          <CardContent className="p-0 w-full min-w-0">
            {/* Tabs List Skeleton */}
            <div className="grid w-full min-w-0 grid-cols-3 bg-red-50 h-auto p-1 gap-1">
              <Skeleton className="h-12 rounded-md" />
              <Skeleton className="h-12 rounded-md" />
              <Skeleton className="h-12 rounded-md" />
            </div>

            {/* Tab Content Skeleton */}
            <div className="p-2 sm:p-4 md:p-6 mt-3 sm:mt-4 min-w-0 space-y-6">
              {/* Image Skeleton */}
              <div className="flex justify-center">
                <Skeleton className="h-64 w-full max-w-lg rounded-xl" />
              </div>

              {/* Info Grid Skeleton - 2x2 grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-full" />
                </div>
              </div>

              {/* Additional Info Sections */}
              <div className="space-y-4 pt-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-3/4" />
              </div>

              <div className="space-y-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-2/3" />
              </div>

              <div className="space-y-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-1/2" />
              </div>

              {/* Financial Info Section */}
              <div className="space-y-4 pt-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
