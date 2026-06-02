import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRightLeft, Monitor, Building2 } from 'lucide-react';

interface ScopeStats {
  totalAssets: number;
  activeAssignments: number;
  availableAssets: number;
  underMaintenance: number;
}

export default function ScopeComparisonCards({
  itStats,
  adminStats,
  loading,
}: {
  itStats?: ScopeStats | null;
  adminStats?: ScopeStats | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const pairs: Array<{
    label: string;
    itKey: keyof ScopeStats;
    adminKey: keyof ScopeStats;
  }> = [
    { label: 'Total Assets', itKey: 'totalAssets', adminKey: 'totalAssets' },
    { label: 'Active', itKey: 'activeAssignments', adminKey: 'activeAssignments' },
    { label: 'Available', itKey: 'availableAssets', adminKey: 'availableAssets' },
    { label: 'Under Maintenance', itKey: 'underMaintenance', adminKey: 'underMaintenance' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          IT vs Admin Asset Comparison
        </CardTitle>
        <CardDescription>
          Side-by-side view of IT and Admin asset metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pairs.map(pair => {
            const itVal = itStats?.[pair.itKey] ?? 0;
            const adminVal = adminStats?.[pair.adminKey] ?? 0;
            const total = itVal + adminVal || 1;
            const itPercent = Math.round((itVal / total) * 100);

            return (
              <div key={pair.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{pair.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {itVal + adminVal} total
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-blue-500 shrink-0" />
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${itPercent}%` }}
                    />
                  </div>
                  <Building2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-xs text-muted-foreground w-16 text-right tabular-nums">
                    IT {itVal} / Admin {adminVal}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
