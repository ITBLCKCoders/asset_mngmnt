import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Activity, FileText, Settings, User, Shield } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  resourceType: string;
}

function getActionIcon(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes('create') || lower.includes('add'))
    return <FileText className="h-4 w-4 text-green-600" />;
  if (lower.includes('update') || lower.includes('edit'))
    return <Settings className="h-4 w-4 text-blue-600" />;
  if (lower.includes('delete') || lower.includes('remove'))
    return <FileText className="h-4 w-4 text-red-600" />;
  if (lower.includes('login'))
    return <Shield className="h-4 w-4 text-purple-600" />;
  if (lower.includes('assign'))
    return <User className="h-4 w-4 text-indigo-600" />;
  return <Activity className="h-4 w-4 text-gray-600" />;
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
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({activities.length} total)
          </span>
        </CardTitle>
        <CardDescription>Your latest asset interactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.slice(0, 10).map(item => (
            <div
              key={item.id}
              className="flex items-start gap-3 border-b last:border-0 pb-3 last:pb-0"
            >
              <div className="mt-0.5 shrink-0">
                {getActionIcon(item.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize truncate">{item.action}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.resourceType} — {item.resource}
                </p>
              </div>
              <div className="shrink-0 ml-2">
                <Badge variant="outline" className="text-xs whitespace-nowrap" title={format(new Date(item.timestamp), 'MMM dd, yyyy HH:mm:ss')}>
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
