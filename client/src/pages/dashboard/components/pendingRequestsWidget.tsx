import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ArrowRight, RotateCcw, ArrowRightLeft, HandHelping } from 'lucide-react';
import type { RequestPipelineRow } from '../dashboard';

const TYPE_ITEMS: Array<{
  key: 'returnCount' | 'transferCount' | 'borrowCount';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  route: string;
}> = [
  {
    key: 'returnCount',
    label: 'Return forms',
    icon: RotateCcw,
    color: 'text-emerald-500',
    route: '/assets/return-requests',
  },
  {
    key: 'transferCount',
    label: 'Transfer forms',
    icon: ArrowRightLeft,
    color: 'text-purple-500',
    route: '/assets/transfer-requests',
  },
  {
    key: 'borrowCount',
    label: 'Borrow requests',
    icon: HandHelping,
    color: 'text-orange-500',
    route: '/assets/borrow-requests',
  },
];

const PENDING_STAGES = ['Awaiting requester', 'Awaiting dept head', 'Awaiting completion'];

export default function PendingRequestsWidget({
  pipeline,
  scopeLabel = 'Pending',
  loading,
}: {
  pipeline: RequestPipelineRow[];
  scopeLabel?: string;
  loading?: boolean;
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {scopeLabel} Requests
          </CardTitle>
          <CardDescription>Requests awaiting action</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingByType = TYPE_ITEMS.map(item => ({
    ...item,
    pending: pipeline
      .filter(row => PENDING_STAGES.includes(row.stage))
      .reduce((sum, row) => sum + (Number(row[item.key]) || 0), 0),
    total: pipeline.reduce((sum, row) => sum + (Number(row[item.key]) || 0), 0),
  }));

  const totalPending = pendingByType.reduce((sum, item) => sum + item.pending, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          {scopeLabel} Requests
        </CardTitle>
        <CardDescription>
          {totalPending > 0
            ? `${totalPending} awaiting action across return, transfer, and borrow workflows`
            : 'Requests awaiting action'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalPending === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No pending requests
          </p>
        ) : (
          <div className="space-y-2">
            {pendingByType.map(item => (
              <button
                key={item.key}
                type="button"
                className="flex w-full items-center justify-between rounded-lg border p-3 text-sm text-left hover:bg-muted/50 transition-colors"
                onClick={() => navigate(item.route)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <item.icon className={`h-4 w-4 ${item.color} shrink-0`} />
                  <span className="font-medium truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground text-xs">
                    {item.pending} of {item.total}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={e => {
                      e.stopPropagation();
                      navigate(item.route);
                    }}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}