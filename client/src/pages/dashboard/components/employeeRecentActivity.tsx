import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  resourceType: string;
}

export default function EmployeeRecentActivity({
  activities,
  loading,
}: {
  activities: ActivityItem[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            My Recent Activity
          </CardTitle>
          <CardDescription>Your latest asset interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            My Recent Activity
          </CardTitle>
          <CardDescription>Your latest asset interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent activity
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          My Recent Activity
        </CardTitle>
        <CardDescription>Your latest asset interactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.slice(0, 10).map(item => (
            <div
              key={item.id}
              className="flex items-start justify-between border-b last:border-0 pb-2 last:pb-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.action}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.resourceType} — {item.resource}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
