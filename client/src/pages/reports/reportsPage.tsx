'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BarChart3,
  CalendarRange,
  Download,
  FileStack,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/dataTable';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCompanyContext } from '@/context/CompanyContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

type ReportTableKey =
  | 'assignment'
  | 'return'
  | 'transfer'
  | 'maintenance'
  | 'repair'
  | 'borrow'
  | 'assetRequest';

type ReportFilterState = {
  from: string;
  to: string;
  companyId: string;
  departmentId: string;
};

type HistoryTypeCount = {
  reportType: ReportTableKey;
  label: string;
  total: number;
  fill: string;
};

type MonthlyHistoryCount = {
  label: string;
  assignment: number;
  return: number;
  transfer: number;
  maintenance: number;
  repair: number;
  borrow: number;
  assetRequest: number;
};

type GraphPeriod = 'weekly' | 'monthly' | 'yearly';

type ReportRow = {
  id: string;
  reference: string;
  asset: string;
  person: string;
  /** Asset category id — same scope axis as dashboard (category → department). */
  categoryId: string;
  departmentId: string;
  departmentName: string;
  companyId: string;
  companyName: string;
  status: string;
  date: string;
  notes: string;
};

type CompanyOption = { id: string; name: string };
type DepartmentOption = { departmentID?: string; id?: string; name: string };

const REPORT_TABLES: Array<{ key: ReportTableKey; label: string }> = [
  { key: 'assignment', label: 'Assignment History' },
  { key: 'return', label: 'Return History' },
  { key: 'transfer', label: 'Transfer History' },
  { key: 'maintenance', label: 'Maintenance History' },
  { key: 'repair', label: 'Repair History' },
  { key: 'borrow', label: 'Borrow History' },
  { key: 'assetRequest', label: 'Asset Request History' },
];

const REPORT_ACTION_LABELS: Record<ReportTableKey, string> = {
  assignment: 'Asset assigned',
  return: 'Asset returned',
  transfer: 'Asset transferred',
  maintenance: 'Asset sent to maintenance',
  repair: 'Asset sent to repair',
  borrow: 'Borrow request submitted',
  assetRequest: 'Asset request submitted',
};

const emptyFilters = (): ReportFilterState => ({
  from: '',
  to: '',
  companyId: 'all',
  departmentId: 'all',
});

const initialFilters = (): Record<ReportTableKey, ReportFilterState> => ({
  assignment: emptyFilters(),
  return: emptyFilters(),
  transfer: emptyFilters(),
  maintenance: emptyFilters(),
  repair: emptyFilters(),
  borrow: emptyFilters(),
  assetRequest: emptyFilters(),
});

const HISTORY_COLORS: Record<ReportTableKey, string> = {
  assignment: 'hsl(221, 83%, 53%)',
  return: 'hsl(160, 84%, 39%)',
  transfer: 'hsl(25, 95%, 53%)',
  maintenance: 'hsl(199, 89%, 48%)',
  repair: 'hsl(0, 84%, 60%)',
  borrow: 'hsl(262, 83%, 58%)',
  assetRequest: 'hsl(47, 96%, 53%)',
};

const dateOnly = (value: string) => (value ? value.slice(0, 10) : '');

const formatDateLabel = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const makeReference = (value: unknown, prefix: string) => {
  const text = String(value ?? '').trim();
  return text || prefix;
};

const parseBorrowStatus = (row: { status?: string; declined_at?: string }) => {
  if (row.declined_at) return 'Declined';
  switch (row.status) {
    case 'pending_dept_head':
      return 'Awaiting department head';
    case 'pending_staff':
      return 'Awaiting IT/Admin';
    case 'declined':
      return 'Declined';
    case 'pending':
      return 'Pending';
    default:
      return row.status ? row.status.replace(/_/g, ' ') : 'Unknown';
  }
};

const parseRequestStatus = (value: string) => {
  const normalized = value?.toLowerCase?.() ?? '';
  if (normalized === 'approved') return 'Approved';
  if (normalized === 'rejected' || normalized === 'declined') return 'Rejected';
  if (normalized === 'pending') return 'Pending';
  return value || 'Unknown';
};

const rowMatchesFilters = (row: ReportRow, filters: ReportFilterState) => {
  const rowDate = dateOnly(row.date);
  if (filters.from && rowDate && rowDate < filters.from) return false;
  if (filters.to && rowDate && rowDate > filters.to) return false;
  if (filters.companyId !== 'all' && row.companyId !== filters.companyId) {
    return false;
  }
  if (
    filters.departmentId !== 'all' &&
    row.departmentId !== filters.departmentId
  ) {
    return false;
  }
  return true;
};

/** Same rule as dashboard `buildAssetFilter`: asset category in scope categories. */
const rowMatchesDashboardCategoryScope = (
  row: ReportRow,
  scopeCategoryIds: Set<string>
): boolean => {
  if (!row.categoryId) return false;
  return scopeCategoryIds.has(String(row.categoryId));
};

const sectionToTableKey = (section: string | null): ReportTableKey | null => {
  if (section === 'assignment') return 'assignment';
  if (section === 'return') return 'return';
  if (section === 'transfer') return 'transfer';
  if (section === 'maintenance') return 'maintenance';
  if (section === 'repair') return 'repair';
  if (section === 'borrow') return 'borrow';
  if (section === 'assetRequest') return 'assetRequest';
  return null;
};

export default function ReportsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const { roleCustodian } = useUserPermissions();
  const { activeCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [assignmentRows, setAssignmentRows] = useState<ReportRow[]>([]);
  const [returnRows, setReturnRows] = useState<ReportRow[]>([]);
  const [transferRows, setTransferRows] = useState<ReportRow[]>([]);
  const [maintenanceRows, setMaintenanceRows] = useState<ReportRow[]>([]);
  const [repairRows, setRepairRows] = useState<ReportRow[]>([]);
  const [borrowRows, setBorrowRows] = useState<ReportRow[]>([]);
  const [assetRequestRows, setAssetRequestRows] = useState<ReportRow[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState<ReportFilterState>(
    emptyFilters()
  );
  const [selectedExportTables, setSelectedExportTables] = useState<
    ReportTableKey[]
  >(REPORT_TABLES.map(table => table.key));
  const [scope, setScope] = useState<'it' | 'admin'>('it');
  const [graphPeriod, setGraphPeriod] = useState<GraphPeriod>('monthly');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [searchParams] = useSearchParams();
  const selectedCompanyIdRef = useRef(selectedCompanyId);
  selectedCompanyIdRef.current = selectedCompanyId;

  const [scopeCategoryIds, setScopeCategoryIds] = useState<string[]>([]);
  const [scopeCategoryIdsLoading, setScopeCategoryIdsLoading] = useState(false);

  const isSuperAdmin = user?.role?.name === 'Super Admin';

  const effectiveScope = useMemo<'it' | 'admin' | null>(() => {
    if (isSuperAdmin) return scope;
    const at = roleCustodian?.assetType;
    if (at === 'it' || at === 'admin') return at;
    return null;
  }, [isSuperAdmin, scope, roleCustodian?.assetType]);

  const scopeFilterEnabled = effectiveScope !== null;

  const scopeCategoryIdSet = useMemo(
    () => new Set(scopeCategoryIds.map(String)),
    [scopeCategoryIds]
  );

  useEffect(() => {
    if (!scopeFilterEnabled || !effectiveScope) {
      setScopeCategoryIds([]);
      setScopeCategoryIdsLoading(false);
      return;
    }
    let cancelled = false;
    setScopeCategoryIdsLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({ scope: effectiveScope });
        if (isSuperAdmin && selectedCompanyId) {
          params.set('companyId', selectedCompanyId);
        }
        const res = await api.get(
          `/dashboard/scope-category-ids?${params.toString()}`
        );
        const payload = (res as { data?: { categoryIds?: string[] } }).data;
        const ids = payload?.categoryIds;
        const list = Array.isArray(ids) ? ids.map(String) : [];
        if (!cancelled) setScopeCategoryIds(list);
      } catch {
        if (!cancelled) setScopeCategoryIds([]);
      } finally {
        if (!cancelled) setScopeCategoryIdsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    effectiveScope,
    scopeFilterEnabled,
    isSuperAdmin,
    selectedCompanyId,
    user?.id,
  ]);

  const reportsTitle = isSuperAdmin
    ? scope === 'it'
      ? 'IT Asset Reports'
      : 'Admin Asset Reports'
    : roleCustodian?.assetType === 'it'
      ? 'IT Asset Reports'
      : roleCustodian?.assetType === 'admin'
        ? 'Admin Asset Reports'
        : 'Reports';

  const tableRows = useMemo(
    () => ({
      assignment: assignmentRows,
      return: returnRows,
      transfer: transferRows,
      maintenance: maintenanceRows,
      repair: repairRows,
      borrow: borrowRows,
      assetRequest: assetRequestRows,
    }),
    [
      assignmentRows,
      returnRows,
      transferRows,
      maintenanceRows,
      repairRows,
      borrowRows,
      assetRequestRows,
    ]
  );

  const columns = useMemo<ColumnDef<ReportRow>[]>(
    () => [
      { id: 'reference', header: 'Reference', accessorKey: 'reference', size: 150 },
      { id: 'asset', header: 'Asset / Request', accessorKey: 'asset', size: 220 },
      { id: 'person', header: 'User / Requester', accessorKey: 'person', size: 180 },
      {
        id: 'departmentName',
        header: 'Department',
        accessorKey: 'departmentName',
        size: 150,
      },
      {
        id: 'companyName',
        header: 'Company',
        accessorKey: 'companyName',
        size: 160,
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        size: 150,
        cell: ({ row }) => (
          <Badge variant="outline" className="font-normal">
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: 'date',
        header: 'Date',
        accessorKey: 'date',
        size: 170,
        cell: ({ row }) => formatDateLabel(row.original.date),
      },
      { id: 'notes', header: 'Notes', accessorKey: 'notes', size: 260 },
    ],
    []
  );
  const scopedRows = useMemo(
    () =>
      REPORT_TABLES.reduce(
        (acc, table) => {
          acc[table.key] = tableRows[table.key].filter(row => {
            if (!scopeFilterEnabled) return true;
            if (scopeCategoryIdsLoading) return false;
            return rowMatchesDashboardCategoryScope(row, scopeCategoryIdSet);
          });
          return acc;
        },
        {} as Record<ReportTableKey, ReportRow[]>
      ),
    [
      scopeCategoryIdSet,
      scopeCategoryIdsLoading,
      scopeFilterEnabled,
      tableRows,
    ]
  );

  const graphWindowStart = useMemo(() => {
    const now = new Date();
    if (graphPeriod === 'weekly') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(now.getDate() - 6);
      return start;
    }
    if (graphPeriod === 'monthly') {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return new Date(now.getFullYear(), 0, 1);
  }, [graphPeriod]);

  const rowsInGraphWindow = useMemo(
    () =>
      REPORT_TABLES.reduce(
        (acc, table) => {
          acc[table.key] = scopedRows[table.key].filter(row => {
            const date = new Date(row.date);
            if (Number.isNaN(date.getTime())) return false;
            return date >= graphWindowStart;
          });
          return acc;
        },
        {} as Record<ReportTableKey, ReportRow[]>
      ),
    [graphWindowStart, scopedRows]
  );

  const historyTypeTotals = useMemo<HistoryTypeCount[]>(
    () =>
      REPORT_TABLES.map(table => ({
        reportType: table.key,
        label: REPORT_ACTION_LABELS[table.key],
        total: rowsInGraphWindow[table.key].length,
        fill: HISTORY_COLORS[table.key],
      })),
    [rowsInGraphWindow]
  );

  const monthlyHistoryTrend = useMemo<MonthlyHistoryCount[]>(() => {
    const now = new Date();
    const makeEmptyPoint = (label: string): MonthlyHistoryCount => ({
      label,
      assignment: 0,
      return: 0,
      transfer: 0,
      maintenance: 0,
      repair: 0,
      borrow: 0,
      assetRequest: 0,
    });

    const bucketMap = new Map<string, MonthlyHistoryCount>();
    const ensureBucket = (label: string) => {
      if (!bucketMap.has(label)) {
        bucketMap.set(label, makeEmptyPoint(label));
      }
      return bucketMap.get(label)!;
    };

    REPORT_TABLES.forEach(table => {
      rowsInGraphWindow[table.key].forEach(row => {
        const date = new Date(row.date);
        if (Number.isNaN(date.getTime())) return;

        const label =
          graphPeriod === 'weekly'
            ? date.toLocaleDateString(undefined, { weekday: 'short' })
            : graphPeriod === 'monthly'
              ? String(date.getDate()).padStart(2, '0')
              : date.toLocaleDateString(undefined, { month: 'short' });

        const point = ensureBucket(label);
        point[table.key] += 1;
      });
    });

    if (graphPeriod === 'weekly') {
      const labels = Array.from({ length: 7 }, (_, index) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - index));
        return d.toLocaleDateString(undefined, { weekday: 'short' });
      });
      return labels.map(label => bucketMap.get(label) ?? makeEmptyPoint(label));
    }

    if (graphPeriod === 'monthly') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, index) => {
        const label = String(index + 1).padStart(2, '0');
        return bucketMap.get(label) ?? makeEmptyPoint(label);
      });
    }

    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return labels.map(label => bucketMap.get(label) ?? makeEmptyPoint(label));
  }, [graphPeriod, rowsInGraphWindow]);

  const reportTypeChartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    historyTypeTotals.forEach(item => {
      config[item.reportType] = {
        label: item.label,
        color: item.fill,
      };
    });
    return config;
  }, [historyTypeTotals]);

  const trendChartConfig = useMemo<ChartConfig>(
    () => ({
      assignment: { label: 'Asset assigned', color: HISTORY_COLORS.assignment },
      return: { label: 'Asset returned', color: HISTORY_COLORS.return },
      transfer: { label: 'Asset transferred', color: HISTORY_COLORS.transfer },
      maintenance: { label: 'Asset sent to maintenance', color: HISTORY_COLORS.maintenance },
      repair: { label: 'Asset sent to repair', color: HISTORY_COLORS.repair },
      borrow: { label: 'Borrow request submitted', color: HISTORY_COLORS.borrow },
      assetRequest: { label: 'Asset request submitted', color: HISTORY_COLORS.assetRequest },
    }),
    []
  );

  const sectionFromUrl = searchParams.get('section');
  const focusedTableKey = sectionToTableKey(sectionFromUrl);
  const focusedTableLabel = focusedTableKey
    ? REPORT_TABLES.find(table => table.key === focusedTableKey)?.label ?? ''
    : '';

  const openExport = useCallback(
    (tableKey?: ReportTableKey) => {
      setSelectedExportTables(
        tableKey ? [tableKey] : REPORT_TABLES.map(table => table.key)
      );
      const nextFilter = tableKey ? initialFilters()[tableKey] : emptyFilters();
      if (!isSuperAdmin && selectedCompanyIdRef.current) {
        nextFilter.companyId = selectedCompanyIdRef.current;
      }
      setExportFilters(nextFilter);
      setExportOpen(true);
    },
    [isSuperAdmin]
  );

  const toggleExportTable = useCallback((tableKey: ReportTableKey) => {
    setSelectedExportTables(prev =>
      prev.includes(tableKey)
        ? prev.filter(item => item !== tableKey)
        : [...prev, tableKey]
    );
  }, []);

  const exportPdf = useCallback(() => {
    if (selectedExportTables.length === 0) {
      toast.error('Select at least one table to export.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    let first = true;

    selectedExportTables.forEach(tableKey => {
      const label =
        REPORT_TABLES.find(table => table.key === tableKey)?.label ?? tableKey;
      const rows = tableRows[tableKey].filter(row => {
        if (scopeFilterEnabled) {
          if (!rowMatchesDashboardCategoryScope(row, scopeCategoryIdSet)) {
            return false;
          }
        }
        return rowMatchesFilters(row, exportFilters);
      });

      if (!first) doc.addPage();
      first = false;

      doc.setFontSize(16);
      doc.text(label, 14, 16);
      doc.setFontSize(10);
      doc.text(
        `From: ${exportFilters.from || 'All'}   To: ${exportFilters.to || 'All'}   Company: ${
          exportFilters.companyId === 'all'
            ? 'All'
            : companies.find(company => company.id === exportFilters.companyId)?.name ??
              'Selected'
        }   Department: ${
          exportFilters.departmentId === 'all'
            ? 'All'
            : departments.find(
                department =>
                  (department.id ?? department.departmentID) ===
                  exportFilters.departmentId
              )?.name ?? 'Selected'
        }`,
        14,
        24
      );

      autoTable(doc, {
        startY: 30,
        head: [
          [
            'Reference',
            'Asset / Request',
            'User / Requester',
            'Department',
            'Company',
            'Status',
            'Date',
            'Notes',
          ],
        ],
        body:
          rows.length > 0
            ? rows.map(row => [
                row.reference,
                row.asset,
                row.person,
                row.departmentName,
                row.companyName,
                row.status,
                formatDateLabel(row.date),
                row.notes,
              ])
            : [['No records found', '', '', '', '', '', '', '']],
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [136, 17, 21] },
      });
    });

    doc.save(`reports-${Date.now()}.pdf`);
    setExportOpen(false);
    toast.success('Reports PDF exported successfully.');
  }, [
    companies,
    departments,
    exportFilters,
    scopeCategoryIdSet,
    scopeFilterEnabled,
    selectedExportTables,
    tableRows,
  ]);

  useEffect(() => {
    if (userLoading || !user?.role?.name) return;

    const load = async () => {
      setLoading(true);
      try {
        const [
          companiesRes,
          departmentsRes,
          assignmentsRes,
          returnsRes,
          transfersRes,
          borrowRes,
          borrowMineRes,
          requestRes,
          requestMineRes,
        ] = await Promise.allSettled([
          api.get<{ companies?: CompanyOption[] }>('/companies'),
          api.get<{ departments?: DepartmentOption[] }>('/departments'),
          api.get<{ assignments?: any[] }>('/asset-assignments'),
          api.get<{ assetReturns?: any[] }>('/asset-returns'),
          api.get<{ records?: any[] }>('/asset-transfers/history'),
          api.get<any>('/asset-borrow-requests'),
          api.get<any>('/asset-borrow-requests/mine'),
          api.get<{ requests?: any[] }>('/asset-requests/all'),
          api.get<{ requests?: any[] }>('/asset-requests'),
        ]);

        const activeId = String(activeCompany?.id ?? '');
        if (!isSuperAdmin && activeId) {
          setSelectedCompanyId(activeId);
        }

        const maintenanceCompanyId =
          user.role?.name === 'Super Admin'
            ? selectedCompanyIdRef.current || activeId
            : '';
        const maintenancePath =
          maintenanceCompanyId.length > 0
            ? `/reports/maintenance-repair-history?companyId=${encodeURIComponent(maintenanceCompanyId)}`
            : '/reports/maintenance-repair-history';

        const reportsRes = await api
          .get<any>(maintenancePath)
          .then(value => ({ status: 'fulfilled' as const, value }))
          .catch(reason => ({ status: 'rejected' as const, reason }));

        const companyList =
          companiesRes.status === 'fulfilled' ? companiesRes.value.companies ?? [] : [];
        const departmentList =
          departmentsRes.status === 'fulfilled'
            ? departmentsRes.value.departments ?? []
            : [];
        const defaultCompanyId = activeCompany?.id ?? '';
        const defaultCompanyName = activeCompany?.name ?? 'Current Company';

        setCompanies(companyList);
        setDepartments(departmentList);

        const assignments =
          assignmentsRes.status === 'fulfilled' ? assignmentsRes.value.assignments ?? [] : [];
        setAssignmentRows(
          assignments.map((assignment: any) => ({
            id: String(assignment.assignmentID ?? Math.random()),
            reference: makeReference(assignment.assignmentID, 'ASSIGN'),
            asset: `${assignment.asset?.name ?? 'Unknown Asset'} (${assignment.asset?.code ?? 'No Code'})`,
            categoryId: String(assignment.asset?.category_id ?? ''),
            person:
              assignment.user?.first_name || assignment.user?.last_name
                ? `${assignment.user?.first_name ?? ''} ${assignment.user?.last_name ?? ''}`.trim()
                : assignment.user?.email ?? 'Unknown User',
            departmentId: String(assignment.department?.id ?? ''),
            departmentName: assignment.department?.name ?? 'Unassigned',
            companyId: defaultCompanyId,
            companyName: defaultCompanyName,
            status: assignment.status ?? 'Unknown',
            date: assignment.assigned_date ?? assignment.created_at ?? '',
            notes: assignment.assignment_notes ?? 'No notes',
          }))
        );

        const returns =
          returnsRes.status === 'fulfilled' ? returnsRes.value.assetReturns ?? [] : [];
        setReturnRows(
          returns.map((row: any) => ({
            id: String(row.return_id ?? row.form_id ?? Math.random()),
            reference: makeReference(
              row.form_number ?? row.form_id ?? row.return_id,
              'RETURN'
            ),
            asset: `${row.assignment?.asset?.name ?? 'Unknown Asset'} (${row.assignment?.asset?.code ?? 'No Code'})`,
            categoryId: String(row.assignment?.asset?.category_id ?? ''),
            person:
              row.assignment?.user?.first_name || row.assignment?.user?.last_name
                ? `${row.assignment?.user?.first_name ?? ''} ${row.assignment?.user?.last_name ?? ''}`.trim()
                : row.processed_by ?? 'Unknown User',
            departmentId: String(
              row.assignment?.department?.id ?? row.form_department?.id ?? ''
            ),
            departmentName:
              row.assignment?.department?.name ??
              row.form_department?.name ??
              'Unassigned',
            companyId: defaultCompanyId,
            companyName: defaultCompanyName,
            status: row.status ?? 'Processed',
            date: row.created_at ?? '',
            notes: row.return_notes ?? 'No notes',
          }))
        );

        const transfers =
          transfersRes.status === 'fulfilled' ? transfersRes.value.records ?? [] : [];
        setTransferRows(
          transfers.map((row: any) => ({
            id: String(row.recordId ?? row.formId ?? Math.random()),
            reference: makeReference(row.formNumber ?? row.formId, 'TRANSFER'),
            asset: `${row.asset?.name ?? 'Unknown Asset'} (${row.asset?.code ?? 'No Code'})`,
            categoryId: String(row.asset?.category_id ?? ''),
            person: `${row.from?.name ?? 'Unknown'} -> ${row.to?.name ?? 'Unknown'}`,
            departmentId: '',
            departmentName: '-',
            companyId: defaultCompanyId,
            companyName: defaultCompanyName,
            status: row.status ?? 'Unknown',
            date: row.transferDate ?? '',
            notes: row.transferNotes ?? row.action ?? 'No notes',
          }))
        );

        const borrowPayload =
          borrowRes.status === 'fulfilled'
            ? borrowRes.value?.data?.borrowRequests ?? borrowRes.value?.borrowRequests ?? []
            : borrowMineRes.status === 'fulfilled'
              ? borrowMineRes.value?.data?.borrowRequests ??
                borrowMineRes.value?.borrowRequests ??
                []
              : [];
        setBorrowRows(
          (Array.isArray(borrowPayload) ? borrowPayload : []).map((row: any) => ({
            id: String(row.borrow_request_id ?? Math.random()),
            reference: makeReference(
              row.form_number ?? row.borrow_request_id,
              'BORROW'
            ),
            asset:
              row.asset_name?.trim?.() ||
              `${row.category_name ?? 'Unknown Category'} / ${row.type_name ?? 'Unknown Type'}`,
            categoryId: String(row.category_id ?? row.categoryId ?? ''),
            person:
              row.requester_first_name || row.requester_last_name
                ? `${row.requester_first_name ?? ''} ${row.requester_last_name ?? ''}`.trim()
                : row.requester_username ?? row.requester_email ?? 'Unknown User',
            departmentId: '',
            departmentName: row.requester_department_name ?? 'Unassigned',
            companyId: defaultCompanyId,
            companyName: defaultCompanyName,
            status: parseBorrowStatus(row),
            date: row.created_at ?? '',
            notes: row.purpose ?? 'No notes',
          }))
        );

        const requestPayload =
          requestRes.status === 'fulfilled'
            ? requestRes.value.requests ?? []
            : requestMineRes.status === 'fulfilled'
              ? requestMineRes.value.requests ?? []
              : [];
        setAssetRequestRows(
          (Array.isArray(requestPayload) ? requestPayload : []).map((row: any) => ({
            id: String(row.requestID ?? row.id ?? Math.random()),
            reference: makeReference(row.requestID ?? row.id, 'REQUEST'),
            asset: `${row.category?.name ?? 'Unknown Category'} / ${row.type?.name ?? 'Unknown Type'}`,
            categoryId: String(
              row.category?.id ??
                row.category?.categoryID ??
                row.categoryID ??
                row.category_id ??
                ''
            ),
            person:
              row.user?.name ??
              row.user?.username ??
              row.user_id ??
              'Unknown User',
            departmentId: String(row.department?.id ?? ''),
            departmentName: row.department?.name ?? 'Unassigned',
            companyId: defaultCompanyId,
            companyName: defaultCompanyName,
            status: parseRequestStatus(row.status),
            date: row.request_date ?? '',
            notes: row.notes ?? row.admin_notes ?? 'No notes',
          }))
        );

        const reportsData =
          reportsRes.status === 'fulfilled'
            ? (reportsRes.value as { data?: { maintenanceHistory?: unknown[]; repairHistory?: unknown[] } })
                ?.data ?? {}
            : {};
        setMaintenanceRows(
          (reportsData.maintenanceHistory ?? []).map((row: any) => ({
            id: String(row.id),
            reference: makeReference(row.auditId, 'MAINT'),
            asset: `${row.assetName ?? 'Unknown Asset'} (${row.assetCode ?? 'No Code'})`,
            categoryId: String(row.categoryId ?? row.category_id ?? ''),
            person: row.performedBy ?? 'System',
            departmentId: String(row.departmentId ?? ''),
            departmentName: row.departmentName ?? 'Unassigned',
            companyId: String(row.companyId ?? defaultCompanyId),
            companyName: row.companyName ?? defaultCompanyName,
            status: row.status ?? 'Maintenance',
            date: row.createdAt ?? '',
            notes: row.details ?? row.action ?? 'No notes',
          }))
        );
        setRepairRows(
          (reportsData.repairHistory ?? []).map((row: any) => ({
            id: String(row.id),
            reference: makeReference(row.auditId, 'REPAIR'),
            asset: `${row.assetName ?? 'Unknown Asset'} (${row.assetCode ?? 'No Code'})`,
            categoryId: String(row.categoryId ?? row.category_id ?? ''),
            person: row.performedBy ?? 'System',
            departmentId: String(row.departmentId ?? ''),
            departmentName: row.departmentName ?? 'Unassigned',
            companyId: String(row.companyId ?? defaultCompanyId),
            companyName: row.companyName ?? defaultCompanyName,
            status: row.status ?? 'Repair',
            date: row.createdAt ?? '',
            notes: row.details ?? row.action ?? 'No notes',
          }))
        );
      } catch {
        toast.error('Failed to load reports page data.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isSuperAdmin, refreshTick, user?.id, user?.role?.name, userLoading, activeCompany?.id]);

  useEffect(() => {
    if (isSuperAdmin || !activeCompany?.id) return;
    setExportFilters(prev => ({
      ...prev,
      companyId: activeCompany.id,
    }));
  }, [isSuperAdmin, activeCompany?.id]);

  const companyOptions = useMemo(() => {
    const raw = companies.map(c => {
      const co = c as CompanyOption & { companyID?: string };
      return {
        id: String(co.id ?? co.companyID ?? ''),
        name: co.name,
      };
    });
    const merged = [...raw];
    if (
      activeCompany?.id &&
      !merged.some(c => c.id === String(activeCompany.id))
    ) {
      merged.push({
        id: String(activeCompany.id),
        name: activeCompany.name ?? 'Company',
      });
    }
    return merged.filter(c => c.id);
  }, [activeCompany, companies]);

  const onSuperAdminCompanyChange = useCallback((value: string) => {
    setSelectedCompanyId(value);
    setRefreshTick(t => t + 1);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 space-y-6 p-6">
        <PageHeader
          icon={BarChart3}
          title={reportsTitle}
          description={
            isSuperAdmin
              ? scope === 'it'
                ? 'Same IT asset scope as the dashboard: categories under IT departments for the selected company.'
                : 'Same Admin asset scope as the dashboard: categories under Administration departments for the selected company.'
              : scopeFilterEnabled
                ? 'History filtered to the same category scope as your IT or Admin asset dashboard.'
                : 'Review history across assignments, returns, transfers, maintenance, repairs, borrow requests, and asset requests.'
          }
          loading={loading}
        >
          <div className="flex flex-wrap items-center gap-2">
            {isSuperAdmin && (
              <Tabs
                value={scope}
                onValueChange={v => setScope(v as 'it' | 'admin')}
              >
                <TabsList className="grid h-auto w-full max-w-full grid-cols-2 sm:max-w-[280px]">
                  <TabsTrigger
                    value="it"
                    className="px-3 py-2 text-xs sm:text-sm hover:bg-gray-200 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow"
                  >
                    IT Asset
                  </TabsTrigger>
                  <TabsTrigger
                    value="admin"
                    className="px-3 py-2 text-xs sm:text-sm hover:bg-gray-200 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow"
                  >
                    Admin Asset
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRefreshTick(prev => prev + 1)}
              disabled={loading || userLoading}
            >
              {loading || userLoading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button size="sm" onClick={() => openExport()}>
              <FileStack className="mr-2 h-4 w-4" />
              Export Reports
            </Button>
          </div>
        </PageHeader>

        {!focusedTableKey && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {REPORT_TABLES.map(table => (
              <Card
                key={table.key}
                className="border border-border/60 shadow-sm transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {table.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tight text-foreground">
                    {scopedRows[table.key]?.length ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    In current report scope
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!focusedTableKey && (
          <div className="grid gap-6 xl:grid-cols-2">
          <Card
            id="history-type-chart"
            className="border border-border/60 shadow-sm transition-shadow hover:shadow-md"
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-xl font-semibold text-foreground">
                  History entries by type
                </CardTitle>
                <Tabs
                  value={graphPeriod}
                  onValueChange={v => setGraphPeriod(v as GraphPeriod)}
                >
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="yearly">Yearly</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <p className="text-xs text-muted-foreground">
                Asset assigned, Asset returned, Asset transferred, Asset sent to maintenance,
                Asset sent to repair, Borrow request submitted, Asset request submitted.
              </p>
            </CardHeader>
            <CardContent>
              {scopeCategoryIdsLoading || loading ? (
                <p className="text-sm text-muted-foreground">Loading chart data...</p>
              ) : historyTypeTotals.every(item => item.total === 0) ? (
                <p className="text-sm text-muted-foreground">No history records available.</p>
              ) : (
                <ChartContainer config={reportTypeChartConfig} className="h-[320px]">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={historyTypeTotals}
                      dataKey="total"
                      nameKey="reportType"
                      outerRadius={110}
                    >
                      {historyTypeTotals.map(item => (
                        <Cell key={item.reportType} fill={item.fill} />
                      ))}
                    </Pie>
                    <ChartLegend
                      content={<ChartLegendContent nameKey="reportType" />}
                    />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card
            id="monthly-trend-chart"
            className="border border-border/60 shadow-sm transition-shadow hover:shadow-md"
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-xl font-semibold text-foreground">
                  {graphPeriod === 'weekly'
                    ? 'Weekly transaction trend'
                    : graphPeriod === 'monthly'
                      ? 'Monthly transaction trend'
                      : 'Yearly transaction trend'}
                </CardTitle>
                <Tabs
                  value={graphPeriod}
                  onValueChange={v => setGraphPeriod(v as GraphPeriod)}
                >
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="yearly">Yearly</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {scopeCategoryIdsLoading || loading ? (
                <p className="text-sm text-muted-foreground">Loading chart data...</p>
              ) : monthlyHistoryTrend.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No transactions available for the selected period.
                </p>
              ) : (
                <ChartContainer config={trendChartConfig} className="h-[320px]">
                  <LineChart data={monthlyHistoryTrend}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="assignment" stroke="var(--color-assignment)" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="return" stroke="var(--color-return)" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="transfer" stroke="var(--color-transfer)" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="maintenance" stroke="var(--color-maintenance)" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="repair" stroke="var(--color-repair)" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="borrow" stroke="var(--color-borrow)" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="assetRequest" stroke="var(--color-assetRequest)" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {focusedTableKey && (
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">{focusedTableLabel}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing only the selected history table from the Reports submenu.
              </p>
            </CardHeader>
          </Card>
        )}

        {focusedTableKey && (
          <DataTable<ReportRow>
            tableId={`reports-focused-${focusedTableKey}`}
            data={scopedRows[focusedTableKey]}
            columns={columns}
            title={focusedTableLabel}
            titleBadge={`${scopedRows[focusedTableKey].length} records`}
            searchPlaceholder={`Search ${focusedTableLabel.toLowerCase()}...`}
            isLoading={loading || (scopeFilterEnabled && scopeCategoryIdsLoading)}
            mobileCardFields={[
              { key: 'reference', label: 'Reference', render: row => row.reference },
              { key: 'asset', label: 'Asset / Request', render: row => row.asset },
              { key: 'person', label: 'User / Requester', render: row => row.person },
              { key: 'status', label: 'Status', render: row => row.status },
              { key: 'date', label: 'Date', render: row => formatDateLabel(row.date) },
            ]}
          >
            <Button size="sm" onClick={() => openExport(focusedTableKey)}>
              <Download className="mr-2 h-4 w-4" />
              Export {focusedTableLabel}
            </Button>
          </DataTable>
        )}

        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-red-600" />
                Export Reports to PDF
              </DialogTitle>
              <DialogDescription>
                Choose all tables or only the sections you want, then apply the
                export filters below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Tables to export</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSelectedExportTables(
                        selectedExportTables.length === REPORT_TABLES.length
                          ? []
                          : REPORT_TABLES.map(table => table.key)
                      )
                    }
                  >
                    {selectedExportTables.length === REPORT_TABLES.length
                      ? 'Clear all'
                      : 'Select all'}
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {REPORT_TABLES.map(table => (
                    <label
                      key={table.key}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-3"
                    >
                      <Checkbox
                        checked={selectedExportTables.includes(table.key)}
                        onCheckedChange={() => toggleExportTable(table.key)}
                      />
                      <span className="text-sm font-medium text-gray-800">
                        {table.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="export-from">From</Label>
                  <Input
                    id="export-from"
                    type="date"
                    value={exportFilters.from}
                    onChange={event =>
                      setExportFilters(prev => ({
                        ...prev,
                        from: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="export-to">To</Label>
                  <Input
                    id="export-to"
                    type="date"
                    value={exportFilters.to}
                    onChange={event =>
                      setExportFilters(prev => ({
                        ...prev,
                        to: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  {isSuperAdmin ? (
                    <Select
                      value={exportFilters.companyId}
                      onValueChange={value =>
                        setExportFilters(prev => ({ ...prev, companyId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All companies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All companies</SelectItem>
                        {companies.map(company => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                        {activeCompany &&
                          !companies.some(company => company.id === activeCompany.id) && (
                            <SelectItem value={activeCompany.id}>
                              {activeCompany.name}
                            </SelectItem>
                          )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="h-10 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-foreground">
                      {companyOptions.find(company => company.id === selectedCompanyId)
                        ?.name ??
                        activeCompany?.name ??
                        'Current Company'}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={exportFilters.departmentId}
                    onValueChange={value =>
                      setExportFilters(prev => ({
                        ...prev,
                        departmentId: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {departments.map(department => (
                        <SelectItem
                          key={department.id ?? department.departmentID ?? department.name}
                          value={department.id ?? department.departmentID ?? department.name}
                        >
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setExportOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={exportPdf}>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
