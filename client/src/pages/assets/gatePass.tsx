'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Package,
  Boxes,
  User,
  MapPin,
  Building,
  CheckCircle2,
  DoorOpen,
  ChevronDown,
  RefreshCw,
  Crown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchWithColumnFilter } from '@/components/common/SearchWithColumnFilter';
import { ASSET_SEARCH_COLUMNS_BASIC } from '@/utils/assetSearchColumns';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Tabs, TabsContent, TabsList, TabsTrigger, segmentTabsListClassName, segmentTabsTriggerClassName } from '@/components/ui/tabs';
import { Shimmer } from '@/components/ui/shimmer';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';

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
  assignment_notes: string | null;
  status: string;
  assigned_by: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface GatePassData {
  assignmentId: string;
  assetId: string;
  userId: string;
  purpose: string;
  expectedReturnDate: string;
  destinationLocationId: string;
  destinationDepartmentId: string;
  condition: string;
  notes: string;
}

interface GatePassHistoryRow {
  id: string;
  assetName: string;
  assetCode: string;
  userName: string;
  purpose: string;
  destination: string;
  expectedReturn: string;
  condition: string;
  status: string;
  createdAt: string;
  notes: string;
}

export default function GatePass() {
  const { user: currentUser } = useCurrentUser();
  const { hasPermission } = useUserPermissions();
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [gatePassHistory, setGatePassHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('select-assets');
  const [tabLoading, setTabLoading] = useState(false);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('all');

  // Form state
  const [formData, setFormData] = useState<GatePassData>({
    assignmentId: '',
    assetId: '',
    userId: '',
    purpose: '',
    expectedReturnDate: '',
    destinationLocationId: '',
    destinationDepartmentId: '',
    condition: 'Good',
    notes: '',
  });

  // Asset builders
  const [assetBuilders, setAssetBuilders] = useState<any[]>([]);
  const [buildersLoading, setBuildersLoading] = useState(false);
  const [builderSearchTerm, setBuilderSearchTerm] = useState('');
  const [expandedBuilderForSelect, setExpandedBuilderForSelect] = useState<string | null>(null);

  // Filter state for history
  const [historyFilters, setHistoryFilters] = useState({
    userId: '',
    status: '',
    departmentId: '',
  });

  const canCreate = hasPermission('Gate Pass', 'create');
  const canEdit = hasPermission('Gate Pass', 'edit');
  const canDelete = hasPermission('Gate Pass', 'delete');
  const canView = hasPermission('Gate Pass', 'view');

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      if (searchColumn === 'all') {
        return (
          assignment.asset.name.toLowerCase().includes(q) ||
          assignment.asset.code.toLowerCase().includes(q) ||
          assignment.user.first_name?.toLowerCase().includes(q) ||
          assignment.user.last_name?.toLowerCase().includes(q) ||
          assignment.user.email?.toLowerCase().includes(q) ||
          `${assignment.user.first_name || ''} ${assignment.user.last_name || ''}`
            .trim()
            .toLowerCase()
            .includes(q)
        );
      }
      const assetField = searchColumn === 'id' ? 'code' : searchColumn;
      const val = (assignment.asset as any)[assetField];
      return val != null && String(val).toLowerCase().includes(q);
    });
  }, [assignments, searchTerm, searchColumn]);

  const filteredAssignedBuilders = useMemo(() => {
    if (!builderSearchTerm) return assetBuilders;
    const q = builderSearchTerm.toLowerCase();
    return assetBuilders.filter((builder: any) =>
      builder.name?.toLowerCase().includes(q) ||
      builder.assignments?.some((a: AssetAssignment) =>
        a.asset?.code?.toLowerCase().includes(q)
      )
    );
  }, [assetBuilders, builderSearchTerm]);

  const flattenedGatePassHistory = useMemo((): GatePassHistoryRow[] => {
    return gatePassHistory.map((gp: any) => {
      const asset = gp.asset || {};
      const user = gp.user || {};
      const location = gp.location || {};
      const department = gp.department || {};
      
      return {
        id: gp.gate_pass_id,
        assetName: asset.name || 'Unknown Asset',
        assetCode: asset.code || 'No Code',
        userName: user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}` 
          : 'Unknown User',
        purpose: gp.purpose || 'N/A',
        destination: location.name || department.name || 'N/A',
        expectedReturn: gp.expected_return_date 
          ? new Date(gp.expected_return_date).toLocaleDateString() 
          : 'N/A',
        condition: gp.condition || 'Good',
        status: gp.status || 'Pending',
        createdAt: gp.created_at 
          ? new Date(gp.created_at).toLocaleDateString() 
          : 'N/A',
        notes: gp.notes || '',
      };
    });
  }, [gatePassHistory]);

  const gatePassHistoryColumns: ColumnDef<GatePassHistoryRow>[] = useMemo(
    () => [
      {
        id: 'assetName',
        header: 'Asset',
        accessorKey: 'assetName',
        size: 180,
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900">
              {row.original.assetName}
            </div>
            <div className="text-sm text-gray-500">
              {row.original.assetCode}
            </div>
          </div>
        ),
      },
      {
        id: 'userName',
        header: 'User',
        accessorKey: 'userName',
        size: 160,
      },
      {
        id: 'purpose',
        header: 'Purpose',
        accessorKey: 'purpose',
        size: 200,
      },
      {
        id: 'destination',
        header: 'Destination',
        accessorKey: 'destination',
        size: 150,
      },
      {
        id: 'expectedReturn',
        header: 'Expected Return',
        accessorKey: 'expectedReturn',
        size: 120,
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        size: 120,
        cell: ({ row }) => {
          const status = row.original.status;
          const badgeClass =
            status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
            status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' :
            status === 'Cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
          return (
            <Badge variant="secondary" className={badgeClass}>
              {status}
            </Badge>
          );
        },
      },
      {
        id: 'condition',
        header: 'Condition',
        accessorKey: 'condition',
        size: 100,
        cell: ({ row }) => (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            {row.original.condition}
          </Badge>
        ),
      },
      {
        id: 'createdAt',
        header: 'Created',
        accessorKey: 'createdAt',
        size: 120,
      },
    ],
    []
  );

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
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

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations');
      setLocations(response.locations || []);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocations([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await api.get('/asset-assignments?limit=-1');
      setAssignments(response.assignments || []);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      setAssignments([]);
    }
  };

  const fetchAssetBuilders = async () => {
    try {
      setBuildersLoading(true);
      const response = await api.get('/asset-builders/assigned');
      setAssetBuilders(response.builders || []);
    } catch (error) {
      console.error('Failed to fetch asset builders:', error);
      setAssetBuilders([]);
    } finally {
      setBuildersLoading(false);
    }
  };

  const fetchGatePassHistory = async () => {
    try {
      setHistoryLoading(true);
      const queryParams = new URLSearchParams();
      if (historyFilters.userId) queryParams.append('userId', historyFilters.userId);
      if (historyFilters.status) queryParams.append('status', historyFilters.status);
      if (historyFilters.departmentId) queryParams.append('destinationDepartmentId', historyFilters.departmentId);
      
      const response = await api.get(`/gate-passes?${queryParams.toString()}`);
      setGatePassHistory(response.gatePasses || []);
    } catch (error) {
      console.error('Failed to fetch gate pass history:', error);
      setGatePassHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchDepartments(),
        fetchUsers(),
        fetchLocations(),
        fetchCategories(),
        fetchAssignments(),
      ]);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'asset-built') {
      fetchAssetBuilders();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchGatePassHistory();
  }, [historyFilters]);

  const handleAssignmentSelection = (assignmentId: string, checked: boolean) => {
    if (!canCreate || !canEdit) return;
    if (checked) {
      setSelectedAssignments(prev => [...prev, assignmentId]);
    } else {
      setSelectedAssignments(prev => prev.filter(id => id !== assignmentId));
    }
  };

  const handleBuilderReturnWhole = (builderId: string) => {
    if (!canCreate || !canEdit) return;
    const builder = assetBuilders.find((b: any) => b.builderID === builderId);
    if (builder?.assignments) {
      const assignmentIds = builder.assignments.map((a: AssetAssignment) => a.assignmentID);
      setSelectedAssignments(prev => [...new Set([...prev, ...assignmentIds])]);
    }
  };

  const handleBuilderDeselectAll = (builderId: string) => {
    if (!canCreate || !canEdit) return;
    const builder = assetBuilders.find((b: any) => b.builderID === builderId);
    if (builder?.assignments) {
      const assignmentIds = builder.assignments.map((a: AssetAssignment) => a.assignmentID);
      setSelectedAssignments(prev => prev.filter(id => !assignmentIds.includes(id)));
    }
  };

  const isBuilderFullySelected = (builderId: string) => {
    const builder = assetBuilders.find((b: any) => b.builderID === builderId);
    if (!builder?.assignments) return false;
    return builder.assignments.every((a: AssetAssignment) => selectedAssignments.includes(a.assignmentID));
  };

  const handleBuilderAssetToggle = (assignmentId: string, checked: boolean | string) => {
    if (!canCreate || !canEdit) return;
    const isChecked = checked === true;
    if (isChecked) {
      setSelectedAssignments(prev => [...prev, assignmentId]);
    } else {
      setSelectedAssignments(prev => prev.filter(id => id !== assignmentId));
    }
  };

  const handleSubmit = async () => {
    if (!canCreate) {
      toast.error('You do not have permission to create gate passes');
      return;
    }

    if (selectedAssignments.length === 0) {
      toast.error('Please select at least one assignment');
      return;
    }

    if (!formData.purpose) {
      toast.error('Please enter the purpose');
      return;
    }

    if (!formData.expectedReturnDate) {
      toast.error('Please enter the expected return date');
      return;
    }

    if (!formData.condition) {
      toast.error('Please select the condition');
      return;
    }

    setSubmitting(true);
    try {
      // Create gate pass for each selected assignment
      const promises = selectedAssignments.map(async (assignmentId) => {
        const assignment = assignments.find(a => a.assignmentID === assignmentId);
        if (!assignment) return null;
        
        return api.post('/gate-passes', {
          assignmentId: assignment.assignmentID,
          assetId: assignment.asset.id,
          userId: assignment.user.id,
          purpose: formData.purpose,
          expectedReturnDate: formData.expectedReturnDate || null,
          destinationLocationId: null,
          destinationDepartmentId: null,
          condition: formData.condition,
          notes: formData.notes || null,
        });
      });

      await Promise.all(promises);
      toast.success(`Successfully created ${selectedAssignments.length} gate pass(es)`);
      
      // Reset form
      setSelectedAssignments([]);
      setFormData({
        assignmentId: '',
        assetId: '',
        userId: '',
        purpose: '',
        expectedReturnDate: '',
        destinationLocationId: '',
        destinationDepartmentId: '',
        condition: 'Good',
        notes: '',
      });
      
      // Refresh history
      fetchGatePassHistory();
    } catch (error: any) {
      console.error('Failed to create gate pass:', error);
      toast.error(error?.response?.data?.error || 'Failed to create gate pass');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={DoorOpen}
          title="Gate Pass"
          description="Request gate pass to temporary takeout your asset from the office"
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Asset Selection / Asset Built Tabs */}
          <div className="xl:col-span-2">
            <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setTabLoading(true); setTimeout(() => setTabLoading(false), 300); }} className="w-full">
              <TabsList className={segmentTabsListClassName + ' grid grid-cols-2'}>
                <TabsTrigger
                  value="select-assets"
                  className={segmentTabsTriggerClassName + ' flex items-center gap-2'}
                >
                  <Package className="h-4 w-4" />
                  Select Assets
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {filteredAssignments.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="asset-built"
                  className={segmentTabsTriggerClassName + ' flex items-center gap-2'}
                >
                  <Boxes className="h-4 w-4" />
                  Asset Built
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {filteredAssignedBuilders.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="select-assets" className="mt-4">
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Package className="h-5 w-5 text-red-600" />
                      </div>
                      Select Assets for Gate Pass
                      <Badge variant="secondary" className="ml-auto">
                        {filteredAssignments.length} assigned
                      </Badge>
                    </CardTitle>

                    <SearchWithColumnFilter
                      value={searchTerm}
                      onChange={setSearchTerm}
                      placeholder="Search assets..."
                      columnOptions={ASSET_SEARCH_COLUMNS_BASIC}
                      searchColumn={searchColumn}
                      onSearchColumnChange={setSearchColumn}
                      className="mt-4"
                    />
                    {filteredAssignments.length > 0 && (
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allVisibleIds = filteredAssignments.map(a => a.assignmentID);
                            const allSelected = allVisibleIds.every(id => selectedAssignments.includes(id));
                            if (allSelected) {
                              setSelectedAssignments(prev => prev.filter(id => !allVisibleIds.includes(id)));
                            } else {
                              setSelectedAssignments(prev => [...new Set([...prev, ...allVisibleIds])]);
                            }
                          }}
                          className="text-red-600 border-red-300 hover:bg-red-50 whitespace-nowrap"
                        >
                          {filteredAssignments.length > 0 &&
                          filteredAssignments.every(a => selectedAssignments.includes(a.assignmentID))
                            ? 'Deselect All'
                            : 'Select All'}
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    {loading ? (
                      <div className="space-y-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <Card key={index} className="border shadow-sm border-gray-200">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div className="flex-1 min-w-0">
                                  <Shimmer className="h-6 w-40 rounded mb-1" />
                                  <Shimmer className="h-4 w-64 rounded mb-2" />
                                  <Shimmer className="h-5 w-20 rounded-full" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : filteredAssignments.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-200 mb-4">
                          <Package className="h-10 w-10 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          No assigned assets found
                        </h3>
                        <p className="text-gray-500 text-sm">
                          Assets assigned to users will appear here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 p-1">
                        {filteredAssignments.map((assignment) => (
                          <Card
                            key={assignment.assignmentID}
                            className={cn(
                              'border shadow-sm cursor-pointer transition-all relative',
                              selectedAssignments.includes(assignment.assignmentID)
                                ? 'border-2 border-red-500 bg-red-50/50'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                            onClick={() => handleAssignmentSelection(assignment.assignmentID, !selectedAssignments.includes(assignment.assignmentID))}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 mt-1">
                                  <Checkbox
                                    id={assignment.assignmentID}
                                    checked={selectedAssignments.includes(assignment.assignmentID)}
                                    onCheckedChange={(checked: boolean | string) => handleAssignmentSelection(assignment.assignmentID, checked === true)}
                                    className="pointer-events-none"
                                    disabled={!canCreate || !canEdit}
                                  />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="mb-2">
                                    <div className="flex items-center justify-between">
                                      <h3 className="font-semibold text-lg text-gray-900 truncate">
                                        {assignment.asset.name}
                                        <span className="text-sm text-gray-500 font-mono ml-2">
                                          {assignment.asset.code}
                                        </span>
                                      </h3>
                                      <div className="flex items-center gap-2">
                                        {selectedAssignments.includes(assignment.assignmentID) && (
                                          <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0" />
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-sm text-gray-600 mb-3">
                                    <span className="font-medium">Currently assigned to:</span>
                                    <span className="ml-2">
                                      {assignment.user.first_name} {assignment.user.last_name}
                                    </span>
                                    {assignment.department && (
                                      <span className="ml-2 text-gray-400">•</span>
                                    )}
                                    {assignment.department && (
                                      <span>{assignment.department.name}</span>
                                    )}
                                    {assignment.location && (
                                      <span className="ml-2 text-gray-400">•</span>
                                    )}
                                    {assignment.location && (
                                      <span>
                                        {assignment.location.name} - {assignment.location.floor_unit}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="default" className="text-xs bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800">
                                      {assignment.status}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs border-gray-300">
                                      Assigned: {new Date(assignment.assigned_date).toLocaleDateString()}
                                    </Badge>
                                    {assignment.expected_return_date && (
                                      <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                                        Due: {new Date(assignment.expected_return_date).toLocaleDateString()}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {selectedAssignments.includes(assignment.assignmentID) && (
                                <div className="absolute inset-0 bg-green-500/5 rounded-xl pointer-events-none"></div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {selectedAssignments.length > 0 && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-red-600" />
                            <span className="font-semibold text-red-900">
                              {selectedAssignments.length} asset{selectedAssignments.length !== 1 ? 's' : ''} selected for gate pass
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAssignments([])}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="asset-built" className="mt-4">
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm min-h-[500px]">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex flex-wrap items-center gap-3 text-xl">
                      <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                        <Boxes className="h-5 w-5 text-red-600" />
                      </div>
                      <span>Asset Built</span>
                      <Badge variant="secondary" className="w-fit">
                        {filteredAssignedBuilders.length} assigned
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Select whole builder or individual assets for gate pass.
                    </p>
                    <div className="flex flex-col gap-1.5 mt-4 w-full min-w-0">
                      <span className="text-sm font-medium text-muted-foreground">
                        Search
                      </span>
                      <SearchWithColumnFilter
                        placeholder="Search by builder name or asset code..."
                        value={builderSearchTerm}
                        onChange={setBuilderSearchTerm}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {buildersLoading || tabLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <Card key={index} className="border shadow-sm border-gray-200">
                            <CardContent className="p-4">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <Shimmer className="h-6 w-40 rounded mb-1" />
                                  <Shimmer className="h-4 w-64 rounded mb-2" />
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Shimmer className="h-3.5 w-3.5 rounded" />
                                    <Shimmer className="h-4 w-32 rounded" />
                                  </div>
                                  <Shimmer className="h-5 w-20 rounded-full" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : filteredAssignedBuilders.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-200 mb-4">
                          <Boxes className="h-10 w-10 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          No assigned asset builders
                        </h3>
                        <p className="text-gray-500 text-sm">
                          Asset builders that have been assigned will appear here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 p-1">
                        {filteredAssignedBuilders.map(({
                          builder,
                          assignments: builderAssignments,
                        }: any) => {
                          const isFullySelected = isBuilderFullySelected(builder.builderID);
                          const isExpanded = expandedBuilderForSelect === builder.builderID;

                          return (
                            <Card
                              key={builder.builderID}
                              className={cn(
                                'border shadow-sm',
                                isFullySelected
                                  ? 'border-2 border-red-500 bg-red-50/50'
                                  : 'border-gray-200'
                              )}
                            >
                              <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 mb-1 truncate">
                                      {builder.name || 'Unnamed Builder'}
                                    </h3>
                                    {builder.description && (
                                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                        {builder.description}
                                      </p>
                                    )}
                                    {builderAssignments[0]?.user && (
                                      <p className="text-sm text-gray-600 mb-2 flex items-center gap-1.5">
                                        <User className="h-3.5 w-3 text-gray-400 flex-shrink-0" />
                                        Assigned to: {builderAssignments[0].user.first_name} {builderAssignments[0].user.last_name}
                                      </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                                        {builderAssignments.length} assigned
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
                                    <Button
                                      size="sm"
                                      variant={isFullySelected ? 'outline' : 'default'}
                                      className={isFullySelected
                                        ? 'border-red-500 text-red-600 hover:bg-red-50'
                                        : 'bg-red-500 hover:bg-red-600 text-white'
                                      }
                                      onClick={() =>
                                        isFullySelected
                                          ? handleBuilderDeselectAll(builder.builderID)
                                          : handleBuilderReturnWhole(builder.builderID)
                                      }
                                      disabled={!canCreate || !canEdit}
                                    >
                                      {isFullySelected ? 'Deselect All' : 'Select All'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-gray-600 hover:bg-red-500 hover:text-white"
                                      onClick={() =>
                                        setExpandedBuilderForSelect(
                                          isExpanded ? null : builder.builderID
                                        )
                                      }
                                    >
                                      {isExpanded ? 'Collapse' : 'Select Assets'}
                                    </Button>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Select which assets to include
                                    </p>
                                    <div className="space-y-2 max-h-[15rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                      <ul className="space-y-2 list-none pl-0">
                                        {builderAssignments.map((a: AssetAssignment) => (
                                          <li
                                            key={a.assignmentID}
                                            className={cn(
                                              'flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer min-w-0 pl-4 relative',
                                              selectedAssignments.includes(a.assignmentID)
                                                ? 'border-red-500 bg-red-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            )}
                                            onClick={() =>
                                              (canCreate || canEdit) &&
                                              handleBuilderAssetToggle(a.assignmentID, !selectedAssignments.includes(a.assignmentID))
                                            }
                                          >
                                            <Checkbox
                                              checked={selectedAssignments.includes(a.assignmentID)}
                                              onCheckedChange={(checked: boolean | string) =>
                                                handleBuilderAssetToggle(a.assignmentID, checked === true)
                                              }
                                              disabled={!canCreate || !canEdit}
                                              className="flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                              <span className="font-medium text-gray-900 truncate block">
                                                {a.asset.name}
                                              </span>
                                              <span className="text-sm text-gray-500 font-mono">
                                                Asset code: {a.asset.code}
                                              </span>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Gate Pass Request Panel */}
          <div>
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <DoorOpen className="h-5 w-5 text-red-600" />
                  </div>
                  Gate Pass Request
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-sm text-gray-600">
                  Select assets above, then fill in the gate pass details to create gate passes.
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Purpose <span className="text-red-500">*</span></Label>
                    <Textarea
                      value={formData.purpose}
                      onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                      placeholder="Enter the purpose for this gate pass"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Expected Return Date <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      value={formData.expectedReturnDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, expectedReturnDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Condition <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                        <SelectItem value="Damaged">Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes (optional)"
                      rows={2}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || selectedAssignments.length === 0 || !canCreate}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating Gate Pass...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-5 w-5" />
                      Create Gate Pass{selectedAssignments.length !== 1 ? 'es' : ''}
                    </div>
                  )}
                </Button>

                {selectedAssignments.length === 0 && (
                  <p className="text-sm text-gray-500 text-center">
                    Select assets above to enable gate pass creation
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Gate Pass History Table */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-red-100 rounded-lg">
                <DoorOpen className="h-5 w-5 text-red-600" />
              </div>
              Gate Pass History
              <Badge variant="secondary" className="ml-auto">
                {gatePassHistory.length} gate passes
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent>
            {historyLoading ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 space-y-2">
                  <div className="flex gap-4">
                    <Shimmer className="h-5 w-32 rounded" />
                    <Shimmer className="h-5 w-24 rounded" />
                    <Shimmer className="h-5 w-24 rounded" />
                    <Shimmer className="h-5 w-28 rounded" />
                    <Shimmer className="h-5 w-20 rounded" />
                  </div>
                </div>
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="border-t border-gray-200 p-3 space-y-2">
                    <div className="flex gap-4">
                      <Shimmer className="h-5 w-32 rounded" />
                      <Shimmer className="h-5 w-24 rounded" />
                      <Shimmer className="h-5 w-24 rounded" />
                      <Shimmer className="h-5 w-28 rounded" />
                      <Shimmer className="h-5 w-20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : gatePassHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-200 mb-4">
                  <DoorOpen className="h-10 w-10 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No gate pass history found
                </h3>
                <p className="text-gray-500 text-sm">
                  Completed gate passes will appear here
                </p>
              </div>
            ) : (
              <DataTable<GatePassHistoryRow>
                tableId="gate-pass-history"
                data={flattenedGatePassHistory}
                columns={gatePassHistoryColumns}
                searchPlaceholder="Search gate pass history..."
                emptyState={
                  <div className="text-center py-8">
                    <p className="text-gray-500">No matching gate passes</p>
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
