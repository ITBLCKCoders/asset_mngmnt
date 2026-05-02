import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  AuditFieldChanges,
  auditChangesSummary,
  formatAuditPlainText,
  hasAuditFieldChanges,
  type AuditFieldLookups,
} from '@/components/common/AuditFieldChanges';

export interface LegacyActivity {
  id: string;
  name: string;
  status: string;
  action: string;
  date: string;
}

export interface AuditLogActivity {
  id: string;
  timestamp: string;
  user: { id: string; name: string; email: string | null };
  action: string;
  resource: string;
  resourceType: string;
  resourceId: string;
  details: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

function isAuditLog(
  a: LegacyActivity | AuditLogActivity
): a is AuditLogActivity {
  return 'user' in a && 'timestamp' in a && 'resourceType' in a;
}

export default function RecentActivityTable({
  activities,
  fieldLookups,
  mergedIdLabels,
}: {
  activities: (LegacyActivity | AuditLogActivity)[];
  /** Optional FK maps so audit IDs resolve to names (e.g. department, category). */
  fieldLookups?: AuditFieldLookups;
  /** Optional merged id→label map to strip UUIDs from detail text. */
  mergedIdLabels?: Record<string, string>;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getBadge = (status: string) => {
    const map: Record<string, string> = {
      available:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      assigned:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      pending_return:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      transferred:
        'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      maintenance:
        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <Badge variant="secondary" className={map[status] || ''}>
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  if (!activities?.length) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No recent activity
      </p>
    );
  }

  const formatActivityDetails = (a: AuditLogActivity) => {
    if (!a.details?.trim()) return a.resource || '—';
    return mergedIdLabels
      ? formatAuditPlainText(a.details, mergedIdLabels)
      : a.details;
  };

  const detailsTitle = (a: AuditLogActivity) => {
    const base =
      a.details?.trim() && mergedIdLabels
        ? formatAuditPlainText(a.details, mergedIdLabels)
        : a.details || a.resource || '—';
    if (!hasAuditFieldChanges(a.oldValues, a.newValues)) return base;
    const sum = auditChangesSummary(
      a.oldValues,
      a.newValues,
      400,
      fieldLookups
    );
    return sum ? `${base}\n${sum}` : base;
  };

  if (isAuditLog(activities[0])) {
    const logs = activities as AuditLogActivity[];
    return (
      <>
        {!isMobile && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden sm:table-cell">Resource</TableHead>
                <TableHead className="max-w-[min(28rem,40vw)]">
                  Details
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatTime(a.timestamp)}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {a.user?.name ?? 'System'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {a.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {mergedIdLabels
                      ? formatAuditPlainText(
                          a.resource || a.resourceType || '',
                          mergedIdLabels
                        ) || '—'
                      : a.resource || a.resourceType || '—'}
                  </TableCell>
                  <TableCell
                    className="text-sm text-muted-foreground max-w-[min(28rem,40vw)] align-top"
                    title={detailsTitle(a)}
                  >
                    <span className="line-clamp-2">
                      {formatActivityDetails(a)}
                    </span>
                    {hasAuditFieldChanges(a.oldValues, a.newValues) ? (
                      <AuditFieldChanges
                        compact
                        className="mt-1.5"
                        oldValues={a.oldValues}
                        newValues={a.newValues}
                        lookups={fieldLookups}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {isMobile && (
          <div className="space-y-3">
            {logs.map(a => (
              <div
                key={a.id}
                className="rounded-lg border bg-card p-4 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-muted-foreground">
                    {formatTime(a.timestamp)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {a.action}
                  </Badge>
                </div>
                <div className="font-medium text-sm">
                  {a.user?.name ?? 'System'}
                </div>
                <div className="text-xs text-muted-foreground mt-1" title={detailsTitle(a)}>
                  <span className="line-clamp-3 block">
                    {formatActivityDetails(a)}
                  </span>
                  {hasAuditFieldChanges(a.oldValues, a.newValues) ? (
                    <AuditFieldChanges
                      compact
                      className="mt-1.5"
                      oldValues={a.oldValues}
                      newValues={a.newValues}
                      lookups={fieldLookups}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  const legacy = activities as LegacyActivity[];
  return (
    <>
      {!isMobile && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Action</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {legacy.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.id}</TableCell>
                <TableCell>{a.name}</TableCell>
                <TableCell>{getBadge(a.status)}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {a.action}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {a.date}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {isMobile && (
        <div className="space-y-3">
          {legacy.map(a => (
            <div key={a.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-sm">{a.id}</div>
                  <div className="text-muted-foreground text-sm">{a.name}</div>
                </div>
                <span className="text-xs text-muted-foreground">{a.date}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>{getBadge(a.status)}</div>
                {a.action && (
                  <span className="text-xs text-muted-foreground">
                    {a.action}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
