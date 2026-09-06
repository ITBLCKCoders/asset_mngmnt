'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Package,
  User,
  MapPin,
  Building,
  CheckCircle2,
  Users,
  Warehouse,
  Settings,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchWithColumnFilter } from '@/components/common/SearchWithColumnFilter';
import { ASSET_SEARCH_COLUMNS_BASIC } from '@/utils/assetSearchColumns';
import { Button } from '@/components/ui/button';
import { useCompanyContext } from '@/context/CompanyContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { computeNextMaintenanceDate } from '@/utils/computeNextMaintenanceDate';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { DataTable } from '@/components/ui/dataTable';
import { Shimmer } from '@/components/ui/shimmer';
import type { ColumnDef } from '@tanstack/react-table';

type MaintenanceRow = {
  id: string;
  asset: string;
  date: string;
  status: string;
  notes: string;
};
const maintenanceHistoryColumns: ColumnDef<MaintenanceRow>[] = [
  { id: 'asset', header: 'Asset', accessorKey: 'asset', size: 200 },
  { id: 'date', header: 'Date', accessorKey: 'date', size: 120 },
  { id: 'status', header: 'Status', accessorKey: 'status', size: 120 },
  { id: 'notes', header: 'Notes', accessorKey: 'notes', size: 200 },
];

interface Asset {
  id: string;
  name: string;
  status: string;
  category: string;
  type: string;
  serialNo: string;
  assignedTo: string;
  department: string;
  location: string;
  maintenanceSchedule?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  specifications?: Array<{
    assetId: string;
    assetName: string;
    specDescription: string;
  }>;
}

interface Department {
  departmentID: string;
  name: string;
  code: string;
}

interface Location {
  locationID: string;
  name: string;
  floor_unit: string;
  building: string;
  department_id?: string;
}

interface User {
  userID: string;
  email: string;
  first_name: string;
  last_name: string;
  department_id: string;
  company: any;
}

interface AssetAssignment {
  assignmentID: string;
  asset: {
    id: string;
    code: string;
    name: string;
    category_id: string;
    type_id: string;
  };
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    employeeNumber?: string;
    position?: string;
  };
  department: {
    id: string;
    name: string;
  } | null;
  location: {
    id: string;
    name: string;
    floor_unit: string;
    building: string;
    room_name?: string;
  } | null;
  assigned_date: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  assignment_notes: string | null;
  status: string;
  assigned_by: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export default function AssetsMaintenance() {
  const { user: currentUser } = useCurrentUser();
  const { hasPermission } = useUserPermissions();
  const { activeCompany } = useCompanyContext();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [maintenanceType, setMaintenanceType] = useState<string>('');
  const [maintenanceSchedule, setMaintenanceSchedule] = useState<string>('');
  const [maintenanceDescription, setMaintenanceDescription] =
    useState<string>('');
  const [maintenanceCost, setMaintenanceCost] = useState<string>('');
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState<string>('');
  const [scheduling, setScheduling] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
const [searchColumn, setSearchColumn] = useState('all');
  const [expandedAssets, setExpandedAssets] = useState<string[]>([]);

  /** xl+: scheduling card height matches Maintenance configuration (intrinsic), never taller. */
  const maintenanceConfigCardRef = useRef<HTMLDivElement>(null);
  const [schedulingCardHeightPx, setSchedulingCardHeightPx] = useState<
    number | null
  >(null);

  const syncSchedulingHeightToConfig = useCallback(() => {
    const el = maintenanceConfigCardRef.current;
    const xl = window.matchMedia('(min-width: 1280px)');
    if (!el || !xl.matches) {
      setSchedulingCardHeightPx(null);
      return;
    }
    setSchedulingCardHeightPx(el.offsetHeight);
  }, []);

  useEffect(() => {
    const el = maintenanceConfigCardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      syncSchedulingHeightToConfig();
    });
    ro.observe(el);

    const xl = window.matchMedia('(min-width: 1280px)');
    const onViewport = () => syncSchedulingHeightToConfig();
    xl.addEventListener('change', onViewport);
    window.addEventListener('resize', onViewport);

    syncSchedulingHeightToConfig();

    return () => {
      ro.disconnect();
      xl.removeEventListener('change', onViewport);
      window.removeEventListener('resize', onViewport);
    };
  }, [syncSchedulingHeightToConfig]);

  const fetchAssets = async () => {
    try {
      // Determine companyId based on user role
      let companyId: string | undefined;
      const userRole = currentUser?.role?.name?.toLowerCase();
      if (userRole === 'global admin' || userRole === 'admin') {
        // Global Admin and Admin use active company from CompanyContext
        companyId = activeCompany?.id || undefined;
      } else {
        // IT asset and Admin asset users use their assigned company
        companyId = currentUser?.company_id || undefined;
      }

      const queryParams = new URLSearchParams();
      if (companyId) {
        queryParams.append('companyId', companyId);
      }
      const url = queryParams.toString() ? `/assets?${queryParams.toString()}` : '/assets';
      const response = await api.get(url);
      const assetsData = response.assets || [];
      const transformedAssets = assetsData.map((asset: any) => {
        const createdAtParsed = asset.created_at
          ? new Date(
              String(asset.created_at).replace(' ', 'T') +
                (String(asset.created_at).includes('Z') ? '' : 'Z')
            )
          : new Date();
        const computedNext = computeNextMaintenanceDate(
          asset.maintenance_schedule,
          {
            lastMaintenanceDate: asset.last_maintenance_date,
            purchaseDate: asset.purchase_date,
            createdAt: createdAtParsed,
          }
        );
        return {
          id: asset.asset_code,
          name: asset.name,
          status: asset.status,
          category: asset.category_name || asset.category_id,
          type: asset.type_name || asset.type_id,
          serialNo: asset.serial,
          assignedTo: asset.created_by_name || asset.created_by,
          department: asset.department_name || '',
          location: `${asset.location_name || ''}${asset.room_name ? ` - ${asset.room_name}` : ''}`,
          maintenanceSchedule: asset.maintenance_schedule,
          lastMaintenanceDate: asset.last_maintenance_date,
          nextMaintenanceDate:
            asset.next_maintenance_date ||
            (computedNext ? computedNext.toISOString() : undefined),
          specifications: asset.specifications || [],
        };
      });
      setAssets(transformedAssets);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      toast.error('Failed to load assets');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations');
      setLocations(response.locations || []);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocations([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };


  const fetchAssignments = async () => {
    try {
      const response = await api.get('/asset-assignments');
      setAssignments(response.assignments || []);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      setAssignments([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      // Fetch assets and other data
      await Promise.all([
        fetchAssets(),
        fetchDepartments(),
        fetchLocations(),
        fetchUsers(),
        fetchAssignments(),
      ]);
      setLoading(false);
    };
    fetchData();
  }, [activeCompany?.id]);

  const handleAssetSelection = (assetId: string, checked: boolean | string) => {
    const isChecked = Boolean(checked);
    if (isChecked) {
      setSelectedAssets(prev => [...prev, assetId]);
    } else {
      setSelectedAssets(prev => prev.filter(id => id !== assetId));
    }
  };

  const handleMaintenanceSchedule = async () => {
    if (selectedAssets.length === 0) {
      toast.error('Please select at least one asset for maintenance');
      return;
    }

    if (!maintenanceType) {
      toast.error('Please select the type of maintenance');
      return;
    }

    if (!maintenanceSchedule) {
      toast.error('Please select maintenance frequency');
      return;
    }

    if (!maintenanceDescription.trim()) {
      toast.error('Please provide maintenance description');
      return;
    }

    setScheduling(true);
    try {
      // For each selected asset, schedule maintenance
      const maintenancePromises = selectedAssets.map(async assetId => {
        const maintenanceData = {
          assetId,
          type: maintenanceType,
          schedule: maintenanceSchedule,
          description: maintenanceDescription,
          estimatedCost: maintenanceCost ? parseFloat(maintenanceCost) : null,
          nextMaintenanceDate: nextMaintenanceDate || null,
          scheduledBy: currentUser?.id,
          scheduledDate: new Date().toISOString(),
          status: 'Scheduled',
        };

        return api.post('/asset-maintenance', maintenanceData);
      });

      await Promise.all(maintenancePromises);

      toast.success(
        `Successfully scheduled maintenance for ${selectedAssets.length} asset(s)`
      );

      // Reset form
      setSelectedAssets([]);
      setMaintenanceType('');
      setMaintenanceSchedule('');
      setMaintenanceDescription('');
      setMaintenanceCost('');
      setNextMaintenanceDate('');

      // Refresh assets
      await fetchAssets();
    } catch (error) {
      console.error('Failed to schedule maintenance:', error);
      toast.error('Failed to schedule maintenance');
    } finally {
      setScheduling(false);
    }
  };

  const filteredAssets = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return assets.filter(asset => {
      if (asset.status === 'Disposed') return false;
      if (!q) return true;
      if (searchColumn === 'all') {
        return (
          asset.name.toLowerCase().includes(q) ||
          asset.id.toLowerCase().includes(q) ||
          asset.category.toLowerCase().includes(q) ||
          asset.type.toLowerCase().includes(q) ||
          asset.serialNo.toLowerCase().includes(q) ||
          asset.department.toLowerCase().includes(q) ||
          asset.location.toLowerCase().includes(q)
        );
      }
      const val = (asset as any)[searchColumn];
      return val != null && String(val).toLowerCase().includes(q);
    });
  }, [assets, searchTerm, searchColumn]);

  /** Next maintenance in 0–5 days; not filtered by search; excludes Disposed. */
  const approachingMaintenanceAssets = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const rows = assets.filter(asset => {
      if (asset.status === 'Disposed' || !asset.nextMaintenanceDate) return false;
      const nextStart = startOfDay(new Date(asset.nextMaintenanceDate));
      if (Number.isNaN(nextStart.getTime())) return false;
      const daysUntil = differenceInCalendarDays(nextStart, todayStart);
      return daysUntil >= 0 && daysUntil <= 5;
    });
    rows.sort(
      (a, b) =>
        new Date(a.nextMaintenanceDate!).getTime() -
        new Date(b.nextMaintenanceDate!).getTime()
    );
    return rows;
  }, [assets]);

  const maintenanceTypes = [
    {
      value: 'Preventive',
      label: 'Preventive Maintenance',
      icon: Shield,
      color: 'text-green-600',
      description: 'Regular upkeep to prevent issues',
    },
    {
      value: 'Corrective',
      label: 'Corrective Maintenance',
      icon: Wrench,
      color: 'text-blue-600',
      description: 'Fix identified issues',
    },
    {
      value: 'Predictive',
      label: 'Predictive Maintenance',
      icon: AlertTriangle,
      color: 'text-yellow-600',
      description: 'Based on condition monitoring',
    },
    {
      value: 'Condition-Based',
      label: 'Condition-Based',
      icon: Settings,
      color: 'text-purple-600',
      description: 'When certain conditions are met',
    },
    {
      value: 'Scheduled',
      label: 'Scheduled Inspection',
      icon: Calendar,
      color: 'text-indigo-600',
      description: 'Regular inspection schedule',
    },
  ];

  const scheduleOptions = [
    { value: 'Daily', label: 'Daily', icon: Clock },
    { value: 'Weekly', label: 'Weekly', icon: Calendar },
    { value: 'Monthly', label: 'Monthly', icon: Calendar },
    { value: 'Quarterly', label: 'Quarterly', icon: Calendar },
    { value: 'Semi-Annually', label: 'Semi-Annually', icon: Calendar },
    { value: 'Annually', label: 'Annually', icon: Calendar },
    { value: 'As Needed', label: 'As Needed', icon: AlertTriangle },
  ];

  const getMaintenanceStatus = (asset: Asset) => {
    if (!asset.nextMaintenanceDate)
      return { status: 'Not Scheduled', color: 'bg-gray-100 text-gray-800' };

    const nextDate = new Date(asset.nextMaintenanceDate);
    const today = new Date();
    const daysUntil = Math.ceil(
      (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < 0)
      return { status: 'Overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' };
    if (daysUntil <= 7)
      return { status: 'Due Soon', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' };
    if (daysUntil <= 30)
      return { status: 'Upcoming', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' };
    return { status: 'Scheduled', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' };
  };

  const canScheduleMaintenance =
    hasPermission('Asset Maintenance', 'create') &&
    hasPermission('Asset Maintenance', 'edit');

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <PageHeader
          icon={Settings}
          title="Assets Maintenance"
          description="Schedule preventive maintenance and upkeep for assets"
        >
        </PageHeader>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3 xl:items-start">
          {/* Maintenance Scheduling: xl height locked to Maintenance configuration card */}
          <div
            className="flex min-h-0 w-full min-w-0 xl:col-span-2"
            style={
              schedulingCardHeightPx != null
                ? {
                    height: schedulingCardHeightPx,
                    maxHeight: schedulingCardHeightPx,
                  }
                : undefined
            }
          >
            <Card className="flex h-full min-h-0 w-full flex-col overflow-hidden shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="shrink-0 pb-3">
                <CardTitle className="flex flex-wrap items-center gap-3 text-xl">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-teal-600" />
                  </div>
                  Scheduled assets for maintenance
                  <Badge variant="secondary" className="shrink-0">
                    {approachingMaintenanceAssets.length} due in 5 days
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Upcoming due dates and the asset picker below share this card; each
                  list uses half of the scrollable area.
                </p>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden pt-0 pb-6">
                <div className="grid min-h-0 min-w-0 flex-1 gap-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
                  {/* Scheduled assets — list (not table), no inner card frame */}
                  <div className="flex min-h-0 min-w-0 flex-col border-b border-gray-200 pb-4">
                    <div className="shrink-0 pb-3">
                      <p className="text-xs text-muted-foreground mt-1">
                        Next maintenance from today through the next five days (not
                        filtered by search below).
                      </p>
                    </div>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      {loading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="rounded-lg border-2 px-3 py-2.5 space-y-2">
                              <Shimmer className="h-4 w-40 rounded" />
                              <Shimmer className="h-3 w-24 rounded" />
                            </div>
                          ))}
                        </div>
                      ) : approachingMaintenanceAssets.length === 0 ? (
                        <div className="text-center py-8 px-4">
                          <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-600 font-medium text-sm">
                            No assets due in the next 5 days
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            Configure schedules on assets to see upcoming dates here.
                          </p>
                        </div>
                      ) : (
                        approachingMaintenanceAssets.map(asset => {
                          const d = asset.nextMaintenanceDate;
                          const daysUntil = d
                            ? differenceInCalendarDays(
                                startOfDay(new Date(d)),
                                startOfDay(new Date())
                              )
                            : null;
                          return (
                            <div
                              key={asset.id}
                              role="button"
                              tabIndex={canScheduleMaintenance ? 0 : -1}
                              onClick={() =>
                                canScheduleMaintenance &&
                                handleAssetSelection(
                                  asset.id,
                                  !selectedAssets.includes(asset.id)
                                )
                              }
                              onKeyDown={e => {
                                if (
                                  !canScheduleMaintenance ||
                                  (e.key !== 'Enter' && e.key !== ' ')
                                )
                                  return;
                                e.preventDefault();
                                handleAssetSelection(
                                  asset.id,
                                  !selectedAssets.includes(asset.id)
                                );
                              }}
                              className={`flex items-center gap-3 rounded-lg border-2 px-3 py-2.5 transition-all ${
                                canScheduleMaintenance
                                  ? 'cursor-pointer'
                                  : 'cursor-not-allowed opacity-50'
                              } ${
                                selectedAssets.includes(asset.id)
                                  ? 'border-teal-500 bg-teal-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <div
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => e.stopPropagation()}
                                className="shrink-0"
                              >
                                <Checkbox
                                  checked={selectedAssets.includes(asset.id)}
                                  onCheckedChange={(checked: boolean | string) =>
                                    canScheduleMaintenance &&
                                    handleAssetSelection(asset.id, checked)
                                  }
                                  disabled={!canScheduleMaintenance}
                                  aria-label={`Select ${asset.name} for maintenance`}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate text-sm">
                                  {asset.name}
                                </p>
                                <p className="font-mono text-xs text-gray-500 truncate">
                                  {asset.id}
                                </p>
                              </div>
                              <div className="shrink-0 text-right text-xs text-gray-600">
                                {d ? (
                                  <span className="block whitespace-nowrap">
                                    {new Date(d).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                              {daysUntil !== null && (
                                <Badge
                                  variant="outline"
                                  className={
                                    daysUntil === 0
                                      ? 'shrink-0 border-amber-300 bg-amber-50 text-amber-900'
                                      : 'shrink-0 border-gray-300'
                                  }
                                >
                                  {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                                </Badge>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Select assets — list, no inner card frame */}
                  <div className="flex min-h-0 min-w-0 flex-col pt-4">
                    <div className="shrink-0 space-y-3 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          Select Assets for Maintenance
                        </h3>
                        <Badge variant="secondary" className="shrink-0">
                          {filteredAssets.length} available
                        </Badge>
                      </div>
                      <SearchWithColumnFilter
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Search assets..."
                        columnOptions={ASSET_SEARCH_COLUMNS_BASIC}
                        searchColumn={searchColumn}
                        onSearchColumnChange={setSearchColumn}
                      />
                    </div>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      {loading ? (
                        <div className="space-y-2">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="rounded-lg border-2 px-3 py-2.5 space-y-2">
                              <div className="flex items-center gap-2">
                                <Shimmer className="h-4 w-4 rounded" />
                                <Shimmer className="h-4 w-36 rounded" />
                              </div>
                              <Shimmer className="h-3 w-24 rounded ml-6" />
                            </div>
                          ))}
                        </div>
                      ) : filteredAssets.length === 0 ? (
                        <div className="text-center py-8 px-4">
                          <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-600 font-medium text-sm">
                            No assets available
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            Try adjusting your search
                          </p>
                        </div>
                      ) : (
                        filteredAssets.map(asset => {
                          const maintenanceStatus = getMaintenanceStatus(asset);
                          return (
                            <div
                              key={asset.id}
                              className={`group relative rounded-lg border-2 px-3 py-2.5 transition-all ${
                                canScheduleMaintenance
                                  ? 'cursor-pointer'
                                  : 'cursor-not-allowed opacity-50'
                              } ${
                                selectedAssets.includes(asset.id)
                                  ? 'border-teal-500 bg-teal-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                              onClick={() =>
                                canScheduleMaintenance &&
                                handleAssetSelection(
                                  asset.id,
                                  !selectedAssets.includes(asset.id)
                                )
                              }
                            >
                              <div className="flex items-start gap-3">
                                <div className="shrink-0 pt-0.5">
                                  <Checkbox
                                    id={`pick-${asset.id}`}
                                    checked={selectedAssets.includes(asset.id)}
                                    onCheckedChange={(checked: boolean | string) =>
                                      handleAssetSelection(asset.id, checked)
                                    }
                                    className="pointer-events-none"
                                    disabled={!canScheduleMaintenance}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-gray-900 text-sm truncate">
                                      {asset.name}
                                      <span className="text-gray-500 font-mono font-normal ml-1.5">
                                        {asset.id}
                                      </span>
                                    </p>
                                    {selectedAssets.includes(asset.id) && (
                                      <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1 truncate">
                                    <span className="font-medium">
                                      {asset.category}
                                    </span>
                                    <span className="mx-1 text-gray-400">•</span>
                                    <span>{asset.type}</span>
                                    <span className="mx-1 text-gray-400">•</span>
                                    <span className="font-mono">{asset.serialNo}</span>
                                  </p>
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    <Badge
                                      variant={
                                        asset.status === 'Available'
                                          ? 'secondary'
                                          : 'default'
                                      }
                                      className={`text-[10px] px-1.5 py-0 ${
                                        asset.status === 'Available'
                                          ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800'
                                          : asset.status === 'In Maintenance'
                                            ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800'
                                            : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
                                      }`}
                                    >
                                      {asset.status}
                                    </Badge>
                                    <Badge
                                      className={`text-[10px] px-1.5 py-0 ${maintenanceStatus.color}`}
                                    >
                                      {maintenanceStatus.status}
                                    </Badge>
                                    {asset.nextMaintenanceDate && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0 border-gray-300"
                                      >
                                        Next:{' '}
                                        {new Date(
                                          asset.nextMaintenanceDate
                                        ).toLocaleDateString()}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {selectedAssets.length > 0 && (
                  <div className="mt-4 shrink-0 rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
                        <span className="font-semibold text-teal-900 text-sm">
                          {selectedAssets.length} asset
                          {selectedAssets.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAssets([])}
                        className="text-teal-600 border-teal-300 hover:bg-teal-50"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Maintenance configuration (form): intrinsic height drives scheduling card on xl */}
          <div className="flex min-h-0 min-w-0 w-full flex-col xl:min-w-0">
            <Card
              ref={maintenanceConfigCardRef}
              className="flex w-full flex-col self-start border-0 bg-white/80 shadow-xl backdrop-blur-sm xl:sticky xl:top-8"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <Settings className="h-5 w-5 text-teal-600" />
                  </div>
                  Maintenance configuration
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Maintenance Type */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    Maintenance Type *
                  </Label>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                    {maintenanceTypes.map(type => {
                      const IconComponent = type.icon;
                      return (
                        <div
                          key={type.value}
                          className={`flex items-start gap-3 p-3 border-2 rounded-lg transition-all duration-200 ${
                            hasPermission('Asset Maintenance', 'create') &&
                            hasPermission('Asset Maintenance', 'edit')
                              ? 'cursor-pointer'
                              : 'cursor-not-allowed opacity-50'
                          } ${
                            maintenanceType === type.value
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() =>
                            hasPermission('Asset Maintenance', 'create') &&
                            hasPermission('Asset Maintenance', 'edit') &&
                            setMaintenanceType(type.value)
                          }
                        >
                          <Checkbox
                            checked={maintenanceType === type.value}
                            onCheckedChange={() =>
                              setMaintenanceType(type.value)
                            }
                            className="pointer-events-none mt-1"
                            disabled={
                              !hasPermission('Asset Maintenance', 'create') ||
                              !hasPermission('Asset Maintenance', 'edit')
                            }
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <IconComponent
                                className={`h-5 w-5 ${type.color}`}
                              />
                              <span className="font-medium text-gray-900">
                                {type.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Maintenance Schedule */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Maintenance Frequency *
                  </Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {scheduleOptions.map(schedule => {
                      const IconComponent = schedule.icon;
                      return (
                        <div
                          key={schedule.value}
                          className={`flex items-center gap-2 p-3 border-2 rounded-lg transition-all duration-200 ${
                            hasPermission('Asset Maintenance', 'create') &&
                            hasPermission('Asset Maintenance', 'edit')
                              ? 'cursor-pointer'
                              : 'cursor-not-allowed opacity-50'
                          } ${
                            maintenanceSchedule === schedule.value
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() =>
                            hasPermission('Asset Maintenance', 'create') &&
                            hasPermission('Asset Maintenance', 'edit') &&
                            setMaintenanceSchedule(schedule.value)
                          }
                        >
                          <Checkbox
                            checked={maintenanceSchedule === schedule.value}
                            onCheckedChange={() =>
                              setMaintenanceSchedule(schedule.value)
                            }
                            className="pointer-events-none"
                            disabled={
                              !hasPermission('Asset Maintenance', 'create') ||
                              !hasPermission('Asset Maintenance', 'edit')
                            }
                          />
                          <IconComponent className="h-4 w-4 text-gray-600" />
                          <span className="font-medium text-gray-900 text-sm">
                            {schedule.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Next Maintenance Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    Next Maintenance Date (Optional)
                  </Label>
                  <Input
                    type="date"
                    value={nextMaintenanceDate}
                    onChange={e => setNextMaintenanceDate(e.target.value)}
                    className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      !hasPermission('Asset Maintenance', 'create') ||
                      !hasPermission('Asset Maintenance', 'edit')
                    }
                  />
                </div>

                {/* Maintenance Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Maintenance Description *
                  </Label>
                  <Textarea
                    placeholder="Describe the maintenance tasks to be performed..."
                    value={maintenanceDescription}
                    onChange={e => setMaintenanceDescription(e.target.value)}
                    className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    rows={4}
                    disabled={
                      !hasPermission('Asset Maintenance', 'create') ||
                      !hasPermission('Asset Maintenance', 'edit')
                    }
                  />
                </div>

                {/* Estimated Cost */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="text-green-600">₱</span>
                    Estimated Maintenance Cost (Optional)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter estimated maintenance cost in PHP"
                    value={maintenanceCost}
                    onChange={e => setMaintenanceCost(e.target.value)}
                    className="border-gray-200 focus:border-teal-500 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      !hasPermission('Asset Maintenance', 'create') ||
                      !hasPermission('Asset Maintenance', 'edit')
                    }
                  />
                </div>

                {/* Schedule Summary */}
                {(maintenanceType ||
                  maintenanceSchedule ||
                  maintenanceDescription ||
                  maintenanceCost ||
                  nextMaintenanceDate) && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Maintenance Schedule Summary
                    </h4>
                    <div className="space-y-2 text-sm">
                      {maintenanceType && (
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-500" />
                          <span className="text-gray-600">Type:</span>
                          <span className="font-medium text-gray-900">
                            {
                              maintenanceTypes.find(
                                t => t.value === maintenanceType
                              )?.label
                            }
                          </span>
                        </div>
                      )}
                      {maintenanceSchedule && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span className="text-gray-600">Frequency:</span>
                          <span className="font-medium text-gray-900">
                            {
                              scheduleOptions.find(
                                s => s.value === maintenanceSchedule
                              )?.label
                            }
                          </span>
                        </div>
                      )}
                      {nextMaintenanceDate && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-purple-500" />
                          <span className="text-gray-600">Next Date:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(nextMaintenanceDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {maintenanceCost && (
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">₱</span>
                          <span className="text-gray-600">Est. Cost:</span>
                          <span className="font-medium text-gray-900">
                            ₱{parseFloat(maintenanceCost).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {maintenanceDescription && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-600 mt-0.5">
                            Description:
                          </span>
                          <span className="font-medium text-gray-900">
                            {maintenanceDescription}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Schedule Maintenance Button */}
                <Button
                  onClick={handleMaintenanceSchedule}
                  disabled={
                    scheduling ||
                    selectedAssets.length === 0 ||
                    !maintenanceType ||
                    !maintenanceSchedule ||
                    !maintenanceDescription.trim() ||
                    !hasPermission('Asset Maintenance', 'create') ||
                    !hasPermission('Asset Maintenance', 'edit')
                  }
                  className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scheduling ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Scheduling Maintenance...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Schedule Maintenance
                    </div>
                  )}
                </Button>

                {selectedAssets.length === 0 && (
                  <p className="text-sm text-gray-500 text-center">
                    Select assets above to enable maintenance scheduling
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Maintenance History Table */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Settings className="h-5 w-5 text-teal-600" />
              </div>
              Maintenance History
              <Badge variant="secondary" className="ml-auto">
                {/* This would be populated from maintenance history API */}0
                maintenance records
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <DataTable<MaintenanceRow>
              tableId="maintenance-history"
              data={[]}
              columns={maintenanceHistoryColumns}
              searchPlaceholder="Search maintenance history..."
              mobileCardFields={[
                { key: 'asset', label: 'Asset' },
                { key: 'date', label: 'Date' },
                { key: 'status', label: 'Status' },
                { key: 'notes', label: 'Notes' },
              ]}
              emptyState={
                <div className="text-center py-12">
                  <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    No maintenance history found
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Scheduled maintenance will appear here
                  </p>
                </div>
              }
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
