'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
import { getToken } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCompanyContext } from '@/context/CompanyContext';
import { useAuditFieldLookups } from '@/hooks/useAuditFieldLookups';
import DigitalInitialsRequiredDialog from '@/components/auth/DigitalInitialsRequiredDialog';
import MFARequiredDialog from '@/components/auth/MFARequiredDialog';
import {
  Package,
  CheckCircle,
  Clock,
  ArrowRightLeft,
  UserCheck,
  Archive,
  Trash2,
  RotateCcw,
  Loader2,
  Wrench,
  FileDown,
  HandHelping,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  DashboardAssetTypeGridSkeleton,
  DashboardChartCardSkeleton,
  DashboardRecentActivitySkeleton,
  DashboardStatsGridSkeleton,
} from '@/components/common/pageSkeletons';
import RecentActivityTable from './components/recentActivityTable';
import AssetByTypeCards from './components/assetByTypeCards';
import { DashboardAnalyticsCharts } from './components/dashboardAnalyticsCharts';
import { DashboardChartShell } from './components/DashboardChartShell';
import {
  buildDashboardChartConfig,
  DashboardMultiSeriesChart,
} from './components/dashboardMultiSeriesChart';
import EmployeeRecentActivity from './components/employeeRecentActivity';
import EmployeeAssetStatusChart from './components/employeeAssetStatusChart';
import EmployeeRequestTimeline from './components/employeeRequestTimeline';
import PendingRequestsWidget from './components/pendingRequestsWidget';
import QuickActions from './components/quickActions';
import { generateDashboardPDF } from '@/lib/pdfGenerator/dashboardPdf';
import { downloadPDF } from '@/lib/pdfGenerator';

export interface DashboardStats {
  totalAssets: number;
  activeAssignments: number;
  availableAssets: number;
  deployedAssets: number;
  underMaintenance: number;
  forDisposal: number;
  assetReturnsCount: number;
  borrowRequestsCount: number;
  pendingReturnCount: number;
  pendingTransferCount: number;
  disposedAssets: number;
  borrowedAssets: number;
  underRepair: number;
  transferedAssets: number;
  returnedAssets: number;
  forMaintenance: number;
  forRepair: number;
}

export interface AssetByTypeItem {
  typeName: string;
  typeId: string;
  typeCode?: string;
  total: number;
  inUse: number;
}

export interface MovementDataPoint {
  period: string;
  label: string;
  assigned: number;
  returned: number;
  available?: number;
  transfer?: number;
  repair?: number;
  borrowRequests?: number;
  newAssignments?: number;
  netChange?: number;
  maintenanceEvents?: number;
  repairEvents?: number;
}

export interface NamedCountItem {
  name: string;
  total: number;
  inUse?: number;
}

export interface NamedValueItem {
  name: string;
  value: number;
}

export interface DashboardTrend {
  delta: number;
  pct: number | null;
}

export type DashboardTrends = Partial<
  Record<keyof DashboardStats, DashboardTrend>
>;

export interface RequestPipelineRow {
  stage: string;
  returnCount: number;
  transferCount: number;
  borrowCount: number;
}

export interface DashboardData {
  stats: DashboardStats;
  trends?: DashboardTrends;
  assetByType: AssetByTypeItem[];
  movement: {
    weekly: MovementDataPoint[];
    monthly: MovementDataPoint[];
  };
  statusDistribution: Array<{ name: string; value: number; color: string }>;
  assetsByDepartment?: NamedCountItem[];
  assetsByLocation?: NamedCountItem[];
  categoryMix?: NamedValueItem[];
  brandMix?: NamedValueItem[];
  agingBuckets?: NamedValueItem[];
  warrantyRunway?: NamedValueItem[];
  requestPipeline?: RequestPipelineRow[];
}

interface EmployeeDashboardStats {
  myAssets: number;
  myAssetRequests: number;
  myBorrowingRequests: number;
  myPendingRequests: number;
  myCompletedRequests: number;
  myDeclinedRequests: number;
}

export interface AuditLogItem {
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

const STAT_CARDS: Array<{
  key: keyof DashboardStats;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  invertTrend?: boolean;
}> = [
  {
    key: 'totalAssets',
    title: 'Total Assets',
    icon: Package,
    color: 'text-foreground',
  },
  {
    key: 'activeAssignments',
    title: 'Active Assets',
    icon: UserCheck,
    color: 'text-blue-600',
  },
  {
    key: 'availableAssets',
    title: 'Available',
    icon: CheckCircle,
    color: 'text-green-600',
  },
  {
    key: 'deployedAssets',
    title: 'Deployed',
    icon: Archive,
    color: 'text-indigo-600',
  },
  {
    key: 'disposedAssets',
    title: 'Disposed',
    icon: Trash2,
    color: 'text-red-600',
  },
  {
    key: 'underMaintenance',
    title: 'Under Maintenance',
    icon: Wrench,
    color: 'text-amber-600',
    invertTrend: true,
  },
  {
    key: 'underRepair',
    title: 'Under Repair',
    icon: Loader2,
    color: 'text-gray-600',
    invertTrend: true,
  },
  {
    key: 'borrowRequestsCount',
    title: 'Borrow Requests',
    icon: HandHelping,
    color: 'text-orange-600',
  },
  {
    key: 'pendingTransferCount',
    title: 'Pending Transfer',
    icon: ArrowRightLeft,
    color: 'text-purple-600',
  },
  {
    key: 'transferedAssets',
    title: 'Transfered',
    icon: ArrowRightLeft,
    color: 'text-purple-600',
  },
  {
    key: 'borrowedAssets',
    title: 'Borrowed',
    icon: HandHelping,
    color: 'text-orange-600',
  },
  {
    key: 'pendingReturnCount',
    title: 'Pending Return',
    icon: Clock,
    color: 'text-yellow-600',
  },
  {
    key: 'returnedAssets',
    title: 'Returned',
    icon: RotateCcw,
    color: 'text-emerald-600',
  },
  {
    key: 'forDisposal',
    title: 'For disposal',
    icon: Clock,
    color: 'text-amber-600',
  },
  {
    key: 'forMaintenance',
    title: 'for Maintenance',
    icon: Wrench,
    color: 'text-amber-600',
  },
  {
    key: 'forRepair',
    title: 'For Repair',
    icon: Clock,
    color: 'text-gray-600',
  },
];

const MANAGER_STAT_CARDS: Array<{
  key: keyof DashboardStats;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  invertTrend?: boolean;
}> = [
  {
    key: 'totalAssets',
    title: 'Total Assets',
    icon: Package,
    color: 'text-foreground',
  },
  {
    key: 'activeAssignments',
    title: 'Active Assets',
    icon: UserCheck,
    color: 'text-blue-600',
  },
  {
    key: 'availableAssets',
    title: 'Available',
    icon: CheckCircle,
    color: 'text-green-600',
  },
  {
    key: 'deployedAssets',
    title: 'Deployed',
    icon: Archive,
    color: 'text-indigo-600',
  },
  {
    key: 'underMaintenance',
    title: 'Under Maintenance',
    icon: Wrench,
    color: 'text-amber-600',
    invertTrend: true,
  },
  {
    key: 'underRepair',
    title: 'Under Repair',
    icon: Loader2,
    color: 'text-gray-600',
    invertTrend: true,
  },
  {
    key: 'pendingReturnCount',
    title: 'Pending Return',
    icon: Clock,
    color: 'text-yellow-600',
  },
  {
    key: 'borrowRequestsCount',
    title: 'Borrow Requests',
    icon: HandHelping,
    color: 'text-orange-600',
  },
  {
    key: 'pendingTransferCount',
    title: 'Pending Transfer',
    icon: ArrowRightLeft,
    color: 'text-purple-600',
  },
];

export const StatsCard = memo(function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  invertTrend = false,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: DashboardTrend;
  invertTrend?: boolean;
}) {
  const delta = trend?.delta ?? 0;
  const isUp = delta > 0;
  const good = isUp !== invertTrend;
  const trendColor = !trend || delta === 0
    ? 'text-muted-foreground'
    : good
      ? 'text-green-600'
      : 'text-red-600';
  const TrendIcon = delta === 0 ? Minus : isUp ? TrendingUp : TrendingDown;
  const trendLabel = trend
    ? trend.pct === null
      ? `${Math.abs(delta)}`
      : `${Math.abs(delta)} (${Math.abs(trend.pct)}%)`
    : null;

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground truncate pr-2">
          {title}
        </CardTitle>
        <div className="rounded-lg bg-muted p-1.5 shrink-0">
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <div className="text-2xl font-bold tabular-nums leading-none">
          {value.toLocaleString()}
        </div>
        <div className="h-4 flex items-center">
          {trendLabel ? (
            <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
              <TrendIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{trendLabel}</span>
              <span className="text-muted-foreground font-normal">vs prev week</span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
});

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useCurrentUser();
  const { roleCustodian } = useUserPermissions();
  const { activeCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [employeeActivity, setEmployeeActivity] = useState<AuditLogItem[]>([]);
  const [employeeAssetStatus, setEmployeeAssetStatus] = useState<{ name: string; value: number }[]>([]);
  const [employeeTimelineData, setEmployeeTimelineData] = useState<{ label: string; requests: number }[]>([]);
  const [scope, setScope] = useState<'it' | 'admin'>('it');
  const [movementPeriod, setMovementPeriod] = useState<'weekly' | 'monthly'>(
    'weekly'
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    activeCompany?.id || ''
  );
  const { lookups: auditFieldLookups, mergedIdLabels: auditMergedIdLabels } =
    useAuditFieldLookups();
  const [showDigitalInitialsDialog, setShowDigitalInitialsDialog] = useState(false);
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [securityCheckDone, setSecurityCheckDone] = useState(false);
  const [exporting, setExporting] = useState(false);

  const normalizedRoleName = (user?.role?.name ?? '').trim().toLowerCase();
  const isSuperAdmin = normalizedRoleName === 'global admin';
  const isLocalAdmin = normalizedRoleName === 'admin';
  // Local Admin gets the same IT/Admin scope tabs as Global Admin (Asset List parity),
  // but locked to its own company — no company switcher.
  const showScopeTabs = isSuperAdmin || isLocalAdmin;
  const isEmployee =
    normalizedRoleName === 'user' ||
    normalizedRoleName === 'employee' ||
    normalizedRoleName.includes('employee');
  const isITManager =
    normalizedRoleName === 'it asset manager' ||
    normalizedRoleName === 'it custodian';
  const isAdminManager =
    normalizedRoleName === 'admin asset manager' ||
    normalizedRoleName === 'admin custodian';
  const assetType = roleCustodian?.assetType ?? null;
  const effectiveScope = !isSuperAdmin && !isLocalAdmin && assetType ? assetType : scope;
  const dashboardTitle = isSuperAdmin || isLocalAdmin
    ? scope === 'it'
      ? 'IT Asset Dashboard'
      : 'Admin Asset Dashboard'
    : isITManager || assetType === 'it'
      ? 'IT Asset Dashboard'
      : isAdminManager || assetType === 'admin'
        ? 'Admin Asset Dashboard'
        : isEmployee
          ? 'My Dashboard'
          : 'Asset Dashboard';

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      if (isEmployee && user?.id) {
        const settled = await Promise.allSettled([
          api.get<{ assets?: unknown[] }>('/assets/my-assets'),
          api.get<{ requests?: any[] }>('/asset-requests'),
          api.get<unknown>('/asset-borrow-requests/mine'),
        ]);

        const [myAssetsResult, myAssetRequestsResult, myBorrowsResult] =
          settled;

        setEmployeeActivity([]);

        const safeValue = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
          result.status === 'fulfilled' ? result.value : fallback;

        const myAssetsRes = safeValue(myAssetsResult, { assets: [] as unknown[] });
        const myAssetRequestsRes = safeValue(myAssetRequestsResult, {
          requests: [] as any[],
        });
        const myBorrowRequestsRes = safeValue(myBorrowsResult, {
          borrowRequests: [] as any[],
        });

        if (myAssetRequestsResult.status === 'rejected') {
          console.warn('Employee dashboard: failed to load asset requests', myAssetRequestsResult.reason);
        }

        const myAssets = Array.isArray(myAssetsRes?.assets)
          ? myAssetsRes.assets.length
          : 0;
        const myAssetRequestRows = Array.isArray(myAssetRequestsRes?.requests)
          ? myAssetRequestsRes.requests.filter(
              request => String(request?.user_id ?? '') === user.id
            )
          : [];

        const borrowPayload =
          myBorrowRequestsRes &&
          typeof myBorrowRequestsRes === 'object' &&
          'success' in myBorrowRequestsRes &&
          (myBorrowRequestsRes as { success?: boolean }).success === true &&
          'data' in myBorrowRequestsRes
            ? (myBorrowRequestsRes as { data: { borrowRequests?: any[] } }).data
            : (myBorrowRequestsRes as { borrowRequests?: any[] });
        const borrowRows = Array.isArray(borrowPayload?.borrowRequests)
          ? borrowPayload.borrowRequests
          : [];

        const assetRequestPendingCount = myAssetRequestRows.filter(request =>
          String(request?.status ?? '').toLowerCase().includes('pending')
        ).length;
        const assetRequestCompletedCount = myAssetRequestRows.filter(request =>
          ['approved', 'completed'].some(status =>
            String(request?.status ?? '').toLowerCase().includes(status)
          )
        ).length;
        const assetRequestDeclinedCount = myAssetRequestRows.filter(request =>
          ['declined', 'rejected'].some(status =>
            String(request?.status ?? '').toLowerCase().includes(status)
          )
        ).length;

        const borrowPendingCount = borrowRows.filter(request => {
          const status = String(request?.status ?? '').toLowerCase();
          const approvalStatus = String(request?.approval_status ?? '').toLowerCase();
          return status.includes('pending') || approvalStatus.includes('pending');
        }).length;
        const borrowCompletedCount = borrowRows.filter(request => {
          const status = String(request?.status ?? '').toLowerCase();
          return status.includes('approved') || status.includes('completed');
        }).length;
        const borrowDeclinedCount = borrowRows.filter(request => {
          const status = String(request?.status ?? '').toLowerCase();
          return status.includes('declined') || status.includes('rejected');
        }).length;

        const employeeStats: EmployeeDashboardStats = {
          myAssets,
          myAssetRequests: myAssetRequestRows.length,
          myBorrowingRequests: borrowRows.length,
          myPendingRequests:
            assetRequestPendingCount +
            borrowPendingCount,
          myCompletedRequests:
            assetRequestCompletedCount +
            borrowCompletedCount,
          myDeclinedRequests:
            assetRequestDeclinedCount +
            borrowDeclinedCount,
        };

        // Compute asset status breakdown from my-assets response
        const rawAssets = Array.isArray(myAssetsRes?.assets)
          ? myAssetsRes.assets
          : [];
        const statusMap = new Map<string, number>();
        for (const asset of rawAssets) {
          const a = asset as { status?: string } | null;
          const status = String(a?.status ?? 'Unknown');
          statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
        }
        setEmployeeAssetStatus(
          Array.from(statusMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
        );

        // Compute request timeline from asset requests
        const allRequests = [
          ...myAssetRequestRows.map((r: any) => ({
            date: r?.created_at || r?.createdAt || null,
          })),
          ...borrowRows.map((r: any) => ({
            date: r?.created_at || r?.createdAt || null,
          })),
        ].filter(r => r.date);
        if (allRequests.length > 0) {
          const weekMap = new Map<string, number>();
          for (const req of allRequests) {
            try {
              const d = new Date(req.date);
              const weekStart = new Date(d);
              weekStart.setDate(d.getDate() - d.getDay());
              const label = weekStart.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              weekMap.set(label, (weekMap.get(label) ?? 0) + 1);
            } catch {
              // skip invalid dates
            }
          }
          setEmployeeTimelineData(
            Array.from(weekMap.entries())
              .map(([label, requests]) => ({ label, requests }))
              .sort((a, b) => {
                const da = new Date(a.label);
                const db = new Date(b.label);
                return da.getTime() - db.getTime();
              })
              .slice(-8)
          );
        } else {
          setEmployeeTimelineData([]);
        }

        setDashboardData({
          stats: {
            totalAssets: employeeStats.myAssets,
            activeAssignments: 0,
            availableAssets: 0,
            deployedAssets: 0,
            underMaintenance: 0,
            forDisposal: 0,
            assetReturnsCount: 0,
            borrowRequestsCount: employeeStats.myBorrowingRequests,
            pendingReturnCount: 0,
            pendingTransferCount: 0,
            disposedAssets: 0,
            borrowedAssets: 0,
            underRepair: 0,
            transferedAssets: 0,
            returnedAssets: 0,
            forMaintenance: 0,
            forRepair: 0,
          },
          assetByType: [],
          movement: { weekly: [], monthly: [] },
          statusDistribution: [],
          categoryMix: [
            { name: 'Asset Requests', value: employeeStats.myAssetRequests },
            {
              name: 'Borrowing Requests',
              value: employeeStats.myBorrowingRequests,
            },
            { name: 'Pending', value: employeeStats.myPendingRequests },
            { name: 'Completed', value: employeeStats.myCompletedRequests },
            { name: 'Declined', value: employeeStats.myDeclinedRequests },
          ],
        });
        setAuditLogs([]);
        return;
      }

      const params = new URLSearchParams();
      if (isSuperAdmin) {
        params.set('scope', scope);
        if (selectedCompanyId) params.set('companyId', selectedCompanyId);
      } else if (isLocalAdmin) {
        params.set('scope', scope);
        const localCompanyId = user?.company_id || selectedCompanyId;
        if (localCompanyId) params.set('companyId', localCompanyId);
      } else if (assetType) {
        params.set('scope', assetType);
      }
      const query = params.toString() ? `?${params.toString()}` : '';

      // Fetch dashboard stats
      try {
        const statsRes = await api.get<{ success?: boolean; data?: DashboardData }>(
          `/dashboard/stats${query}`
        );
        const data = statsRes?.data ?? statsRes;
        if (data && typeof data === 'object' && 'stats' in data) {
          setDashboardData(data as DashboardData);
        } else {
          setDashboardData(null);
        }
      } catch (statsError) {
        console.error('Failed to fetch dashboard stats:', statsError);
        toast.error('Failed to load dashboard data');
        setDashboardData(null);
      }

      // Audit logs are restricted to audit-enabled roles; employee dashboards
      // use the dedicated employee activity data above instead.
      if (!isEmployee) {
        try {
        const auditRes = await api.get<{ auditLogs?: AuditLogItem[] }>(
          '/audit?limit=20&sortBy=created_at&sortOrder=DESC&excludeActions=User Login,User Logout,Auto Logout'
        );
        const logs =
          auditRes?.auditLogs ?? (auditRes as any)?.data?.auditLogs ?? [];
        setAuditLogs(Array.isArray(logs) ? logs : []);
        } catch (auditError) {
          // Silently fail - user likely doesn't have audit permission
          console.debug('Audit logs not available (permission denied)');
          setAuditLogs([]);
        }
      } else {
        setAuditLogs([]);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setDashboardData(null);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, isLocalAdmin, scope, selectedCompanyId, isEmployee, user?.id, user?.company_id, assetType]);

  useEffect(() => {
    if (!getToken()) {
      navigate('/login');
    } else if (!userLoading && !user?.role) {
      navigate('/profile');
    }
  }, [navigate, user, userLoading]);

  // Keep the company filter in sync: Global Admin follows the company
  // switcher (activeCompany); Local Admin is locked to its own company.
  useEffect(() => {
    if (isSuperAdmin && activeCompany?.id) {
      setSelectedCompanyId(activeCompany.id);
    } else if (isLocalAdmin && user?.company_id) {
      setSelectedCompanyId(user.company_id);
    }
  }, [isSuperAdmin, isLocalAdmin, activeCompany?.id, user?.company_id]);

  useEffect(() => {
    if (!userLoading && user?.role) {
      fetchDashboardData();
    }
  }, [userLoading, user?.id, user?.role?.name, fetchDashboardData]);

  // Check for missing digital initials and MFA after user is loaded
  useEffect(() => {
    if (!userLoading && user && !securityCheckDone) {
      setSecurityCheckDone(true);

      // Check if digital initials are missing
      if (!user.digitalSignature) {
        setShowDigitalInitialsDialog(true);
      } else if (!user.mfaEnabled) {
        // If initials are set but MFA is missing, show MFA dialog
        setShowMFADialog(true);
      }
    }
  }, [user, userLoading, securityCheckDone]);

  const handleDigitalInitialsGoToProfile = () => {
    setShowDigitalInitialsDialog(false);
    try {
      localStorage.setItem('initials-tour-active', '1');
    } catch {}
    navigate('/profile?tab=basic&tour=initials');
  };

  const handleMFASkip = () => {
    setShowMFADialog(false);
  };

  const handleMFAGoToProfile = () => {
    setShowMFADialog(false);
    navigate('/profile?tab=account');
  };


  const handleRefresh = () => {
    toast.promise(fetchDashboardData(), {
      loading: 'Refreshing…',
      success: 'Dashboard updated',
      error: 'Failed to refresh',
    });
  };

  const handleExportPDF = async () => {
    if (!dashboardData) return;
    setExporting(true);
    try {
      const blob = await generateDashboardPDF(
        dashboardData,
        user?.company,
        auditLogs,
        movementPeriod
      );
      downloadPDF(blob, `Dashboard_Export_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('Dashboard exported as PDF');
    } catch (err) {
      toast.error('Failed to export dashboard PDF');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const movementData = dashboardData?.movement?.[movementPeriod] ?? [];

  const statusDistribution = dashboardData?.statusDistribution ?? [];
  const statusRows = statusDistribution.map(s => ({
    name: s.name,
    value: s.value,
  }));
  const statusRowFills = statusDistribution.map(s =>
    statusTailwindBgToFill(s.color)
  );
  const statusSeries = [{ key: 'value', label: 'Count' }] as const;
  const statusConfig = buildDashboardChartConfig([...statusSeries]);

  const requestsOverTimeSeries = [
    { key: 'borrowRequests', label: 'Borrow Requests' },
    { key: 'transfer', label: 'Transfers' },
    { key: 'repair', label: 'Repairs' },
  ] as const;
  const requestsOverTimeConfig = buildDashboardChartConfig([...requestsOverTimeSeries]);
  const requestsOverTimeRows = movementData.map(d => ({
    label: d.label || d.period,
    borrowRequests: d.borrowRequests ?? 0,
    transfer: d.transfer ?? 0,
    repair: d.repair ?? 0,
  }));

  if (!getToken()) return null;

  const employeeCards: Array<{
    title: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    path: string;
  }> = [
    {
      title: 'My Assets',
      value: dashboardData?.stats.totalAssets ?? 0,
      icon: Package,
      color: 'text-blue-600',
      path: '/my-assets',
    },
    {
      title: 'My Pending Requests',
      value:
        dashboardData?.categoryMix?.find(item => item.name === 'Pending')
          ?.value ?? 0,
      icon: Clock,
      color: 'text-amber-600',
      path: '/assets/borrow',
    },
    {
      title: 'My Completed Requests',
      value:
        dashboardData?.categoryMix?.find(item => item.name === 'Completed')
          ?.value ?? 0,
      icon: CheckCircle,
      color: 'text-green-600',
      path: '/assets/borrow',
    },
    {
      title: 'My Declined Requests',
      value:
        dashboardData?.categoryMix?.find(item => item.name === 'Declined')
          ?.value ?? 0,
      icon: XCircle,
      color: 'text-red-600',
      path: '/assets/borrow',
    },
  ];

  const employeeRequestTypeRows = [
    {
      name: 'Return',
      value: dashboardData?.stats.assetReturnsCount ?? 0,
    },
    {
      name: 'Transfer',
      value: dashboardData?.stats.transferedAssets ?? 0,
    },
    {
      name: 'Asset Request',
      value:
        dashboardData?.categoryMix?.find(item => item.name === 'Asset Requests')
          ?.value ?? 0,
    },
    {
      name: 'Borrowing',
      value:
        dashboardData?.categoryMix?.find(
          item => item.name === 'Borrowing Requests'
        )?.value ?? 0,
    },
  ];
  const employeeRequestTypeSeries = [{ key: 'value', label: 'Count' }] as const;
  const employeeRequestTypeConfig = buildDashboardChartConfig([
    ...employeeRequestTypeSeries,
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={Package}
          title={isEmployee ? 'My Dashboard' : dashboardTitle}
          description={
            isEmployee
              ? 'Quick view of your assets and requests'
              : isITManager
                ? 'IT asset metrics, activity, and pending requests'
                : isAdminManager
                  ? 'Admin asset metrics, activity, and pending requests'
                  : 'Overview of asset metrics and recent activity'
          }
          loading={loading}
        >
          <div className="flex flex-wrap items-center gap-2">
            {showScopeTabs && (
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
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPDF}
              disabled={exporting || loading || !dashboardData}
            >
              <FileDown className="h-4 w-4 mr-1" />
              {exporting ? 'Exporting…' : 'Export PDF'}
            </Button>
          </div>
        </PageHeader>

        <div
          className={
            isEmployee
              ? 'grid grid-cols-1 auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4'
              : 'grid grid-cols-1 auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }
        >
          {loading ? (
            <DashboardStatsGridSkeleton
              count={
                isEmployee
                  ? employeeCards.length
                  : isITManager || isAdminManager
                    ? MANAGER_STAT_CARDS.length
                    : STAT_CARDS.length
              }
            />
          ) : dashboardData ? (
            isEmployee ? (
              employeeCards.map(({ title, value, icon, color, path }) => (
                <button
                  key={title}
                  type="button"
                  className="h-full text-left"
                  onClick={() => navigate(path)}
                >
                  <StatsCard title={title} value={value} icon={icon} color={color} />
                </button>
              ))
            ) : isITManager || isAdminManager ? (
              MANAGER_STAT_CARDS.map(({ key, title, icon, color, invertTrend }) => (
                <StatsCard
                  key={key}
                  title={title}
                  value={dashboardData.stats[key] ?? 0}
                  icon={icon}
                  color={color}
                  trend={dashboardData.trends?.[key]}
                  invertTrend={invertTrend}
                />
              ))
            ) : (
              STAT_CARDS.map(({ key, title, icon, color, invertTrend }) => (
                <StatsCard
                  key={key}
                  title={title}
                  value={dashboardData.stats[key] ?? 0}
                  icon={icon}
                  color={color}
                  trend={dashboardData.trends?.[key]}
                  invertTrend={invertTrend}
                />
              ))
            )
          ) : null}
        </div>

        <div className="space-y-6">
          {isEmployee ? (
            <>
              <DashboardChartShell
                defaultTitle="My Request Type Breakdown"
                defaultDescription="Return, transfer, asset, and borrowing requests"
                defaultVariant="bar"
                chartId="myRequestTypeBreakdown"
                empty={!employeeRequestTypeRows.some(row => row.value > 0)}
                emptyMessage="No request type data"
              >
                {v => (
                  <DashboardMultiSeriesChart
                    variant={v}
                    data={employeeRequestTypeRows}
                    indexKey="name"
                    series={[...employeeRequestTypeSeries]}
                    chartConfig={employeeRequestTypeConfig}
                    className="h-[280px] w-full"
                  />
                )}
              </DashboardChartShell>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <EmployeeAssetStatusChart
                  data={employeeAssetStatus}
                  loading={loading}
                />
                <EmployeeRequestTimeline
                  data={employeeTimelineData}
                  loading={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                <div className="md:col-span-2 min-h-0">
                  <EmployeeRecentActivity
                    activities={employeeActivity}
                    loading={loading}
                  />
                </div>
                <div className="min-h-0">
                  <QuickActions />
                </div>
              </div>
            </>
          ) : (
            <>
              {loading ? (
                <DashboardChartCardSkeleton
                  titleWidth="w-48"
                  descriptionWidth="max-w-md"
                />
              ) : (
                <DashboardChartShell
                  defaultTitle="Asset Status Distribution"
                  defaultDescription="Current status breakdown"
                  defaultVariant="bar"
                  chartId="statusDistribution"
                  empty={!statusRows.length}
                >
                  {v => (
                    <DashboardMultiSeriesChart
                      variant={v}
                      data={statusRows}
                      indexKey="name"
                      series={[...statusSeries]}
                      chartConfig={statusConfig}
                      rowFills={statusRowFills}
                      className="h-[280px] w-full"
                    />
                  )}
                </DashboardChartShell>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Asset by Type</CardTitle>
                  <CardDescription>
                    Breakdown by type — all types included
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <DashboardAssetTypeGridSkeleton />
                  ) : (
                    <AssetByTypeCards data={dashboardData?.assetByType ?? []} />
                  )}
                </CardContent>
              </Card>

              {loading ? (
                <DashboardChartCardSkeleton
                  titleWidth="w-48"
                  descriptionWidth="max-w-sm"
                />
              ) : (
                <DashboardChartShell
                  defaultTitle="Requests Over Time"
                  defaultDescription="Borrow requests, transfers, and repairs per period"
                  defaultVariant="bar"
                  chartId="requestsOverTime"
                  empty={!requestsOverTimeRows.length}
                  emptyMessage="No request data"
                  headerActions={
                    <Tabs
                      value={movementPeriod}
                      onValueChange={v =>
                        setMovementPeriod(v as 'weekly' | 'monthly')
                      }
                    >
                      <TabsList className={segmentTabsListClassName + ' w-full sm:w-auto'}>
                        <TabsTrigger
                          value="weekly"
                          className={segmentTabsTriggerClassName}
                        >
                          Weekly
                        </TabsTrigger>
                        <TabsTrigger
                          value="monthly"
                          className={segmentTabsTriggerClassName}
                        >
                          Monthly
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  }
                >
                  {v => (
                    <DashboardMultiSeriesChart
                      variant={v}
                      data={requestsOverTimeRows}
                      indexKey="label"
                      series={[...requestsOverTimeSeries]}
                      chartConfig={requestsOverTimeConfig}
                      className="h-[280px] w-full"
                    />
                  )}
                </DashboardChartShell>
              )}

              <DashboardAnalyticsCharts
                loading={loading}
                dashboardData={dashboardData}
                movementPeriod={movementPeriod}
                variant={isITManager || isAdminManager ? 'simplified' : 'full'}
              />

              {(isITManager || isAdminManager) && !loading && (
                <PendingRequestsWidget
                  pipeline={dashboardData?.requestPipeline ?? []}
                  scopeLabel={isITManager ? 'Pending IT Requests' : 'Pending Admin Requests'}
                />
              )}
            </>
          )}
        </div>

        {!isEmployee && (
          <Card className="w-full overflow-hidden border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                Recent Activity
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({auditLogs.length} total)
                </span>
              </CardTitle>
              <CardDescription>Latest audit events</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <DashboardRecentActivitySkeleton />
              ) : (
                <RecentActivityTable
                  activities={auditLogs}
                  fieldLookups={auditFieldLookups}
                  mergedIdLabels={auditMergedIdLabels}
                />
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <DigitalInitialsRequiredDialog
        isOpen={showDigitalInitialsDialog}
        onOpenChange={setShowDigitalInitialsDialog}
        onGoToProfile={handleDigitalInitialsGoToProfile}
      />

      <MFARequiredDialog
        isOpen={showMFADialog}
        onOpenChange={setShowMFADialog}
        onGoToProfile={handleMFAGoToProfile}
        onSkip={handleMFASkip}
      />
    </div>
  );
}

function statusTailwindBgToFill(bgClass: string): string {
  const map: Record<string, string> = {
    'bg-green-500': '#22c55e',
    'bg-blue-500': '#3b82f6',
    'bg-amber-500': '#f59e0b',
    'bg-gray-500': '#6b7280',
    'bg-red-500': '#ef4444',
    'bg-purple-500': '#a855f7',
    'bg-orange-500': '#f97316',
  };
  return map[bgClass] ?? 'var(--chart-1)';
}
