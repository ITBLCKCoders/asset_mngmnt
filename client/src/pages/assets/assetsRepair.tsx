'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Package,
  User,
  MapPin,
  Building,
  Search,
  CheckCircle2,
  Users,
  Warehouse,
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
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
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { DataTable } from '@/components/ui/dataTable';
import { Shimmer } from '@/components/ui/shimmer';
import type { ColumnDef } from '@tanstack/react-table';

type RepairRow = {
  id: string;
  asset: string;
  date: string;
  status: string;
  notes: string;
};
const repairHistoryColumns: ColumnDef<RepairRow>[] = [
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
  condition?: string;
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

export default function AssetsRepair() {
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
  const [repairIssue, setRepairIssue] = useState<string>('');
  const [repairPriority, setRepairPriority] = useState<string>('');
  const [repairDescription, setRepairDescription] = useState<string>('');
  const [repairCost, setRepairCost] = useState<string>('');
  const [requesting, setRequesting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAssets, setExpandedAssets] = useState<string[]>([]);

  const fetchAssets = async () => {
    try {
      // Determine companyId based on user role
      let companyId: string | undefined;
      const userRole = currentUser?.role?.name?.toLowerCase();
      if (userRole === 'super admin' || userRole === 'admin') {
        // Super Admin and Admin use active company from CompanyContext
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
      const transformedAssets = assetsData.map((asset: any) => ({
        id: asset.asset_code,
        name: asset.name,
        status: asset.status,
        category: asset.category_name || asset.category_id,
        type: asset.type_name || asset.type_id,
        serialNo: asset.serial,
        assignedTo: asset.created_by_name || asset.created_by,
        department: asset.department_name || '',
        location: `${asset.location_name || ''}${asset.room_name ? ` - ${asset.room_name}` : ''}`,
        condition: asset.condition,
        specifications: asset.specifications || [],
      }));
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

  const handleRepairRequest = async () => {
    if (selectedAssets.length === 0) {
      toast.error('Please select at least one asset for repair');
      return;
    }

    if (!repairIssue) {
      toast.error('Please select the type of repair issue');
      return;
    }

    if (!repairPriority) {
      toast.error('Please select repair priority');
      return;
    }

    if (!repairDescription.trim()) {
      toast.error('Please provide a repair description');
      return;
    }

    setRequesting(true);
    try {
      // For each selected asset, create a repair request
      const repairPromises = selectedAssets.map(async assetId => {
        const repairData = {
          assetId,
          issue: repairIssue,
          priority: repairPriority,
          description: repairDescription,
          estimatedCost: repairCost ? parseFloat(repairCost) : null,
          requestedBy: currentUser?.id,
          requestDate: new Date().toISOString(),
          status: 'Pending',
        };

        return api.post('/asset-repairs', repairData);
      });

      await Promise.all(repairPromises);

      toast.success(
        `Successfully submitted repair request for ${selectedAssets.length} asset(s)`
      );

      // Reset form
      setSelectedAssets([]);
      setRepairIssue('');
      setRepairPriority('');
      setRepairDescription('');
      setRepairCost('');

      // Refresh data
      await fetchAssets();
    } catch (error) {
      console.error('Failed to submit repair request:', error);
      toast.error('Failed to submit repair request');
    } finally {
      setRequesting(false);
    }
  };

  const filteredAssets = useMemo(() => {
    return assets.filter(
      asset =>
        asset.status !== 'Disposed' &&
        (asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asset.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asset.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asset.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asset.serialNo.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [assets, searchTerm]);

  const repairIssues = [
    {
      value: 'Hardware Failure',
      label: 'Hardware Failure',
      icon: Zap,
      color: 'text-red-600',
    },
    {
      value: 'Software Issue',
      label: 'Software Issue',
      icon: AlertTriangle,
      color: 'text-yellow-600',
    },
    {
      value: 'Physical Damage',
      label: 'Physical Damage',
      icon: AlertTriangle,
      color: 'text-orange-600',
    },
    {
      value: 'Connectivity Problem',
      label: 'Connectivity Problem',
      icon: Wrench,
      color: 'text-blue-600',
    },
    {
      value: 'Performance Issue',
      label: 'Performance Issue',
      icon: Clock,
      color: 'text-purple-600',
    },
    { value: 'Other', label: 'Other', icon: Wrench, color: 'text-gray-600' },
  ];

  const priorityLevels = [
    {
      value: 'Critical',
      label: 'Critical - System Down',
      color: 'bg-red-100 text-red-800',
    },
    {
      value: 'High',
      label: 'High - Affects Operations',
      color: 'bg-orange-100 text-orange-800',
    },
    {
      value: 'Medium',
      label: 'Medium - Minor Impact',
      color: 'bg-yellow-100 text-yellow-800',
    },
    {
      value: 'Low',
      label: 'Low - Cosmetic/Optional',
      color: 'bg-blue-100 text-blue-800',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <PageHeader
          icon={Wrench}
          title="Assets Repair"
          description="Request repairs for damaged or malfunctioning assets"
        >
        </PageHeader>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Asset Selection Panel */}
          <div className="xl:col-span-2">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Package className="h-5 w-5 text-orange-600" />
                  </div>
                  Select Assets for Repair
                  <Badge variant="secondary" className="ml-auto">
                    {filteredAssets.length} available
                  </Badge>
                </CardTitle>

                {/* Search Bar */}
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search assets by name, code, category, type, or serial..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center gap-3 p-4 border-2 rounded-xl">
                          <Shimmer className="h-5 w-5 rounded" />
                          <div className="flex-1 space-y-2">
                            <Shimmer className="h-4 w-48 rounded" />
                            <Shimmer className="h-3 w-32 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredAssets.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">
                        No assets available for repair
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Try adjusting your search criteria
                      </p>
                    </div>
                  ) : (
                    filteredAssets.map(asset => (
                      <div
                        key={asset.id}
                        className={`group relative p-4 border-2 rounded-xl transition-all duration-200 ${
                          hasPermission('Asset Repair', 'create') &&
                          hasPermission('Asset Repair', 'edit')
                            ? 'cursor-pointer'
                            : 'cursor-not-allowed opacity-50'
                        } ${
                          selectedAssets.includes(asset.id)
                            ? 'border-orange-500 bg-orange-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                        onClick={() =>
                          hasPermission('Asset Repair', 'create') &&
                          hasPermission('Asset Repair', 'edit') &&
                          handleAssetSelection(
                            asset.id,
                            !selectedAssets.includes(asset.id)
                          )
                        }
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            <Checkbox
                              id={asset.id}
                              checked={selectedAssets.includes(asset.id)}
                              onCheckedChange={(checked: boolean | string) =>
                                handleAssetSelection(asset.id, checked)
                              }
                              className="pointer-events-none"
                              disabled={
                                !hasPermission('Asset Repair', 'create') ||
                                !hasPermission('Asset Repair', 'edit')
                              }
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="mb-2">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg text-gray-900 truncate">
                                  {asset.name}
                                  <span className="text-sm text-gray-500 font-mono ml-2">
                                    {asset.id}
                                  </span>
                                </h3>
                                <div className="flex items-center gap-2">
                                  {selectedAssets.includes(asset.id) && (
                                    <CheckCircle2 className="h-5 w-5 text-orange-600 flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-sm text-gray-600 mb-3">
                              <span className="font-medium">
                                {asset.category}
                              </span>
                              <span className="mx-2 text-gray-400">•</span>
                              <span>{asset.type}</span>
                              <span className="mx-2 text-gray-400">•</span>
                              <span className="font-mono text-xs">
                                {asset.serialNo}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant={
                                  asset.status === 'Available'
                                    ? 'secondary'
                                    : 'default'
                                }
                                className={`text-xs ${
                                  asset.status === 'Available'
                                    ? 'bg-green-100 text-green-800 border-green-200'
                                    : asset.status === 'In Maintenance'
                                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                                      : 'bg-gray-100 text-gray-800 border-gray-200'
                                }`}
                              >
                                {asset.status}
                              </Badge>
                              {asset.condition && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    asset.condition === 'Excellent'
                                      ? 'border-green-300 text-green-700'
                                      : asset.condition === 'Good'
                                        ? 'border-blue-300 text-blue-700'
                                        : asset.condition === 'Needs Repair'
                                          ? 'border-yellow-300 text-yellow-700'
                                          : asset.condition === 'Damaged'
                                            ? 'border-red-300 text-red-700'
                                            : 'border-gray-300 text-gray-700'
                                  }`}
                                >
                                  {asset.condition}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Selection overlay */}
                        {selectedAssets.includes(asset.id) && (
                          <div className="absolute inset-0 bg-orange-500/5 rounded-xl pointer-events-none"></div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {selectedAssets.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-orange-600" />
                        <span className="font-semibold text-orange-900">
                          {selectedAssets.length} asset
                          {selectedAssets.length !== 1 ? 's' : ''} selected for
                          repair
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAssets([])}
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Repair Request Panel */}
          <div>
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Wrench className="h-5 w-5 text-orange-600" />
                  </div>
                  Repair Request Details
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Repair Issue Type */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Issue Type *
                  </Label>
                  <div className="grid grid-cols-1 gap-2">
                    {repairIssues.map(issue => {
                      const IconComponent = issue.icon;
                      return (
                        <div
                          key={issue.value}
                          className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all duration-200 ${
                            hasPermission('Asset Repair', 'create') &&
                            hasPermission('Asset Repair', 'edit')
                              ? 'cursor-pointer'
                              : 'cursor-not-allowed opacity-50'
                          } ${
                            repairIssue === issue.value
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() =>
                            hasPermission('Asset Repair', 'create') &&
                            hasPermission('Asset Repair', 'edit') &&
                            setRepairIssue(issue.value)
                          }
                        >
                          <Checkbox
                            checked={repairIssue === issue.value}
                            onCheckedChange={() => setRepairIssue(issue.value)}
                            className="pointer-events-none"
                            disabled={
                              !hasPermission('Asset Repair', 'create') ||
                              !hasPermission('Asset Repair', 'edit')
                            }
                          />
                          <IconComponent className={`h-5 w-5 ${issue.color}`} />
                          <span className="font-medium text-gray-900">
                            {issue.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Priority Level */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    Priority Level *
                  </Label>
                  <div className="grid grid-cols-1 gap-2">
                    {priorityLevels.map(priority => (
                      <div
                        key={priority.value}
                        className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all duration-200 ${
                          hasPermission('Asset Repair', 'create') &&
                          hasPermission('Asset Repair', 'edit')
                            ? 'cursor-pointer'
                            : 'cursor-not-allowed opacity-50'
                        } ${
                          repairPriority === priority.value
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() =>
                          hasPermission('Asset Repair', 'create') &&
                          hasPermission('Asset Repair', 'edit') &&
                          setRepairPriority(priority.value)
                        }
                      >
                        <Checkbox
                          checked={repairPriority === priority.value}
                          onCheckedChange={() =>
                            setRepairPriority(priority.value)
                          }
                          className="pointer-events-none"
                          disabled={
                            !hasPermission('Asset Repair', 'create') ||
                            !hasPermission('Asset Repair', 'edit')
                          }
                        />
                        <Badge className={`${priority.color} border-0`}>
                          {priority.label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Repair Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Issue Description *
                  </Label>
                  <Textarea
                    placeholder="Describe the repair issue in detail..."
                    value={repairDescription}
                    onChange={e => setRepairDescription(e.target.value)}
                    className="border-gray-200 focus:border-orange-500 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    rows={4}
                    disabled={
                      !hasPermission('Asset Repair', 'create') ||
                      !hasPermission('Asset Repair', 'edit')
                    }
                  />
                </div>

                {/* Estimated Cost */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="text-green-600">₱</span>
                    Estimated Repair Cost (Optional)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter estimated repair cost in PHP"
                    value={repairCost}
                    onChange={e => setRepairCost(e.target.value)}
                    className="border-gray-200 focus:border-orange-500 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      !hasPermission('Asset Repair', 'create') ||
                      !hasPermission('Asset Repair', 'edit')
                    }
                  />
                </div>

                {/* Request Summary */}
                {(repairIssue ||
                  repairPriority ||
                  repairDescription ||
                  repairCost) && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Repair Request Summary
                    </h4>
                    <div className="space-y-2 text-sm">
                      {repairIssue && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-gray-600">Issue:</span>
                          <span className="font-medium text-gray-900">
                            {
                              repairIssues.find(i => i.value === repairIssue)
                                ?.label
                            }
                          </span>
                        </div>
                      )}
                      {repairPriority && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <span className="text-gray-600">Priority:</span>
                          <span className="font-medium text-gray-900">
                            {
                              priorityLevels.find(
                                p => p.value === repairPriority
                              )?.label
                            }
                          </span>
                        </div>
                      )}
                      {repairCost && (
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">₱</span>
                          <span className="text-gray-600">Est. Cost:</span>
                          <span className="font-medium text-gray-900">
                            ₱{parseFloat(repairCost).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {repairDescription && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-600 mt-0.5">
                            Description:
                          </span>
                          <span className="font-medium text-gray-900">
                            {repairDescription}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Request Button */}
                <Button
                  onClick={handleRepairRequest}
                  disabled={
                    requesting ||
                    selectedAssets.length === 0 ||
                    !repairIssue ||
                    !repairPriority ||
                    !repairDescription.trim() ||
                    !hasPermission('Asset Repair', 'create') ||
                    !hasPermission('Asset Repair', 'edit')
                  }
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {requesting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting Request...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      Submit Repair Request
                      {selectedAssets.length > 1 ? 's' : ''}
                    </div>
                  )}
                </Button>

                {selectedAssets.length === 0 && (
                  <p className="text-sm text-gray-500 text-center">
                    Select assets above to enable repair request
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Repair History Table */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Wrench className="h-5 w-5 text-orange-600" />
              </div>
              Repair History
              <Badge variant="secondary" className="ml-auto">
                {/* This would be populated from repair history API */}0 repairs
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <DataTable<RepairRow>
              tableId="repair-history"
              data={[]}
              columns={repairHistoryColumns}
              searchPlaceholder="Search repair history..."
              emptyState={
                <div className="text-center py-12">
                  <Wrench className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    No repair history found
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Repair requests will appear here
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
