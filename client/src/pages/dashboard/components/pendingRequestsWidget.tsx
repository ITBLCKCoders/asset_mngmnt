import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, ArrowRight } from 'lucide-react';

interface PendingRequestItem {
  id: string;
  type: 'borrow' | 'return' | 'transfer' | 'request';
  requester: string;
  assetName: string;
  date: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'pending_approval': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const TYPE_LABELS: Record<string, string> = {
  borrow: 'Borrow',
  return: 'Return',
  transfer: 'Transfer',
  request: 'Asset Request',
};

const TYPE_ROUTES: Record<string, string> = {
  borrow: '/assets/borrow-requests',
  return: '/assets/return-requests',
  transfer: '/assets/transfer-requests',
  request: '/assets/request-admin',
};

export default function PendingRequestsWidget({
  requests,
  scopeLabel = 'Pending',
  loading,
}: {
  requests: PendingRequestItem[];
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
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!requests?.length) {
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
          <p className="text-sm text-muted-foreground text-center py-4">
            No pending requests
          </p>
        </CardContent>
      </Card>
    );
  }

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
        <div className="space-y-2">
          {requests.slice(0, 8).map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border p-3 text-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="font-medium truncate">{item.assetName}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {TYPE_LABELS[item.type] || item.type} by {item.requester}
                </p>
              </div>
              <Badge className={STATUS_COLORS[item.status] || ''} variant="outline">
                {item.status.replace('_', ' ')}
              </Badge>
            </div>
          ))}
        </div>
        <Button
          variant="link"
          size="sm"
          className="mt-3 w-full"
          onClick={() => {
            const route = TYPE_ROUTES[requests[0]?.type] || '/approvals';
            navigate(route);
          }}
        >
          View all requests
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
