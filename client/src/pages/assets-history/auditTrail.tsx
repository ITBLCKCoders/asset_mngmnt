import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  CalendarDays,
  User,
  FileText,
  Settings,
  Shield,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { Shimmer } from '@/components/ui/shimmer';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { formatAuditPlainText } from '@/components/common/AuditFieldChanges';
import { useAuditFieldLookups } from '@/hooks/useAuditFieldLookups';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  action: string;
  resource: string;
  resourceType: string;
  resourceId?: string;
  details: string;
  oldValues?: any;
  newValues?: any;
  type:
    | 'create'
    | 'update'
    | 'delete'
    | 'login'
    | 'logout'
    | 'register'
    | 'settings'
    | 'assign';
  ipAddress?: string;
  companyId?: string;
  status?: 'success' | 'failure';
  severity?: 'info' | 'warning' | 'critical';
  requestId?: string;
  sessionId?: string;
  httpMethod?: string;
  httpEndpoint?: string;
  prevHash?: string;
  rowHash?: string;
}

interface AuditMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const getActionIcon = (type: string) => {
  switch (type) {
    case 'create':
      return <FileText className="h-4 w-4 text-green-600" />;
    case 'update':
      return <Settings className="h-4 w-4 text-blue-600" />;
    case 'delete':
      return <FileText className="h-4 w-4 text-red-600" />;
    case 'login':
      return <Shield className="h-4 w-4 text-purple-600" />;
    case 'logout':
      return <Shield className="h-4 w-4 text-red-500" />;
    case 'register':
      return <User className="h-4 w-4 text-green-500" />;
    case 'settings':
      return <Settings className="h-4 w-4 text-orange-600" />;
    case 'assign':
      return <User className="h-4 w-4 text-indigo-600" />;
    default:
      return <FileText className="h-4 w-4 text-gray-600" />;
  }
};

const getActionBadgeVariant = (type: string) => {
  switch (type) {
    case 'create':
      return 'default';
    case 'update':
      return 'secondary';
    case 'delete':
      return 'destructive';
    case 'login':
      return 'outline';
    case 'logout':
      return 'destructive';
    case 'register':
      return 'default';
    case 'settings':
      return 'secondary';
    case 'assign':
      return 'outline';
    default:
      return 'secondary';
  }
};

const getActionType = (
  action: string
):
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'register'
  | 'settings'
  | 'assign' => {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('create') || lowerAction.includes('add'))
    return 'create';
  if (lowerAction.includes('delete') || lowerAction.includes('remove'))
    return 'delete';
  if (lowerAction.includes('login') || lowerAction.includes('sign'))
    return 'login';
  if (lowerAction.includes('logout')) return 'logout';
  if (
    lowerAction.includes('registration') ||
    lowerAction.includes('register')
  )
    return 'register';
  if (lowerAction.includes('setting') || lowerAction.includes('config'))
    return 'settings';
  if (lowerAction.includes('assign')) return 'assign';
  return 'update';
};

const auditTrailColumns: ColumnDef<AuditLogEntry>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Time',
    size: 180,
    cell: ({ row }) => {
      const log = row.original;
      return (
        <div>
          <div className="text-sm font-medium">
            {formatDistanceToNow(log.timestamp, { addSuffix: true })}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(log.timestamp, 'MMM dd, yyyy HH:mm:ss')}
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
        .map((n: string) => n[0])
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
      const log = row.original;
      const type = getActionType(log.action);
      return (
        <div className="flex items-center gap-2">
          {getActionIcon(type)}
          <Badge variant={getActionBadgeVariant(type) as any}>
            <span className="capitalize">{log.action}</span>
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
            {log.resource || log.resourceId || '—'}
          </div>
          <div className="text-xs text-muted-foreground">
            {log.resourceType}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    size: 100,
    cell: ({ row }) => {
      const status = row.original.status ?? 'success';
      return (
        <Badge variant={status === 'failure' ? 'destructive' : 'default'}>
          <span className="capitalize">{status}</span>
        </Badge>
      );
    },
  },
  {
    accessorKey: 'severity',
    header: 'Severity',
    size: 100,
    cell: ({ row }) => {
      const severity = row.original.severity ?? 'info';
      return (
        <Badge variant={severity === 'critical' ? 'destructive' : severity === 'warning' ? 'secondary' : 'outline'}>
          <span className="capitalize">{severity}</span>
        </Badge>
      );
    },
  },
  {
    accessorKey: 'ipAddress',
    header: 'IP',
    size: 120,
    cell: ({ row }) => (
      <div className="text-xs text-muted-foreground">
        {row.original.ipAddress}
      </div>
    ),
  },
];

export default function AuditTrail() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<{
    valid: boolean | null;
    loading: boolean;
    breakPoint: string | null;
  }>({ valid: null, loading: false, breakPoint: null });
  const [error, setError] = useState<string | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Reference data for filters
  const [companies, setCompanies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [meta, setMeta] = useState<AuditMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const displayLoading = loading;

  // Fetch companies and departments for filters
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        // Fetch all companies for filter
        try {
          const companyRes = await api.get('/companies');
          let companyData = [];
          if (companyRes?.companies && Array.isArray(companyRes.companies)) {
            companyData = companyRes.companies;
          } else if (companyRes.data?.companies && Array.isArray(companyRes.data.companies)) {
            companyData = companyRes.data.companies;
          } else if (Array.isArray(companyRes.data)) {
            companyData = companyRes.data;
          } else if (companyRes.data) {
            companyData = [companyRes.data];
          }
          setCompanies(companyData);
        } catch (err) {
          console.error('Failed to fetch companies:', err);
          setCompanies([]);
        }

        // Fetch departments (requires auth and active company)
        try {
          const departmentsRes = await api.get('/departments');
          let departmentsData = [];
          if (departmentsRes.data?.departments && Array.isArray(departmentsRes.data.departments)) {
            departmentsData = departmentsRes.data.departments;
          } else if (departmentsRes.data && Array.isArray(departmentsRes.data)) {
            departmentsData = departmentsRes.data;
          } else if (departmentsRes?.departments && Array.isArray(departmentsRes.departments)) {
            departmentsData = departmentsRes.departments;
          } else if (departmentsRes && Array.isArray(departmentsRes)) {
            departmentsData = departmentsRes;
          } else if (departmentsRes.data) {
            departmentsData = [departmentsRes.data];
          } else if (departmentsRes) {
            departmentsData = [departmentsRes];
          }
          setDepartments(departmentsData);
        } catch (err) {
          console.error('Failed to fetch departments:', err);
          setDepartments([]);
        }
      } catch (err) {
        console.error('Failed to fetch reference data:', err);
      }
    };
    fetchReferenceData();
  }, []);

  const buildQuery = (pageOverride?: number, limitOverride?: number) => {
    const params = new URLSearchParams();
    params.set('page', String(pageOverride ?? currentPage));
    params.set('limit', String(limitOverride ?? itemsPerPage));
    params.set('search', searchTerm);
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    if (actionFilter !== 'all') params.set('action', actionFilter);
    if (resourceTypeFilter !== 'all') params.set('resourceType', resourceTypeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (severityFilter !== 'all') params.set('severity', severityFilter);
    if (companyFilter !== 'all') params.set('companyFilter', companyFilter);
    if (departmentFilter !== 'all') params.set('departmentFilter', departmentFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params.toString();
  };

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/audit?${buildQuery()}`);
      const responseData = response.data || response;

      if (responseData && Array.isArray(responseData.auditLogs)) {
        const auditLogs = responseData.auditLogs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp),
          type: getActionType(log.action),
        }));
        setLogs(auditLogs);
        setMeta({
          page: responseData?.meta?.page ?? currentPage,
          limit: responseData?.meta?.limit ?? itemsPerPage,
          total: responseData?.meta?.total ?? auditLogs.length,
          totalPages: responseData?.meta?.totalPages ?? 1,
        });
      } else {
        setLogs([]);
        setMeta({ page: 1, limit: itemsPerPage, total: 0, totalPages: 1 });
        if (responseData?.message) {
          setError(responseData.message);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      setError(
        err.response?.data?.error ||
          err.message ||
          'Failed to load audit logs'
      );
      setLogs([]);
      setMeta({ page: 1, limit: itemsPerPage, total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [
    searchTerm,
    sortBy,
    sortOrder,
    currentPage,
    itemsPerPage,
    actionFilter,
    resourceTypeFilter,
    statusFilter,
    severityFilter,
    companyFilter,
    departmentFilter,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const totalPages = Math.max(1, meta.totalPages || 1);

  const { mergedIdLabels } =
    useAuditFieldLookups();

  const checkVerification = async () => {
    setVerificationStatus({ valid: null, loading: true, breakPoint: null });
    try {
      const response = await api.get('/audit/verify');
      if (response.success && response.data) {
        setVerificationStatus({
          valid: response.data.valid,
          loading: false,
          breakPoint: response.data.breakPoint || null,
        });
      }
    } catch (error) {
      console.error('Failed to verify audit chain:', error);
      setVerificationStatus({ valid: null, loading: false, breakPoint: null });
    }
  };

  useEffect(() => {
    checkVerification();
  }, []);

  const resolvedDetailsByLogId = useMemo(() => {
    const out: Record<string, string> = {};
    for (const log of logs) {
      out[log.id] = formatAuditPlainText(log.details ?? '', mergedIdLabels);
    }
    return out;
  }, [logs, mergedIdLabels]);

  const exportCurrentView = async (formatType: 'json' | 'csv') => {
    try {
      const response = await api.get(`/audit?${buildQuery(1, 1000)}`);
      const rows = (response as any)?.auditLogs ?? (response as any)?.data?.auditLogs ?? [];

      if (!Array.isArray(rows) || rows.length === 0) {
        return;
      }

      const now = format(new Date(), 'yyyyMMdd-HHmmss');
      if (formatType === 'json') {
        const blob = new Blob([JSON.stringify(rows, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${now}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      const header = [
        'id',
        'timestamp',
        'user',
        'action',
        'resourceType',
        'resource',
        'status',
        'severity',
        'ipAddress',
      ];
      const csvRows = rows.map((row: any) => {
        const values = [
          row.id,
          row.timestamp,
          row.user?.name,
          row.action,
          row.resourceType,
          row.resource,
          row.status,
          row.severity,
          row.ipAddress,
        ];
        return values
          .map(value => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(',');
      });

      const csvContent = [header.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${now}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export audit logs', err);
    }
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Asset Management Audit Trail', 14, 14);

    const body = logs.map((row) => [
      format(new Date(row.timestamp), 'MMM dd, yyyy HH:mm:ss'),
      row.user?.name || 'System',
      row.action,
      row.resourceType,
      row.resource || '—',
      (row.details ?? '—').slice(0, 120),
    ]);

    autoTable(doc, {
      head: [['Date/Time', 'User', 'Action', 'Resource type', 'Resource', 'Details']],
      body,
      startY: 20,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] },
      theme: 'striped',
    });

    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    doc.save(`asset-audit-trail-${stamp}.pdf`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <PageHeader
          icon={Shield}
          title="Audit Trail"
          description="Track all system activities and changes with compliance-grade audit logging."
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchAuditLogs()}
            disabled={displayLoading}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm shadow-lg transition-all duration-300 gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${displayLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportCurrentView('csv')}
            disabled={logs.length === 0 || displayLoading}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm shadow-lg transition-all duration-300 gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportCurrentView('json')}
            disabled={logs.length === 0 || displayLoading}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm shadow-lg transition-all duration-300 gap-2"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={logs.length === 0 || displayLoading}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm shadow-lg transition-all duration-300 gap-2"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </PageHeader>

        {verificationStatus.valid === false && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="font-medium text-red-800 dark:text-red-400">
                Audit Chain Integrity Warning
              </p>
              <p className="text-sm text-red-700 dark:text-red-400">
                The audit log hash chain has been compromised. Break point: {verificationStatus.breakPoint}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={checkVerification}>
              Re-verify
            </Button>
          </div>
        )}

        {verificationStatus.valid === true && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="font-medium text-green-800 dark:text-green-400">
                Audit Chain Verified
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                All audit log hashes are valid and the chain is intact.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={checkVerification}>
              Re-verify
            </Button>
          </div>
        )}

        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5" />
              Recent Activities
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({meta.total} total)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-lg border border-gray-200 bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={actionFilter} onValueChange={value => {
                  setCurrentPage(1);
                  setActionFilter(value);
                }}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="User Registration">User Registration</SelectItem>
                    <SelectItem value="auth.login.success">Login Success</SelectItem>
                    <SelectItem value="auth.login.failure">Login Failure</SelectItem>
                    <SelectItem value="auth.logout">Logout</SelectItem>
                    <SelectItem value="Created Asset">Created Asset</SelectItem>
                    <SelectItem value="Updated Asset">Updated Asset</SelectItem>
                    <SelectItem value="Deleted Asset">Deleted Asset</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={resourceTypeFilter} onValueChange={value => {
                  setCurrentPage(1);
                  setResourceTypeFilter(value);
                }}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Resource" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="asset_builder">Builder</SelectItem>
                    <SelectItem value="asset_assignment">Assignment</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="setting">Setting</SelectItem>
                    <SelectItem value="auth_session">Auth Session</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={value => {
                  setCurrentPage(1);
                  setStatusFilter(value);
                }}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={value => {
                  setCurrentPage(1);
                  setSeverityFilter(value);
                }}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={companyFilter} onValueChange={value => {
                  setCurrentPage(1);
                  setCompanyFilter(value);
                }}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map((company: any) => (
                      <SelectItem key={company.companyID || company.id} value={company.companyID || company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={value => {
                  setCurrentPage(1);
                  setDepartmentFilter(value);
                }}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept: any) => (
                      <SelectItem key={dept.departmentID || dept.id} value={dept.departmentID || dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => {
                    setCurrentPage(1);
                    setDateFrom(e.target.value);
                  }}
                  className="w-full sm:w-auto"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => {
                    setCurrentPage(1);
                    setDateTo(e.target.value);
                  }}
                  className="w-full sm:w-auto"
                />
              </div>
            </div>
            {displayLoading ? (
              <div className="space-y-4">
                <div className="flex gap-4 pb-3 border-b">
                  <Shimmer className="h-6 w-6 rounded flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Shimmer className="h-5 w-20 rounded" />
                    <Shimmer className="h-4 w-32 rounded" />
                  </div>
                </div>
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    <Shimmer className="h-6 w-6 rounded flex-shrink-0 mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Shimmer className="h-5 w-16 rounded-full" />
                        <Shimmer className="h-4 w-24 rounded" />
                      </div>
                      <Shimmer className="h-4 w-full rounded" />
                      <Shimmer className="h-3 w-3/4 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                <p>{error}</p>
              </div>
            ) : (
              <DataTable
                data={logs}
                columns={auditTrailColumns}
                searchPlaceholder="Search by user, action, resource, or details…"
                isLoading={false}
                tableId="audit-trail"
                serverPagination
                pageCount={totalPages}
                totalRowCount={meta.total}
                pageIndex={currentPage - 1}
                pageSize={itemsPerPage}
                onPaginationChange={(pageIndex, pageSize) => {
                  setCurrentPage(pageIndex + 1);
                  setItemsPerPage(pageSize);
                }}
                onSearchChange={(value) => {
                  setCurrentPage(1);
                  setSearchTerm(value);
                }}
                onRowClick={(row) => {
                  setSelectedLog(row.original);
                  setShowRawJson(false);
                }}
                emptyState={
                  <div className="py-8 text-center text-muted-foreground">
                    <p>No audit logs found matching your criteria</p>
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>

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
                  <SheetTitle>Audit Log Details</SheetTitle>
                  <SheetDescription>
                    Full details for the selected audit event
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
                          {format(selectedLog.timestamp, 'MMM dd, yyyy HH:mm:ss')}
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
                          {getActionIcon(selectedLog.type)}
                          <Badge variant={getActionBadgeVariant(selectedLog.type) as any}>
                            {selectedLog.action}
                          </Badge>
                        </div>
                      </div>
                      <div className="rounded-md border border-gray-200 bg-white p-3">
                        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Resource
                        </div>
                        <div>
                          {selectedLog.resourceType} - {formatAuditPlainText(selectedLog.resource ?? selectedLog.resourceId ?? '', mergedIdLabels)}
                        </div>
                      </div>
                      <div className="rounded-md border border-gray-200 bg-white p-3">
                        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Status
                        </div>
                        <Badge variant={selectedLog.status === 'failure' ? 'destructive' : 'default'}>
                          <span className="capitalize">{selectedLog.status ?? 'success'}</span>
                        </Badge>
                      </div>
                      <div className="rounded-md border border-gray-200 bg-white p-3">
                        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Severity
                        </div>
                        <Badge variant={selectedLog.severity === 'critical' ? 'destructive' : selectedLog.severity === 'warning' ? 'secondary' : 'outline'}>
                          <span className="capitalize">{selectedLog.severity ?? 'info'}</span>
                        </Badge>
                      </div>
                      {selectedLog.ipAddress && (
                        <div className="rounded-md border border-gray-200 bg-white p-3">
                          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            IP Address
                          </div>
                          <div>{selectedLog.ipAddress}</div>
                        </div>
                      )}
                      {selectedLog.requestId && (
                        <div className="rounded-md border border-gray-200 bg-white p-3">
                          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Request ID
                          </div>
                          <div className="font-mono text-xs">{selectedLog.requestId}</div>
                        </div>
                      )}
                      {selectedLog.httpMethod && (
                        <div className="rounded-md border border-gray-200 bg-white p-3">
                          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            HTTP Method
                          </div>
                          <div className="uppercase">{selectedLog.httpMethod}</div>
                        </div>
                      )}
                      {selectedLog.httpEndpoint && (
                        <div className="rounded-md border border-gray-200 bg-white p-3 sm:col-span-2">
                          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            HTTP Endpoint
                          </div>
                          <div className="font-mono text-xs break-all">{selectedLog.httpEndpoint}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedLog.details && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Details
                      </div>
                      <div className="rounded-md border border-gray-200 bg-white p-3 text-sm leading-relaxed">
                        {formatAuditPlainText(selectedLog.details, mergedIdLabels)}
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
      </main>
    </div>
  );
}
