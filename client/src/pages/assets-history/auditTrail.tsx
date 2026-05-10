import { useState, useEffect, useMemo } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { Shimmer } from '@/components/ui/shimmer';
import {
  AuditFieldChanges,
  formatAuditPlainText,
  hasAuditFieldChanges,
} from '@/components/common/AuditFieldChanges';
import { useAuditFieldLookups } from '@/hooks/useAuditFieldLookups';

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

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        setLoading(true);

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
          setError(null);
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
    };

    fetchAuditLogs();
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

  const totalPages = Math.max(1, meta.totalPages || 1);

  const { lookups: auditFieldLookups, mergedIdLabels } =
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

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFFFF]">
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <PageHeader
          icon={Shield}
          title="Audit Trail"
          description="Track all system activities and changes"
        >
          <Button
            variant="header"
            size="sm"
            onClick={() => exportCurrentView('csv')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCurrentView('json')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export JSON
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Recent Activities
            </CardTitle>
            <div className="mt-4 flex flex-col gap-4">
              <div className="w-full sm:max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by user, action, resource, or details..."
                    value={searchTerm}
                    onChange={e => {
                      setCurrentPage(1);
                      setSearchTerm(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-8">
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
                  <Input type="date" value={dateFrom} onChange={e => {
                    setCurrentPage(1);
                    setDateFrom(e.target.value);
                  }} />
                  <Input type="date" value={dateTo} onChange={e => {
                    setCurrentPage(1);
                    setDateTo(e.target.value);
                  }} />
                </div>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={value => {
                    setCurrentPage(1);
                    setItemsPerPage(Number(value));
                  }}
                >
                  <SelectTrigger className="w-full sm:w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No audit logs found matching your criteria</p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log: AuditLogEntry) => (
                        <TableRow
                          key={log.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedLog(log)}
                        >
                          <TableCell>
                            <div className="text-sm font-medium">
                              {formatDistanceToNow(log.timestamp, {
                                addSuffix: true,
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(log.timestamp, "MMM dd, yyyy HH:mm:ss")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">
                                  {log.user.name
                                    .split(' ')
                                    .map((n: string) => n[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm">{log.user.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {log.user.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.type)}
                              <Badge variant={getActionBadgeVariant(log.type) as any}>
                                {log.action}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {formatAuditPlainText(log.resource ?? '', mergedIdLabels)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.resourceType}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.status === 'failure' ? 'destructive' : 'default'}>
                              {log.status ?? 'success'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.severity === 'critical' ? 'destructive' : log.severity === 'warning' ? 'secondary' : 'outline'}>
                              {log.severity ?? 'info'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              {log.ipAddress}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {meta.total} entries
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(prev => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(prev => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {selectedLog && (
          <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-white">
              <SheetHeader>
                <SheetTitle>Audit Log Details</SheetTitle>
                <SheetDescription>
                  Full details for the selected audit event
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-muted-foreground">Time</div>
                    <div>{format(selectedLog.timestamp, "MMM dd, yyyy HH:mm:ss")}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">User</div>
                    <div>{selectedLog.user.name} ({selectedLog.user.email})</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Action</div>
                    <div className="flex items-center gap-2">
                      {getActionIcon(selectedLog.type)}
                      <Badge variant={getActionBadgeVariant(selectedLog.type) as any}>
                        {selectedLog.action}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Resource</div>
                    <div>{formatAuditPlainText(selectedLog.resource ?? '', mergedIdLabels)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Status</div>
                    <Badge variant={selectedLog.status === 'failure' ? 'destructive' : 'default'}>
                      {selectedLog.status ?? 'success'}
                    </Badge>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Severity</div>
                    <Badge variant={selectedLog.severity === 'critical' ? 'destructive' : selectedLog.severity === 'warning' ? 'secondary' : 'outline'}>
                      {selectedLog.severity ?? 'info'}
                    </Badge>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">IP Address</div>
                    <div>{selectedLog.ipAddress}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Request ID</div>
                    <div>{selectedLog.requestId || 'N/A'}</div>
                  </div>
                </div>

                {selectedLog.details && (
                  <div>
                    <div className="font-medium text-muted-foreground mb-2">Details</div>
                    <div className="text-sm bg-muted p-3 rounded">
                      {formatAuditPlainText(selectedLog.details, mergedIdLabels)}
                    </div>
                  </div>
                )}

                {hasAuditFieldChanges(selectedLog.oldValues, selectedLog.newValues) && (
                  <div>
                    <div className="font-medium text-muted-foreground mb-2">Changes</div>
                    <AuditFieldChanges
                      oldValues={selectedLog.oldValues}
                      newValues={selectedLog.newValues}
                      lookups={auditFieldLookups}
                    />
                  </div>
                )}

                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRawJson(!showRawJson)}
                  >
                    {showRawJson ? 'Hide' : 'Show'} Raw JSON
                  </Button>
                  {showRawJson && (
                    <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto max-h-96">
                      {JSON.stringify(selectedLog, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </main>
    </div>
  );
}
