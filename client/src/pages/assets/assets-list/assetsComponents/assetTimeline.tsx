import { useEffect, useState } from 'react';
import {
  Clock,
  Package,
  Wrench,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Settings,
  FileText,
} from 'lucide-react';
import { Asset } from './assetTable/assetData';
import { api } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import {
  AuditFieldChanges,
  formatAuditPlainText,
  hasAuditFieldChanges,
} from '@/components/common/AuditFieldChanges';
import { useAuditFieldLookups } from '@/hooks/useAuditFieldLookups';

const logger = createLogger('AssetTimeline');

interface TimelineEvent {
  id: string;
  date: Date;
  title: string;
  description: string;
  type:
    | 'created'
    | 'purchased'
    | 'assigned'
    | 'returned'
    | 'maintenance'
    | 'repair'
    | 'transfer'
    | 'disposal'
    | 'builder'
    | 'accountability';
  icon: React.ComponentType<{ className?: string }>;
  fieldAudit?: {
    oldValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
  };
}

interface AssetTimelineProps {
  asset: Asset;
  showFieldChanges?: boolean;
}

const getEventIcon = (type: TimelineEvent['type']) => {
  switch (type) {
    case 'created':
      return Package;
    case 'purchased':
      return CheckCircle2;
    case 'assigned':
      return MapPin;
    case 'returned':
      return MapPin;
    case 'maintenance':
      return Wrench;
    case 'repair':
      return AlertTriangle;
    case 'transfer':
      return MapPin;
    case 'disposal':
      return AlertTriangle;
    case 'builder':
      return Settings;
    case 'accountability':
      return FileText;
    default:
      return Clock;
  }
};

const getEventColor = (type: TimelineEvent['type']) => {
  switch (type) {
    case 'created':
      return 'text-blue-600';
    case 'purchased':
      return 'text-green-600';
    case 'assigned':
      return 'text-purple-600';
    case 'returned':
      return 'text-blue-600';
    case 'maintenance':
      return 'text-orange-600';
    case 'repair':
      return 'text-red-600';
    case 'transfer':
      return 'text-indigo-600';
    case 'disposal':
      return 'text-gray-600';
    case 'builder':
      return 'text-cyan-600';
    case 'accountability':
      return 'text-teal-600';
    default:
      return 'text-gray-600';
  }
};

export function AssetTimeline({ asset, showFieldChanges = true }: AssetTimelineProps) {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { lookups: auditLookups, mergedIdLabels } = useAuditFieldLookups();

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        logger.debug('Fetching audit logs for asset', {
          assetId: asset.id,
          assetAssetID: asset.assetID,
          assetName: asset.name,
        });
        const response = await api.get(`/audit/assets/${asset.assetID}`);
        logger.debug('Audit logs response received', {
          count: response.auditLogs?.length || 0,
          response: response,
        });
        setAuditLogs(response.auditLogs || []);
      } catch (error) {
        logger.error('Failed to fetch audit logs', error);
        setAuditLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, [asset.assetID]);

  // Generate timeline events from asset data
  const events: TimelineEvent[] = [];

  // Asset created
  if (asset.createdAt) {
    const isBuilder = asset.isAssetBuilder;
    const title = isBuilder ? 'Asset Builder Created' : 'Asset Created';
    const description = isBuilder
      ? `Builder "${asset.name} (${asset.id})" was created with ${asset.children?.length || 0} assets: ${asset.children?.map(c => `${c.name} (${c.id})`).join(', ') || ''}\nCreated by: ${asset.createdBy}`
      : `Asset was added to the system by ${asset.createdBy}`;
    events.push({
      id: 'created',
      date: asset.createdAt,
      title,
      description,
      type: 'created',
      icon: Package,
    });
  }

  // Purchase date
  if (asset.purchaseDate) {
    events.push({
      id: 'purchased',
      date: asset.purchaseDate,
      title: 'Asset Purchased',
      description: `Purchased from ${asset.supplier} for $${asset.purchasePrice.toLocaleString()}`,
      type: 'purchased',
      icon: CheckCircle2,
    });
  }

  // Note: Assignment events are now handled in the audit log processing section below
  // to avoid duplicate events and ensure consistent event types

  // Maintenance
  if (asset.lastMaintenanceDate) {
    events.push({
      id: 'maintenance',
      date: asset.lastMaintenanceDate,
      title: 'Maintenance Performed',
      description: `Scheduled maintenance completed`,
      type: 'maintenance',
      icon: Wrench,
    });
  }

  // Builder History - now handled by audit logs
  // if (asset.builderHistory && asset.builderHistory.length > 0) {
  //   asset.builderHistory.forEach((builder) => {
  //     events.push({
  //       id: `builder-${builder.itemID}`,
  //       date: new Date(builder.addedDate),
  //       title: 'Added to Asset Builder',
  //       description: `Asset "${asset.name} (${asset.id})" added to builder "${builder.builderName}"${builder.addedBy ? ` by ${builder.addedBy}` : ''}`,
  //       type: 'builder',
  //       icon: Settings,
  //     });
  //   });
  // }

  // Accountability Forms
  if (asset.accountabilityForms && asset.accountabilityForms.length > 0) {
    asset.accountabilityForms.forEach(form => {
      events.push({
        id: `accountability-${form.id}`,
        date: new Date(form.created_at),
        title: 'Asset Accountability Form',
        description: `Asset is in accountability form ${form.formNumber}`,
        type: 'accountability',
        icon: FileText,
      });
    });
  }

  // Built Asset Components
  if (asset.children && asset.children.length > 0) {
    const componentNames = asset.children
      .map(child => `${child.name} (${child.id})`)
      .join(', ');
    events.push({
      id: 'built-components',
      date: asset.createdAt,
      title: 'Built with Components',
      description: `Components used: ${componentNames}`,
      type: 'builder',
      icon: Settings,
    });
  }

  // Add audit log events
  auditLogs.forEach(log => {
    logger.debug('Processing audit log', {
      logId: log.id,
      action: log.action,
      resourceType: log.resourceType,
    });
    let eventType: TimelineEvent['type'] = 'created';
    let icon = Clock;

    switch (log.action) {
      case 'Added to Asset Builder':
        eventType = 'builder';
        icon = Settings;
        break;
      case 'Removed from Asset Builder':
        eventType = 'builder';
        icon = Settings;
        break;
      case 'Created':
        eventType = 'created';
        icon = Package;
        break;
      case 'Updated Asset':
        eventType = 'created';
        icon = Package;
        break;
      case 'Assigned Asset':
        logger.debug('Processing Assigned Asset action', {
          logId: log.id,
          action: log.action,
        });
        eventType = 'assigned';
        icon = MapPin;
        break;
      case 'Returned Asset':
        logger.debug('Processing Returned Asset action', {
          logId: log.id,
          action: log.action,
        });
        eventType = 'returned';
        icon = MapPin;
        break;
      case 'Assign to Processor on Return':
        eventType = 'assigned';
        icon = MapPin;
        break;
      case 'Maintenance Completed':
        eventType = 'maintenance';
        icon = Wrench;
        break;
      case 'Repaired':
        eventType = 'repair';
        icon = AlertTriangle;
        break;
      case 'Disposed':
        eventType = 'disposal';
        icon = AlertTriangle;
        break;
      default:
        logger.debug('Unknown action type', {
          logId: log.id,
          action: log.action,
        });
        eventType = 'created';
        icon = Clock;
    }

    let description = '';

    const resolveDetails = (raw: string | undefined | null) =>
      raw?.trim()
        ? formatAuditPlainText(raw.trim(), mergedIdLabels)
        : '';

    // For asset builder actions, ensure we show the full details
    if (
      log.action === 'Removed from Asset Builder' ||
      log.action === 'Added to Asset Builder'
    ) {
      if (log.details && log.details.trim()) {
        description = resolveDetails(log.details);
        if (log.user.name) {
          description += ` by ${log.user.name}`;
        }
      } else {
        // Fallback for asset builder actions - construct details from other fields
        description = `${log.action}`;
        if (log.resource) {
          description += ` for ${log.resource}`;
        }
        if (log.user.name) {
          description += ` by ${log.user.name}`;
        }
      }
    } else if (log.action === 'Assigned Asset') {
      // Special handling for assignment events to make them more readable
      if (log.details) {
        description = resolveDetails(log.details);
        if (log.user.name) {
          description += ` by ${log.user.name}`;
        }
      } else {
        description = `Asset assigned`;
        if (log.user.name) {
          description += ` by ${log.user.name}`;
        }
      }
    } else if (log.action === 'Returned Asset') {
      // Special handling for return events to make them more descriptive
      if (log.details) {
        description = resolveDetails(log.details);
        // Clean up redundant words "department" and "location" from assignment descriptions
        description = description.replace(/\bin department /g, 'in ');
        description = description.replace(/\bat location /g, 'at ');
        // Only append " by user" when details don't already state who returned/processed (e.g. "returned by X processed by Y")
        if (
          log.user.name &&
          !/returned by .+ processed by/i.test(description)
        ) {
          description += ` by ${log.user.name}`;
        }
      } else {
        description = `Asset returned`;
        if (log.user.name) {
          description += ` by ${log.user.name}`;
        }
      }
    } else if (log.action === 'Assign to Processor on Return') {
      if (log.details) {
        description = resolveDetails(log.details);
      } else {
        description = `Asset assigned to processor temporarily because of asset return`;
        if (log.user.name) {
          description += ` (${log.user.name})`;
        }
      }
    } else {
      // For other actions, use the existing logic
      if (log.details) {
        description = resolveDetails(log.details);
        // Clean up redundant words "department" and "location" from assignment descriptions
        description = description.replace(/\bin department /g, 'in ');
        description = description.replace(/\bat location /g, 'at ');
        if (log.user.name) {
          description += ` by ${log.user.name}`;
        }
      } else {
        description = `${log.action}`;
        if (log.user.name) {
          description += ` by ${log.user.name}`;
        }
      }
    }

    logger.debug('Created timeline event', {
      title: log.action,
      description,
      details: log.details,
    });

    // Use a clear display title for known actions (e.g. Assign to Processor on Return)
    const eventTitle =
      log.action === 'Assign to Processor on Return'
        ? 'Assigned to processor (temporary custody)'
        : log.action;
    const eventDescription = description;

    const fieldAudit = hasAuditFieldChanges(log.oldValues, log.newValues)
      ? {
          oldValues: log.oldValues as Record<string, unknown>,
          newValues: log.newValues as Record<string, unknown>,
        }
      : undefined;

    events.push({
      id: `audit-${log.id}`,
      date: new Date(log.timestamp),
      title: eventTitle,
      description: eventDescription,
      type: eventType,
      icon,
      fieldAudit,
    });
  });

  // Debug: Log all events before sorting
  logger.debug('All timeline events before sorting', {
    count: events.length,
    events: events.map(e => ({ title: e.title, date: e.date.toISOString() })),
  });

  // Sort events by date (oldest first) so e.g. "Returned Asset" appears before "Assign to Processor on Return"
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Debug: Log all events after sorting
  logger.debug('All timeline events after sorting', {
    count: events.length,
    events: events.map(e => ({ title: e.title, date: e.date.toISOString() })),
  });

  if (loading) {
    return (
      <div className="space-y-6 w-full">
        <div className="text-center py-8 text-gray-500">
          <div className="mx-auto mb-4 h-12 w-56 animate-pulse rounded bg-gray-200" />
          <div className="mx-auto h-4 w-32 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {events.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No timeline events available</p>
        </div>
      ) : (
        <div className="space-y-4 w-full">
          {events.map((event, index) => {
            const Icon = event.icon;
            const isLast = index === events.length - 1;

            return (
              <div key={event.id} className="flex gap-3 sm:gap-4 w-full">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${getEventColor(event.type)} bg-gray-50 border-2 border-gray-200`}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  {!isLast && (
                    <div className="w-0.5 h-16 sm:h-20 bg-gray-200 mt-2" />
                  )}
                </div>

                <div className="flex-1 pb-6 sm:pb-8 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                        {event.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                        {event.description}
                      </p>
                      {showFieldChanges && event.fieldAudit ? (
                        <AuditFieldChanges
                          className="mt-2"
                          oldValues={event.fieldAudit.oldValues}
                          newValues={event.fieldAudit.newValues}
                          lookups={auditLookups}
                        />
                      ) : null}
                    </div>
                    <span className="text-xs text-gray-500 sm:whitespace-nowrap flex-shrink-0">
                      {event.date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
