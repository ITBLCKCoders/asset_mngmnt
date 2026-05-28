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
import { Tabs, TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
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
import {
  addCompanyLogoToPDF,
  getCompanyAccentColor,
  isBlackCoders,
  resolveCompanyBranding,
} from '@/lib/pdfGenerator/shared';

type ReportTableKey =
  | 'assignment'
  | 'return'
  | 'transfer'
  | 'maintenance'
  | 'repair'
  | 'borrow'
  | 'assetRequest'
  | 'gatePass'
  | 'finance';

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
  gatePass: number;
  finance: number;
};

type GraphPeriod = 'weekly' | 'monthly' | 'yearly';

type ReportRow = {
  id: string;
  reference: string;
  asset: string;
  person: string;
  processor: string;
  /** Asset category id — same scope axis as dashboard (category → department). */
  categoryId: string;
  departmentId: string;
  departmentName: string;
  companyId: string;
  companyName: string;
  status: string;
  date: string;
  pullOutDate?: string;
  returnDate?: string;
  transferee?: string;
  notes: string;
};

type CompanyOption = { id: string; name: string; logo_url?: string | null };
type DepartmentOption = { departmentID?: string; id?: string; name: string };

const REPORT_TABLES: Array<{ key: ReportTableKey; label: string }> = [
  { key: 'assignment', label: 'Assignment History' },
  { key: 'return', label: 'Return History' },
  { key: 'transfer', label: 'Transfer History' },
  { key: 'maintenance', label: 'Maintenance History' },
  { key: 'repair', label: 'Repair History' },
  { key: 'borrow', label: 'Borrow History' },
  { key: 'assetRequest', label: 'Asset Request History' },
  { key: 'gatePass', label: 'Gate Pass History' },
  { key: 'finance', label: 'Finance Reports' },
];

const REPORTS_WITH_STATUS = new Set<ReportTableKey>([
  'maintenance',
  'repair',
  'borrow',
  'assetRequest',
  'gatePass',
  'finance',
]);

const REPORT_ACTION_LABELS: Record<ReportTableKey, string> = {
  assignment: 'Asset assigned',
  return: 'Asset returned',
  transfer: 'Asset transferred',
  maintenance: 'Asset sent to maintenance',
  repair: 'Asset sent to repair',
  borrow: 'Borrow request submitted',
  assetRequest: 'Asset request submitted',
  gatePass: 'Gate pass processed',
  finance: 'Finance reports',
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
  gatePass: emptyFilters(),
  finance: emptyFilters(),
});

const HISTORY_COLORS: Record<ReportTableKey, string> = {
  assignment: 'hsl(221, 83%, 53%)',
  return: 'hsl(160, 84%, 39%)',
  transfer: 'hsl(25, 95%, 53%)',
  maintenance: 'hsl(199, 89%, 48%)',
  repair: 'hsl(0, 84%, 60%)',
  borrow: 'hsl(262, 83%, 58%)',
  assetRequest: 'hsl(47, 96%, 53%)',
  gatePass: 'hsl(188, 86%, 53%)',
  finance: 'hsl(142, 76%, 36%)',
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

const formatUserName = (user?: {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
}) => {
  const name = user?.name?.trim?.() || '';
  const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
  return name || fullName || user?.email || '';
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
  if (section === 'gatePass') return 'gatePass';
  if (section === 'finance') return 'finance';
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
  const [gatePassRows, setGatePassRows] = useState<ReportRow[]>([]);
  const [financeRows, setFinanceRows] = useState<ReportRow[]>([]);
  const [financeData, setFinanceData] = useState<any>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
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
  const sectionFromUrl = searchParams.get('section');
  const focusedTableKey = sectionToTableKey(sectionFromUrl);
  const focusedTableLabel = focusedTableKey
    ? REPORT_TABLES.find(table => table.key === focusedTableKey)?.label ?? ''
    : '';

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
      gatePass: gatePassRows,
      finance: financeRows,
    }),
    [
      assignmentRows,
      returnRows,
      transferRows,
      maintenanceRows,
      repairRows,
      borrowRows,
      assetRequestRows,
      gatePassRows,
      financeRows,
    ]
  );

  const columns = useMemo<ColumnDef<ReportRow>[]>(
    () => [
      { id: 'asset', header: 'Asset', accessorKey: 'asset', size: 220 },
      { id: 'person', header: 'Assigned To', accessorKey: 'person', size: 180 },
      {
        id: 'departmentName',
        header: 'Department',
        accessorKey: 'departmentName',
        size: 150,
      },
      { id: 'processor', header: 'Processed By', accessorKey: 'processor', size: 180 },
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

  const focusedColumns = useMemo<ColumnDef<ReportRow>[]>(
    () => {
      const visibleColumns =
        focusedTableKey && REPORTS_WITH_STATUS.has(focusedTableKey)
          ? columns
          : columns.filter(column => column.id !== 'status');
      const labelAdjustedColumns = visibleColumns.map(column => {
        if (column.id !== 'person') return column;
        return {
          ...column,
          header:
            focusedTableKey === 'return'
              ? 'Returner'
              : focusedTableKey === 'transfer'
                ? 'Transferrer'
                : focusedTableKey === 'borrow'
                  ? 'Borrower'
                  : 'Assigned To',
        };
      });

      const transferColumns =
        focusedTableKey === 'transfer'
          ? labelAdjustedColumns.flatMap(column =>
              column.id === 'person'
                ? [
                    column,
                    {
                      id: 'transferee',
                      header: 'Transferee',
                      accessorKey: 'transferee',
                      size: 180,
                    },
                  ]
                : [column]
            )
          : labelAdjustedColumns;

      if (focusedTableKey !== 'gatePass' && focusedTableKey !== 'borrow') {
        return transferColumns;
      }

      return transferColumns.flatMap(column =>
        column.id === 'date'
          ? [
              {
                id: 'pullOutDate',
                header: focusedTableKey === 'borrow' ? 'Borrow Date' : 'Pull Out Date',
                accessorKey: 'pullOutDate',
                size: 170,
                cell: ({ row }) => formatDateLabel(row.original.pullOutDate ?? ''),
              },
              {
                id: 'returnDate',
                header: 'Return Date',
                accessorKey: 'returnDate',
                size: 170,
                cell: ({ row }) => formatDateLabel(row.original.returnDate ?? ''),
              },
            ]
          : [column]
      );
    },
    [columns, focusedTableKey]
  );

  const focusedMobileCardFields = useMemo(() => {
    const fields = [
      { key: 'asset', label: 'Asset', render: (row: ReportRow) => row.asset },
      {
        key: 'person',
        label:
          focusedTableKey === 'return'
            ? 'Returner'
            : focusedTableKey === 'transfer'
              ? 'Transferrer'
              : focusedTableKey === 'borrow'
                ? 'Borrower'
                : 'Assigned To',
        render: (row: ReportRow) => row.person,
      },
      { key: 'transferee', label: 'Transferee', render: (row: ReportRow) => row.transferee ?? '' },
      { key: 'departmentName', label: 'Department', render: (row: ReportRow) => row.departmentName },
      { key: 'processor', label: 'Processed By', render: (row: ReportRow) => row.processor },
      { key: 'status', label: 'Status', render: (row: ReportRow) => row.status },
      { key: 'date', label: 'Date', render: (row: ReportRow) => formatDateLabel(row.date) },
    ];
    const visibleFields = focusedTableKey && REPORTS_WITH_STATUS.has(focusedTableKey)
      ? fields
      : fields.filter(field => field.key !== 'status');
    const transferFields =
      focusedTableKey === 'transfer'
        ? visibleFields
        : visibleFields.filter(field => field.key !== 'transferee');
    return focusedTableKey === 'gatePass' || focusedTableKey === 'borrow'
      ? transferFields.flatMap(field =>
          field.key === 'date'
            ? [
                {
                  key: 'pullOutDate',
                  label: focusedTableKey === 'borrow' ? 'Borrow Date' : 'Pull Out Date',
                  render: (row: ReportRow) => formatDateLabel(row.pullOutDate ?? ''),
                },
                {
                  key: 'returnDate',
                  label: 'Return Date',
                  render: (row: ReportRow) => formatDateLabel(row.returnDate ?? ''),
                },
              ]
            : [field]
        )
      : transferFields;
  }, [focusedTableKey]);

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
      gatePass: 0,
      finance: 0,
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
      gatePass: { label: 'Gate pass processed', color: HISTORY_COLORS.gatePass },
      finance: { label: 'Finance reports', color: HISTORY_COLORS.finance },
    }),
    []
  );

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

  const exportPdf = useCallback(async () => {
    if (selectedExportTables.length === 0) {
      toast.error('Select at least one table to export.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const selectedCompany =
      exportFilters.companyId === 'all'
        ? activeCompany
        : companies.find(company => company.id === exportFilters.companyId) ??
          activeCompany;
    const companyBranding = await resolveCompanyBranding({
      name: selectedCompany?.name,
      logo_url: selectedCompany?.logo_url,
    });
    const accentColor = getCompanyAccentColor(companyBranding?.name);
    const headerFillColor: [number, number, number] = isBlackCoders(
      companyBranding?.name
    )
      ? [0, 0, 0]
      : [accentColor.r, accentColor.g, accentColor.b];
    const headerTextColor: [number, number, number] = [255, 255, 255];
    const generatedBy =
      formatUserName(user as any) || (user as any)?.username || 'Unknown User';
    const generatedAt = new Date().toLocaleString();
    const assetScopeLabel = effectiveScope === 'admin' ? 'Admin Asset' : 'IT Asset';
    const drawReportHeader = async (title: string, detailText?: string) => {
      const reportTitle = title.toLowerCase().includes('asset')
        ? title
        : `Asset ${title}`;
      await addCompanyLogoToPDF(doc, companyBranding?.logo_url, 14, 11, 45, 16);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(reportTitle, 148.5, 16, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(assetScopeLabel, 148.5, 23, { align: 'center' });
      if (detailText) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(detailText, 14, 34);
      }
    };
    const drawReportFooter = () => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Generated by: ${generatedBy}`, 14, pageHeight - 14);
      doc.text(`Generated at: ${generatedAt}`, 14, pageHeight - 9);
      doc.setTextColor(0, 0, 0);
    };
    let first = true;

    for (const tableKey of selectedExportTables) {
      const label =
        REPORT_TABLES.find(table => table.key === tableKey)?.label ?? tableKey;
      const pdfLabel =
        tableKey === 'maintenance' ? 'Preventive Maintenance History' : label;

      if (tableKey === 'finance') {
        const far = (financeData?.fixedAssetRegister || []).filter(
          (asset: any) => String(asset.status || '').toLowerCase() === 'assigned'
        );
        const dep = financeData?.depreciationSchedule || [];
        const summary = financeData?.assetValuationSummary;

        // Page 1: Fixed Asset Register
        if (!first) doc.addPage();
        first = false;
        await drawReportHeader(
          'Fixed Asset Register',
          `Company: ${
            exportFilters.companyId === 'all'
              ? 'All'
              : companies.find(c => c.id === exportFilters.companyId)?.name ?? 'Selected'
          }   Status: Assigned`
        );
        autoTable(doc, {
          startY: 38,
          head: [['No.', 'Asset Code', 'Name', 'Category', 'Purchase Date', 'Asset Value', 'Salvage Value', 'Dep Method', 'Useful Life (yrs)', 'Annual Dep', 'Status']],
          body: far.length > 0
            ? far.map((a: any, index: number) => [
                String(index + 1),
                a.asset_code || '',
                a.name || '',
                a.category_name || '',
                a.purchase_date ? formatDateLabel(a.purchase_date) : '',
                a.asset_value != null ? `PHP ${Number(a.asset_value).toLocaleString()}` : '',
                a.salvage_value != null ? `PHP ${Number(a.salvage_value).toLocaleString()}` : '',
                a.depreciation_method || '',
                a.useful_life_years ?? '',
                a.annual_depreciation != null ? `PHP ${Number(a.annual_depreciation).toLocaleString()}` : '',
                a.status || '',
              ])
            : [['No records found', '', '', '', '', '', '', '', '', '', '']],
          styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
          headStyles: { fillColor: headerFillColor, textColor: headerTextColor },
          didDrawPage: drawReportFooter,
        });

        // Page 2: Depreciation Schedule
        doc.addPage();
        await drawReportHeader('Depreciation Schedule');
        autoTable(doc, {
          startY: 38,
          head: [['No.', 'Asset Code', 'Name', 'Asset Value', 'Accumulated Dep', 'Net Book Value', 'Years Depreciated', 'Remaining Life (yrs)', 'Status']],
          body: dep.length > 0
            ? dep.map((d: any, index: number) => [
                String(index + 1),
                d.asset_code || '',
                d.name || '',
                d.asset_value != null ? `PHP ${Number(d.asset_value).toLocaleString()}` : '',
                `PHP ${Number(d.accumulated_depreciation || 0).toLocaleString()}`,
                `PHP ${Number(d.net_book_value || 0).toLocaleString()}`,
                Number(d.years_depreciated || 0).toFixed(2),
                d.remaining_useful_life != null ? Number(d.remaining_useful_life).toFixed(2) : '',
                d.status || '',
              ])
            : [['No records found', '', '', '', '', '', '', '', '']],
          styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
          headStyles: { fillColor: headerFillColor, textColor: headerTextColor },
          didDrawPage: drawReportFooter,
        });

        // Page 3: Asset Valuation Summary
        if (summary) {
          doc.addPage();
          await drawReportHeader('Asset Valuation Summary');
          doc.setFontSize(10);
          doc.text(`Total Asset Value: PHP ${(summary.totalAssetValue || 0).toLocaleString()}`, 14, 40);
          doc.text(`Total Accumulated Depreciation: PHP ${(summary.totalAccumulatedDepreciation || 0).toLocaleString()}`, 14, 46);
          doc.text(`Total Net Book Value: PHP ${(summary.totalNetBookValue || 0).toLocaleString()}`, 14, 52);

          if (summary.byCategory?.length > 0) {
            doc.setFontSize(12);
            doc.text('By Category', 14, 62);
            autoTable(doc, {
              startY: 66,
              head: [['No.', 'Category', 'Asset Value', 'Accumulated Dep', 'Net Book Value', 'Count']],
              body: summary.byCategory.map((c: any, index: number) => [
                String(index + 1),
                c.category,
                `PHP ${(c.totalAssetValue || 0).toLocaleString()}`,
                `PHP ${(c.totalAccumulatedDepreciation || 0).toLocaleString()}`,
                `PHP ${(c.totalNetBookValue || 0).toLocaleString()}`,
                String(c.assetCount),
              ]),
              styles: { fontSize: 8, cellPadding: 2 },
              headStyles: { fillColor: headerFillColor, textColor: headerTextColor },
              didDrawPage: drawReportFooter,
            });
          }

          if (summary.byDepartment?.length > 0) {
            const deptStartY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 74;
            doc.setFontSize(12);
            doc.text('By Department', 14, deptStartY);
            autoTable(doc, {
              startY: deptStartY + 4,
              head: [['No.', 'Department', 'Asset Value', 'Accumulated Dep', 'Net Book Value', 'Count']],
              body: summary.byDepartment.map((d: any, index: number) => [
                String(index + 1),
                d.department,
                `PHP ${(d.totalAssetValue || 0).toLocaleString()}`,
                `PHP ${(d.totalAccumulatedDepreciation || 0).toLocaleString()}`,
                `PHP ${(d.totalNetBookValue || 0).toLocaleString()}`,
                String(d.assetCount),
              ]),
              styles: { fontSize: 8, cellPadding: 2 },
              headStyles: { fillColor: headerFillColor, textColor: headerTextColor },
              didDrawPage: drawReportFooter,
            });
          }
          if (!summary.byCategory?.length && !summary.byDepartment?.length) {
            drawReportFooter();
          }
        }
      } else {
        const rows = tableRows[tableKey].filter(row => {
          if (scopeFilterEnabled) {
            if (!rowMatchesDashboardCategoryScope(row, scopeCategoryIdSet)) {
              return false;
            }
          }
          return rowMatchesFilters(row, exportFilters);
        });
        const showStatus = REPORTS_WITH_STATUS.has(tableKey);
        const showGatePassDates = tableKey === 'gatePass';
        const showBorrowDates = tableKey === 'borrow';
        const showTransferee = tableKey === 'transfer';
        const personHeader =
          tableKey === 'return'
            ? 'Returner'
            : tableKey === 'transfer'
              ? 'Transferrer'
              : tableKey === 'borrow'
                ? 'Borrower'
                : 'Assigned To';

        if (!first) doc.addPage();
        first = false;

        await drawReportHeader(
          pdfLabel,
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
          }`
        );

        autoTable(doc, {
          startY: 38,
          head: [
            [
              'No.',
              'Asset',
              personHeader,
              ...(showTransferee ? ['Transferee'] : []),
              'Department',
              'Processed By',
              'Company',
              ...(showStatus ? ['Status'] : []),
              ...(showGatePassDates
                ? ['Pull Out Date', 'Return Date']
                : showBorrowDates
                  ? ['Borrow Date', 'Return Date']
                  : ['Date']),
              'Notes',
            ],
          ],
          body:
            rows.length > 0
              ? rows.map((row, index) => [
                  String(index + 1),
                  row.asset,
                  row.person,
                  ...(showTransferee ? [row.transferee ?? ''] : []),
                  row.departmentName,
                  row.processor,
                  row.companyName,
                  ...(showStatus ? [row.status] : []),
                  ...(showGatePassDates || showBorrowDates
                    ? [
                        formatDateLabel(row.pullOutDate ?? ''),
                        formatDateLabel(row.returnDate ?? ''),
                      ]
                    : [formatDateLabel(row.date)]),
                  row.notes,
                ])
              : [
                  [
                    'No records found',
                    '',
                    '',
                    '',
                    ...(showTransferee ? [''] : []),
                    '',
                    '',
                    ...(showStatus ? [''] : []),
                    ...(showGatePassDates || showBorrowDates ? ['', ''] : ['']),
                    '',
                  ],
                ],
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
          headStyles: { fillColor: headerFillColor, textColor: headerTextColor },
          didDrawPage: drawReportFooter,
        });
      }
    }

    doc.save(`reports-${Date.now()}.pdf`);
    setExportOpen(false);
    toast.success('Reports PDF exported successfully.');
  }, [
    companies,
    activeCompany,
    departments,
    effectiveScope,
    exportFilters,
    financeData,
    scopeCategoryIdSet,
    scopeFilterEnabled,
    selectedExportTables,
    tableRows,
    user,
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
          gatePassRes,
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
          api.get<any>('/gate-passes'),
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

        const financeCompanyId =
          user.role?.name === 'Super Admin'
            ? selectedCompanyIdRef.current || activeId
            : '';
        const financeScope = isSuperAdmin ? scope : null;
        const financeParams = new URLSearchParams();
        if (financeCompanyId.length > 0) {
          financeParams.set('companyId', financeCompanyId);
        }
        if (financeScope) {
          financeParams.set('scope', financeScope);
        }
        const financePath = `/reports/finance-reports${financeParams.toString() ? `?${financeParams.toString()}` : ''}`;

        const financeRes = await api
          .get<any>(financePath)
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
            processor:
              formatUserName(assignment.assigned_by) ||
              formatUserName(assignment.assignedBy) ||
              assignment.assignedBy ||
              assignment.processed_by ||
              'System',
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
            processor: row.processed_by ?? row.processor ?? 'System',
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
          transfersRes.status === 'fulfilled'
            ? ((transfersRes.value as any)?.data?.records ?? (transfersRes.value as any)?.records ?? [])
            : [];
        setTransferRows(
          transfers.map((row: any) => ({
            id: String(row.recordId ?? row.formId ?? Math.random()),
            reference: makeReference(row.formNumber ?? row.formId, 'TRANSFER'),
            asset: `${row.asset?.name ?? 'Unknown Asset'} (${row.asset?.code ?? 'No Code'})`,
            categoryId: String(row.asset?.category_id ?? ''),
            person: row.from?.name ?? 'Unknown',
            transferee: row.to?.name ?? 'Unknown',
            processor:
              row.processor ||
              row.processed_by ||
              formatUserName(row.assignment?.assigned_by) ||
              row.dept_head_user_name ||
              row.it_manager_user_name ||
              row.actorName ||
              row.actionBy ||
              'System',
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
            processor:
              row.approved_by_name ??
              row.processed_by ??
              row.approved_by ??
              row.declined_by ??
              row.staff_name ??
              'Pending',
            departmentId: '',
            departmentName: row.requester_department_name ?? 'Unassigned',
            companyId: defaultCompanyId,
            companyName: defaultCompanyName,
            status: parseBorrowStatus(row),
            date: row.created_at ?? '',
            pullOutDate: row.created_at ?? '',
            returnDate: row.returned_at ?? row.expected_return_at ?? '',
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
            processor:
              row.processed_by ??
              row.processedBy ??
              row.approved_by ??
              row.approvedBy ??
              row.rejected_by ??
              row.rejectedBy ??
              row.admin?.name ??
              'Pending',
            departmentId: String(row.department?.id ?? ''),
            departmentName: row.department?.name ?? 'Unassigned',
            companyId: defaultCompanyId,
            companyName: defaultCompanyName,
            status: parseRequestStatus(row.status),
            date: row.request_date ?? '',
            notes: row.notes ?? row.admin_notes ?? 'No notes',
          }))
        );

        const gatePassPayload =
          gatePassRes.status === 'fulfilled'
            ? gatePassRes.value?.data?.gatePasses ?? gatePassRes.value?.gatePasses ?? []
            : [];
        setGatePassRows(
          (Array.isArray(gatePassPayload) ? gatePassPayload : []).map((row: any) => ({
            id: String(row.gate_pass_id ?? row.gatePassId ?? Math.random()),
            reference: makeReference(row.gate_pass_id ?? row.gatePassId, 'GATEPASS'),
            asset: `${row.asset_name ?? 'Unknown Asset'} (${row.asset_code ?? 'No Code'})`,
            categoryId: String(row.category_id ?? row.categoryId ?? ''),
            person:
              row.first_name || row.last_name
                ? `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()
                : row.user_name ?? row.username ?? row.email ?? row.user_id ?? 'Unknown User',
            processor:
              row.processed_by_name ??
              row.created_by_name ??
              row.processed_by ??
              row.created_by ??
              'System',
            departmentId: String(row.destination_department_id ?? ''),
            departmentName: row.department_name ?? 'Unassigned',
            companyId: defaultCompanyId,
            companyName: defaultCompanyName,
            status: row.status ?? 'Unknown',
            date: row.created_at ?? row.expected_return_date ?? '',
            pullOutDate: row.created_at ?? '',
            returnDate: row.actual_return_date ?? row.expected_return_date ?? '',
            notes: row.purpose ?? row.notes ?? 'No notes',
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
            processor: row.performedBy ?? 'System',
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
            processor: row.performedBy ?? 'System',
            departmentId: String(row.departmentId ?? ''),
            departmentName: row.departmentName ?? 'Unassigned',
            companyId: String(row.companyId ?? defaultCompanyId),
            companyName: row.companyName ?? defaultCompanyName,
            status: row.status ?? 'Repair',
            date: row.createdAt ?? '',
            notes: row.details ?? row.action ?? 'No notes',
          }))
        );

        const financeData =
          financeRes.status === 'fulfilled'
            ? (financeRes.value as { data?: any })?.data ?? {}
            : {};

        console.log('Finance data received:', JSON.stringify(financeData, null, 2));
        console.log('Fixed Asset Register count:', financeData.fixedAssetRegister?.length);
        console.log('Depreciation Schedule count:', financeData.depreciationSchedule?.length);
        console.log('Asset Valuation Summary:', financeData.assetValuationSummary);
        setFinanceData(financeData);

        const fixedAssets = financeData.fixedAssetRegister || [];
        setFinanceRows(
          fixedAssets.map((asset: any, i: number) => ({
            id: `finance-${asset.assetID || i}`,
            reference: asset.asset_code || `FAR-${i + 1}`,
            asset: asset.name || 'Unknown Asset',
            person: asset.brand || 'N/A',
            processor: 'System',
            categoryId: '',
            departmentId: asset.department_name || '',
            departmentName: asset.department_name || 'Unassigned',
            companyId: defaultCompanyId,
            companyName: asset.company_name || defaultCompanyName,
            status: asset.status || 'Unknown',
            date: asset.purchase_date || asset.created_at || '',
            notes: [
              asset.category_name ? `Cat: ${asset.category_name}` : '',
              asset.model ? `Model: ${asset.model}` : '',
              asset.serial ? `S/N: ${asset.serial}` : '',
              asset.asset_value ? `Val: ₱${Number(asset.asset_value).toLocaleString()}` : '',
              asset.depreciation_method ? `DepMethod: ${asset.depreciation_method}` : '',
              asset.useful_life_years ? `Life: ${asset.useful_life_years}yrs` : '',
              asset.annual_depreciation ? `AnnualDep: ₱${Number(asset.annual_depreciation).toLocaleString()}` : '',
              asset.location_name ? `Loc: ${asset.location_name}` : '',
              asset.condition ? `Cond: ${asset.condition}` : '',
            ].filter(Boolean).join(' | '),
          }))
        );
      } catch {
        toast.error('Failed to load reports page data.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isSuperAdmin, refreshTick, user?.id, user?.role?.name, userLoading, activeCompany?.id, scope]);

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
          title={focusedTableKey ? focusedTableLabel : reportsTitle}
          description={
            focusedTableKey
              ? 'Showing only the selected history table from the Reports submenu.'
              : isSuperAdmin
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
                <TabsList className={segmentTabsListClassName + ' grid grid-cols-2 max-w-full sm:max-w-[280px]'}>
                  <TabsTrigger
                    value="it"
                    className={segmentTabsTriggerClassName}
                  >
                    IT Asset
                  </TabsTrigger>
                  <TabsTrigger
                    value="admin"
                    className={segmentTabsTriggerClassName}
                  >
                    Admin Asset
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <Button variant="header" size="sm" onClick={() => openExport()}>
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
                  <TabsList className={segmentTabsListClassName + ' grid grid-cols-3'}>
                    <TabsTrigger value="weekly" className={segmentTabsTriggerClassName}>Weekly</TabsTrigger>
                    <TabsTrigger value="monthly" className={segmentTabsTriggerClassName}>Monthly</TabsTrigger>
                    <TabsTrigger value="yearly" className={segmentTabsTriggerClassName}>Yearly</TabsTrigger>
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
                  <TabsList className={segmentTabsListClassName + ' grid grid-cols-3'}>
                    <TabsTrigger value="weekly" className={segmentTabsTriggerClassName}>Weekly</TabsTrigger>
                    <TabsTrigger value="monthly" className={segmentTabsTriggerClassName}>Monthly</TabsTrigger>
                    <TabsTrigger value="yearly" className={segmentTabsTriggerClassName}>Yearly</TabsTrigger>
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

        {focusedTableKey && focusedTableKey !== 'finance' && (
          <DataTable<ReportRow>
            tableId={`reports-focused-${focusedTableKey}`}
            data={scopedRows[focusedTableKey]}
            columns={focusedColumns}
            title={focusedTableLabel}
            titleBadge={`${scopedRows[focusedTableKey].length} records`}
            searchPlaceholder={`Search ${focusedTableLabel.toLowerCase()}...`}
            isLoading={loading || (scopeFilterEnabled && scopeCategoryIdsLoading)}
            mobileCardFields={focusedMobileCardFields}
          >
            <Button variant="header" size="sm" onClick={() => openExport(focusedTableKey)}>
              <Download className="mr-2 h-4 w-4" />
              Export {focusedTableLabel}
            </Button>
          </DataTable>
        )}

        {focusedTableKey === 'finance' && (
          <>
            {!financeData && loading && (
              <Card className="border border-border/60 shadow-sm">
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">Loading finance reports...</p>
                </CardContent>
              </Card>
            )}
            {financeData && (
          <div className="space-y-6">
            {/* Asset Valuation Summary */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="bg-red-600 rounded-t-lg pb-4">
                <CardTitle className="text-xl font-semibold text-white">Asset Valuation Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-8">
                <div className="grid gap-6 md:grid-cols-3 mb-8">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Asset Value</p>
                    <p className="text-3xl font-bold tracking-tight text-foreground">
                      ₱{financeData.assetValuationSummary?.totalAssetValue?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Accumulated Depreciation</p>
                    <p className="text-3xl font-bold tracking-tight text-orange-600">
                      ₱{financeData.assetValuationSummary?.totalAccumulatedDepreciation?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Net Book Value</p>
                    <p className="text-3xl font-bold tracking-tight text-green-600">
                      ₱{financeData.assetValuationSummary?.totalNetBookValue?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">By Category</h3>
                    <div className="space-y-2">
                      {financeData.assetValuationSummary?.byCategory?.map((item: any) => (
                        <div key={item.category} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{item.category}</p>
                            <p className="text-sm text-muted-foreground">{item.assetCount} assets</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <p className="font-semibold">₱{item.totalNetBookValue.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">NBV</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">By Department</h3>
                    <div className="space-y-2">
                      {financeData.assetValuationSummary?.byDepartment?.map((item: any) => (
                        <div key={item.department} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{item.department}</p>
                            <p className="text-sm text-muted-foreground">{item.assetCount} assets</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <p className="font-semibold">₱{item.totalAssetValue.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mb-1">Asset Value</p>
                            <p className="font-semibold">₱{item.totalNetBookValue.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">NBV</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fixed Asset Register */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="bg-red-600 rounded-t-lg pb-4">
                <CardTitle className="text-xl font-semibold text-white">Fixed Asset Register</CardTitle>
                <p className="text-sm text-red-100">
                  Complete inventory of all assets with financial details
                </p>
              </CardHeader>
              <CardContent className="pt-8">
                <DataTable
                  tableId="fixed-asset-register"
                  data={financeData.fixedAssetRegister || []}
                  columns={[
                    { id: 'asset_code', header: 'Asset Code', accessorKey: 'asset_code', size: 150 },
                    { id: 'name', header: 'Asset Name', accessorKey: 'name', size: 200 },
                    { id: 'category_name', header: 'Category', accessorKey: 'category_name', size: 150 },
                    { id: 'asset_value', header: 'Asset Value', accessorKey: 'asset_value', size: 120, cell: ({ row }) => `₱${row.original.asset_value?.toLocaleString() || '0'}` },
                    { id: 'salvage_value', header: 'Salvage Value', accessorKey: 'salvage_value', size: 120, cell: ({ row }) => `₱${row.original.salvage_value?.toLocaleString() || '0'}` },
                    { id: 'depreciation_method', header: 'Depreciation Method', accessorKey: 'depreciation_method', size: 150 },
                    { id: 'useful_life_years', header: 'Useful Life (Years)', accessorKey: 'useful_life_years', size: 120 },
                    { id: 'annual_depreciation', header: 'Annual Depreciation', accessorKey: 'annual_depreciation', size: 150, cell: ({ row }) => `₱${row.original.annual_depreciation?.toLocaleString() || '0'}` },
                    { id: 'department_name', header: 'Department', accessorKey: 'department_name', size: 150 },
                    { id: 'status', header: 'Status', accessorKey: 'status', size: 120 },
                  ]}
                  title="Fixed Asset Register"
                  titleBadge={`${financeData.fixedAssetRegister?.length || 0} assets`}
                  searchPlaceholder="Search assets..."
                  isLoading={loading}
                />
              </CardContent>
            </Card>

            {/* Depreciation Schedule */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="bg-red-600 rounded-t-lg pb-4">
                <CardTitle className="text-xl font-semibold text-white">Depreciation Schedule</CardTitle>
                <p className="text-sm text-red-100">
                  Current depreciation status for all assets
                </p>
              </CardHeader>
              <CardContent className="pt-8">
                <DataTable
                  tableId="depreciation-schedule"
                  data={financeData.depreciationSchedule || []}
                  columns={[
                    { id: 'asset_code', header: 'Asset Code', accessorKey: 'asset_code', size: 150 },
                    { id: 'name', header: 'Asset Name', accessorKey: 'name', size: 200 },
                    { id: 'asset_value', header: 'Asset Value', accessorKey: 'asset_value', size: 120, cell: ({ row }) => `₱${row.original.asset_value?.toLocaleString() || '0'}` },
                    { id: 'accumulated_depreciation', header: 'Accumulated Depreciation', accessorKey: 'accumulated_depreciation', size: 180, cell: ({ row }) => `₱${row.original.accumulated_depreciation?.toLocaleString() || '0'}` },
                    { id: 'net_book_value', header: 'Net Book Value', accessorKey: 'net_book_value', size: 150, cell: ({ row }) => `₱${row.original.net_book_value?.toLocaleString() || '0'}` },
                    { id: 'years_depreciated', header: 'Years Depreciated', accessorKey: 'years_depreciated', size: 150, cell: ({ row }) => row.original.years_depreciated?.toFixed(1) || '0' },
                    { id: 'remaining_useful_life', header: 'Remaining Useful Life', accessorKey: 'remaining_useful_life', size: 180, cell: ({ row }) => row.original.remaining_useful_life?.toFixed(1) || 'N/A' },
                    { id: 'depreciation_method', header: 'Depreciation Method', accessorKey: 'depreciation_method', size: 150 },
                  ]}
                  title="Depreciation Schedule"
                  titleBadge={`${financeData.depreciationSchedule?.length || 0} assets`}
                  searchPlaceholder="Search assets..."
                  isLoading={loading}
                />
              </CardContent>
            </Card>
          </div>
            )}
          </>
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
