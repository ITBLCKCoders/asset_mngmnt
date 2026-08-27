import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState, useEffect, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Settings,
  User,
  Shield,
} from 'lucide-react';
import {
  AuditFieldChanges,
  formatAuditPlainText,
  hasAuditFieldChanges,
  type AuditFieldLookups,
} from '@/components/common/AuditFieldChanges';

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toReadableLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function KeyValueList({ value }: { value: unknown }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return <div className="text-sm text-gray-700">{formatValue(value)}</div>;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.entries(record);
  if (entries.length === 0) {
    return <div className="text-sm text-gray-500">No fields</div>;
  }

  const visibleRows = entries
    .map(([key, rawValue]) => {
      const stringValue = typeof rawValue === 'string' ? rawValue : null;
      const isIdField = /(^id$|_id$)/.test(key);
      const isActorRefField = /(_by$|^created_by$|^updated_by$|^assigned_by$)/.test(key);
      const normalizedKey = key.toLowerCase();
      const looksLikeIdRef = normalizedKey.endsWith('id') || normalizedKey.endsWith('_id') || normalizedKey.endsWith('by') || normalizedKey.endsWith('_by');

      if (isIdField) return null;

      if (isActorRefField || looksLikeIdRef) {
        const companionKey = [
          `${key}_name`, `${key}_email`, `${key}_display_name`,
          `${key.replace(/_by$/, '')}_name`,
          `${key.replace(/_by$/, '')}_email`,
          `${key.replace(/_by$/, '')}_display_name`,
        ].find((candidate) => {
          const companion = record[candidate];
          return typeof companion === 'string' && companion.trim().length > 0;
        });

        if (companionKey) {
          return { key, label: toReadableLabel(key), valueText: formatValue(record[companionKey]) };
        }

        if (stringValue && isUuidLike(stringValue)) return null;
      }

      return { key, label: toReadableLabel(key), valueText: formatValue(rawValue) };
    })
    .filter((row): row is { key: string; label: string; valueText: string } => Boolean(row));

  if (visibleRows.length === 0) {
    return <div className="text-sm text-gray-500">No readable fields</div>;
  }

  return (
    <div className="space-y-2">
      {visibleRows.map((row) => (
        <div
          key={row.key}
          className="grid grid-cols-1 gap-1 rounded-md border border-gray-200 bg-gray-50 p-2 sm:grid-cols-[160px_1fr] sm:gap-3"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {row.label}
          </div>
          <div className="text-sm text-gray-800 break-all">{row.valueText}</div>
        </div>
      ))}
    </div>
  );
}

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
  if (lower.includes('logout'))
    return <Shield className="h-4 w-4 text-red-500" />;
  if (lower.includes('assign'))
    return <User className="h-4 w-4 text-indigo-600" />;
  return <FileText className="h-4 w-4 text-gray-600" />;
}

function getActionBadgeClass(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes('create') || lower.includes('add'))
    return 'border-green-200 bg-green-50 text-green-700';
  if (lower.includes('update') || lower.includes('edit'))
    return 'border-blue-200 bg-blue-50 text-blue-700';
  if (lower.includes('delete') || lower.includes('remove'))
    return 'border-red-200 bg-red-50 text-red-700';
  if (lower.includes('assign'))
    return 'border-purple-200 bg-purple-50 text-purple-700';
  return 'border-gray-200 bg-gray-50 text-gray-700';
}

export default function RecentActivityTable({
  activities,
  fieldLookups,
  mergedIdLabels,
}: {
  activities: (LegacyActivity | AuditLogActivity)[];
  fieldLookups?: AuditFieldLookups;
  mergedIdLabels?: Record<string, string>;
}) {
  const [selectedLog, setSelectedLog] = useState<AuditLogActivity | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const resolvedDetailsByLogId = useMemo(() => {
    const out: Record<string, string> = {};
    for (const a of activities) {
      if (isAuditLog(a)) {
        out[a.id] = mergedIdLabels
          ? formatAuditPlainText(a.details ?? '', mergedIdLabels)
          : a.details ?? '';
      }
    }
    return out;
  }, [activities, mergedIdLabels]);

  if (!activities?.length) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No recent activity
      </p>
    );
  }

  if (!isAuditLog(activities[0])) {
    return <LegacyTable activities={activities as LegacyActivity[]} />;
  }

  const logs = activities as AuditLogActivity[];

  const columns: ColumnDef<AuditLogActivity>[] = [
    {
      accessorKey: 'timestamp',
      header: 'Time',
      size: 180,
      cell: ({ row }) => {
        const log = row.original;
        const d = new Date(log.timestamp);
        return (
          <div>
            <div className="text-sm font-medium">
              {formatDistanceToNow(d, { addSuffix: true })}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(d, 'MMM dd, yyyy HH:mm:ss')}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'user.name',
      header: 'User',
      size: 200,
      cell: ({ row }) => {
        const log = row.original;
        const initials = log.user.name
          .split(' ')
          .map(n => n[0])
          .join('');
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm">{log.user.name}</div>
              <div className="text-xs text-muted-foreground">
                {log.user.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'action',
      header: 'Action',
      size: 150,
      cell: ({ row }) => {
        const action = row.original.action;
        return (
          <div className="flex items-center gap-2">
            {getActionIcon(action)}
            <Badge variant="outline" className={getActionBadgeClass(action)}>
              <span className="capitalize">{action}</span>
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'resourceType',
      header: 'Resource',
      size: 200,
      cell: ({ row }) => {
        const log = row.original;
        return (
          <div>
            <div className="text-sm font-medium">
              {mergedIdLabels
                ? formatAuditPlainText(log.resource || log.resourceId || '', mergedIdLabels) || '—'
                : log.resource || log.resourceId || '—'}
            </div>
            <div className="text-xs text-muted-foreground">
              {log.resourceType}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'details',
      header: 'Details',
      size: 300,
      cell: ({ row }) => {
        const log = row.original;
        const detailText = resolvedDetailsByLogId[log.id] || log.resource || '—';
        return (
          <div className="max-w-[min(28rem,40vw)]">
            <span className="line-clamp-2 text-sm text-muted-foreground">
              {detailText}
            </span>
            {hasAuditFieldChanges(log.oldValues, log.newValues) ? (
              <AuditFieldChanges
                compact
                className="mt-1.5"
                oldValues={log.oldValues}
                newValues={log.newValues}
                lookups={fieldLookups}
              />
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        data={logs}
        columns={columns}
        searchPlaceholder="Search activity…"
        showSearch={false}
        tableId="dashboard-recent-activity"
        onRowClick={(row) => {
          setSelectedLog(row.original);
          setShowRawJson(false);
        }}
        emptyState={
          <p className="text-sm text-muted-foreground py-4 text-center">
            No recent activity
          </p>
        }
        mobileCardFields={[
          {
            key: 'action',
            label: 'Action',
            render: (row) => {
              const log = row as unknown as AuditLogActivity;
              return (
                <Badge variant="outline" className={getActionBadgeClass(log.action)}>
                  <span className="capitalize text-xs">{log.action}</span>
                </Badge>
              );
            },
          },
          {
            key: 'resource',
            label: 'Resource',
            render: (row) => {
              const log = row as unknown as AuditLogActivity;
              return (
                <span className="text-xs">{log.resource || log.resourceType || '—'}</span>
              );
            },
          },
          {
            key: 'time',
            label: 'Time',
            render: (row) => {
              const log = row as unknown as AuditLogActivity;
              return (
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                </span>
              );
            },
          },
        ]}
      />

      <Sheet
        open={!!selectedLog}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLog(null);
            setShowRawJson(false);
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto border-l border-gray-200 bg-white sm:max-w-2xl">
          {selectedLog ? (
            <>
              <SheetHeader>
                <SheetTitle>Activity Details</SheetTitle>
                <SheetDescription>
                  Full details for the selected activity
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Event Overview
                  </div>
                  <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                    <div className="rounded-md border border-gray-200 bg-white p-3">
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Time
                      </div>
                      <div>
                        {format(new Date(selectedLog.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                      </div>
                    </div>
                    <div className="rounded-md border border-gray-200 bg-white p-3">
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        User
                      </div>
                      <div>
                        {selectedLog.user.name} ({selectedLog.user.email})
                      </div>
                    </div>
                    <div className="rounded-md border border-gray-200 bg-white p-3">
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Action
                      </div>
                      <div className="flex items-center gap-2">
                        {getActionIcon(selectedLog.action)}
                        <Badge variant="outline" className={getActionBadgeClass(selectedLog.action)}>
                          <span className="capitalize">{selectedLog.action}</span>
                        </Badge>
                      </div>
                    </div>
                    <div className="rounded-md border border-gray-200 bg-white p-3">
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Resource
                      </div>
                      <div>
                        {selectedLog.resourceType} - {selectedLog.resource || selectedLog.resourceId || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {(resolvedDetailsByLogId[selectedLog.id]) && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Details
                    </div>
                    <div className="rounded-md border border-gray-200 bg-white p-3 text-sm leading-relaxed">
                      {resolvedDetailsByLogId[selectedLog.id]}
                    </div>
                  </div>
                )}

                {Boolean(selectedLog.oldValues || selectedLog.newValues) && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Changes
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowRawJson(!showRawJson)}
                      >
                        {showRawJson ? 'Show Formatted' : 'Show Raw JSON'}
                      </Button>
                    </div>
                    {showRawJson ? (
                      <pre className="max-h-96 overflow-auto rounded-md border border-gray-200 bg-white p-3 text-xs">
                        {JSON.stringify({ old: selectedLog.oldValues, new: selectedLog.newValues }, null, 2)}
                      </pre>
                    ) : (
                      <div className="space-y-2">
                        {(() => {
                          const changedFields = (() => {
                            const oldKeys = selectedLog.oldValues ? Object.keys(selectedLog.oldValues) : [];
                            const newKeys = selectedLog.newValues ? Object.keys(selectedLog.newValues) : [];
                            return Array.from(new Set([...oldKeys, ...newKeys]));
                          })();

                          const filterChangedFields = (value: unknown) => {
                            if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
                            const record = value as Record<string, unknown>;
                            const filtered: Record<string, unknown> = {};
                            for (const field of changedFields) {
                              if (field in record) filtered[field] = record[field];
                            }
                            return filtered;
                          };

                          const filteredOld = filterChangedFields(selectedLog.oldValues);
                          const filteredNew = filterChangedFields(selectedLog.newValues);

                          return (
                            <>
                              {Boolean(filteredOld) && Object.keys(filteredOld as Record<string, unknown>).length > 0 && (
                                <div>
                                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Old Values
                                  </div>
                                  <div className="max-h-64 overflow-auto rounded-md border border-gray-200 bg-white p-3">
                                    <KeyValueList value={filteredOld} />
                                  </div>
                                </div>
                              )}
                              {Boolean(filteredNew) && Object.keys(filteredNew as Record<string, unknown>).length > 0 && (
                                <div>
                                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    New Values
                                  </div>
                                  <div className="max-h-64 overflow-auto rounded-md border border-gray-200 bg-white p-3">
                                    <KeyValueList value={filteredNew} />
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function LegacyTable({ activities }: { activities: LegacyActivity[] }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getBadge = (status: string) => {
    const map: Record<string, string> = {
      available: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      pending_return: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      transferred: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      maintenance: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <Badge variant="secondary" className={map[status] || ''}>
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  return (
    <>
      {!isMobile && (
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left text-xs font-medium uppercase tracking-wider text-gray-500 px-4 py-3">ID</th>
              <th className="text-left text-xs font-medium uppercase tracking-wider text-gray-500 px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium uppercase tracking-wider text-gray-500 px-4 py-3">Status</th>
              <th className="hidden sm:table-cell text-left text-xs font-medium uppercase tracking-wider text-gray-500 px-4 py-3">Action</th>
              <th className="text-right text-xs font-medium uppercase tracking-wider text-gray-500 px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {activities.map(a => (
              <tr key={a.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{a.id}</td>
                <td className="px-4 py-3 text-sm">{a.name}</td>
                <td className="px-4 py-3">{getBadge(a.status)}</td>
                <td className="hidden sm:table-cell px-4 py-3 text-sm text-muted-foreground">{a.action}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground text-right">{a.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {isMobile && (
        <div className="space-y-3">
          {activities.map(a => (
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
                  <span className="text-xs text-muted-foreground">{a.action}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
