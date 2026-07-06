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
  Trash2,
  AlertTriangle,
  FileText,
  DollarSign,
  Recycle,
  Archive,
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
  asset_value?: number;
  salvage_value?: number;
  purchase_date?: string;
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

const disposalHistoryColumns: ColumnDef<Asset>[] = [
  {
    id: 'asset',
    header: 'Asset',
    accessorFn: row => `${row.name} ${row.id}`,
    size: 200,
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-gray-900">{row.original.name}</div>
        <div className="text-sm text-gray-500">{row.original.id}</div>
      </div>
    ),
  },
  {
    id: 'reason',
    header: 'Disposal Reason',
    accessorFn: () => 'Disposed',
    size: 130,
    cell: () => (
      <Badge variant="destructive" className="text-xs">
        Disposed
      </Badge>
    ),
  },
  {
    id: 'method',
    header: 'Method',
    accessorFn: () => '',
    size: 150,
    cell: () => (
      <span className="text-gray-900 text-sm">Method not available</span>
    ),
  },
  {
    id: 'value',
    header: 'Value',
    accessorFn: row => row.asset_value ?? 0,
    size: 100,
    cell: () => <span className="text-gray-900 text-sm">N/A</span>,
  },
  {
    id: 'date',
    header: 'Disposal Date',
    accessorFn: () => '',
    size: 130,
    cell: () => (
      <span className="text-gray-900 text-sm">Date not available</span>
    ),
  },
  {
    id: 'notes',
    header: 'Notes',
    accessorFn: () => '',
    size: 180,
    cell: () => (
      <span className="text-gray-900 text-sm">No notes available</span>
    ),
  },
];

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

export default function AssetsDisposal() {
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
  const [disposalReason, setDisposalReason] = useState<string>('');
  const [disposalMethod, setDisposalMethod] = useState<string>('');
  const [disposalValue, setDisposalValue] = useState<string>('');
  const [disposalNotes, setDisposalNotes] = useState<string>('');
  const [disposing, setDisposing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('all');
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
        asset_value: asset.asset_value,
        salvage_value: asset.salvage_value,
        purchase_date: asset.purchase_date,
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

  const handleDisposal = async () => {
    if (selectedAssets.length === 0) {
      toast.error('Please select at least one asset for disposal');
      return;
    }

    if (!disposalReason) {
      toast.error('Please select a disposal reason');
      return;
    }

    if (!disposalMethod) {
      toast.error('Please select a disposal method');
      return;
    }

    setDisposing(true);
    try {
      // For each selected asset, update its status to disposed
      const disposalPromises = selectedAssets.map(async assetId => {
        const disposalData = {
          status: 'Disposed',
          disposal_reason: disposalReason,
          disposal_method: disposalMethod,
          disposal_value: disposalValue ? parseFloat(disposalValue) : null,
          disposal_notes: disposalNotes,
          disposal_date: new Date().toISOString(),
          disposed_by: currentUser?.id,
        };

        return api.put(`/assets/${assetId}/dispose`, disposalData);
      });

      await Promise.all(disposalPromises);

      toast.success(`Successfully disposed ${selectedAssets.length} asset(s)`);

      // Reset form
      setSelectedAssets([]);
      setDisposalReason('');
      setDisposalMethod('');
      setDisposalValue('');
      setDisposalNotes('');

      // Refresh assets
      await fetchAssets();
    } catch (error) {
      console.error('Failed to dispose assets:', error);
      toast.error('Failed to dispose assets');
    } finally {
      setDisposing(false);
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

  const disposalReasons = [
    {
      value: 'Obsolete',
      label: 'Obsolete/Outdated',
      icon: Archive,
      color: 'text-gray-600',
    },
    {
      value: 'Damaged',
      label: 'Damaged Beyond Repair',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    { value: 'Sold', label: 'Sold', icon: DollarSign, color: 'text-green-600' },
    {
      value: 'Donated',
      label: 'Donated',
      icon: Recycle,
      color: 'text-blue-600',
    },
    {
      value: 'Lost',
      label: 'Lost/Stolen',
      icon: AlertTriangle,
      color: 'text-orange-600',
    },
    {
      value: 'Recycled',
      label: 'Recycled',
      icon: Recycle,
      color: 'text-purple-600',
    },
  ];

  const disposalMethods = [
    { value: 'Auction', label: 'Auction Sale' },
    { value: 'Direct Sale', label: 'Direct Sale' },
    { value: 'Scrap', label: 'Scrap/Salvage' },
    { value: 'Donation', label: 'Donation' },
    { value: 'Recycling', label: 'Recycling' },
    { value: 'Destruction', label: 'Destruction' },
    { value: 'Write-off', label: 'Write-off Only' },
  ];

  return (
    <div className="min-h-screen">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={Trash2}
          title="Assets Disposal"
          description="Permanently dispose of assets and track disposal records"
        >
        </PageHeader>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Asset Selection Panel */}
          <div className="xl:col-span-2">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Package className="h-5 w-5 text-red-600" />
                  </div>
                  Select Assets for Disposal
                  <Badge variant="secondary" className="ml-auto">
                    {filteredAssets.length} available
                  </Badge>
                </CardTitle>

                {/* Search Bar */}
                <div className="flex items-center gap-2 mt-4">
                  <select
                    value={searchColumn}
                    onChange={e => setSearchColumn(e.target.value)}
                    className="h-9 rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300"
                  >
                    <option value="all">All Columns</option>
                    <option value="id">Asset Code</option>
                    <option value="name">Asset Name</option>
                    <option value="description">Description</option>
                    <option value="category">Category</option>
                    <option value="type">Type</option>
                    <option value="serialNo">Serial No</option>
                    <option value="modelNo">Model</option>
                    <option value="brand">Brand</option>
                    <option value="department">Department</option>
                    <option value="location">Location</option>
                  </select>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search assets..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10 border-gray-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
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
                        No assets available for disposal
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Try adjusting your search criteria
                      </p>
                    </div>
                  ) : (
                    filteredAssets.map(asset => (
                      <div
                        key={asset.id}
                        className={`group relative p-4 border-2 rounded-xl transition-all duration-200 cursor-pointer ${
                          selectedAssets.includes(asset.id)
                            ? 'border-red-500 bg-red-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                        onClick={() =>
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
                                    <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0" />
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

                            <div className="flex flex-wrap gap-2 mb-2">
                              <Badge
                                variant={
                                  asset.status === 'Available'
                                    ? 'secondary'
                                    : 'default'
                                }
                                className={`text-xs ${
                                  asset.status === 'Available'
                                    ? 'bg-green-100 text-green-800 border-green-200'
                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                                }`}
                              >
                                {asset.status}
                              </Badge>
                              {asset.asset_value && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-gray-300"
                                >
                                  Value: ₱{asset.asset_value.toLocaleString()}
                                </Badge>
                              )}
                              {asset.purchase_date && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-gray-300"
                                >
                                  Purchased:{' '}
                                  {new Date(asset.purchase_date).getFullYear()}
                                </Badge>
                              )}
                            </div>

                            {asset.specifications &&
                              asset.specifications.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  Has {asset.specifications.length} component
                                  {asset.specifications.length !== 1 ? 's' : ''}
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Selection overlay */}
                        {selectedAssets.includes(asset.id) && (
                          <div className="absolute inset-0 bg-red-500/5 rounded-xl pointer-events-none"></div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {selectedAssets.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-900">
                          {selectedAssets.length} asset
                          {selectedAssets.length !== 1 ? 's' : ''} selected for
                          disposal
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAssets([])}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Disposal Details Panel */}
          <div>
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  Disposal Details
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Disposal Reason */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-red-500" />
                    Disposal Reason *
                  </Label>
                  <div className="grid grid-cols-1 gap-2">
                    {disposalReasons.map(reason => {
                      const IconComponent = reason.icon;
                      return (
                        <div
                          key={reason.value}
                          className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                            disposalReason === reason.value
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setDisposalReason(reason.value)}
                        >
                          <Checkbox
                            checked={disposalReason === reason.value}
                            onCheckedChange={() =>
                              setDisposalReason(reason.value)
                            }
                            className="pointer-events-none"
                          />
                          <IconComponent
                            className={`h-5 w-5 ${reason.color}`}
                          />
                          <span className="font-medium text-gray-900">
                            {reason.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Disposal Method */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Disposal Method *
                  </Label>
                  <Select
                    value={disposalMethod}
                    onValueChange={setDisposalMethod}
                  >
                    <SelectTrigger className="border-gray-200 focus:border-red-500 focus:ring-red-500">
                      <SelectValue placeholder="Select disposal method">
                        {disposalMethod
                          ? disposalMethods.find(
                              m => m.value === disposalMethod
                            )?.label
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="h-40 bg-white">
                      {disposalMethods.map(method => (
                        <SelectItem
                          key={method.value}
                          value={method.value}
                          className="hover:bg-gray-200"
                        >
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Disposal Value */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    Disposal Value (Optional)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter disposal value in PHP"
                    value={disposalValue}
                    onChange={e => setDisposalValue(e.target.value)}
                    className="border-gray-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                {/* Disposal Notes */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Disposal Notes
                  </Label>
                  <Textarea
                    placeholder="Add notes about the disposal process..."
                    value={disposalNotes}
                    onChange={e => setDisposalNotes(e.target.value)}
                    className="border-gray-200 focus:border-red-500 focus:ring-red-500"
                    rows={4}
                  />
                </div>

                {/* Disposal Summary */}
                {(disposalReason ||
                  disposalMethod ||
                  disposalValue ||
                  disposalNotes) && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Disposal Summary
                    </h4>
                    <div className="space-y-2 text-sm">
                      {disposalReason && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-red-500" />
                          <span className="text-gray-600">Reason:</span>
                          <span className="font-medium text-gray-900">
                            {
                              disposalReasons.find(
                                r => r.value === disposalReason
                              )?.label
                            }
                          </span>
                        </div>
                      )}
                      {disposalMethod && (
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-4 w-4 text-red-500" />
                          <span className="text-gray-600">Method:</span>
                          <span className="font-medium text-gray-900">
                            {
                              disposalMethods.find(
                                m => m.value === disposalMethod
                              )?.label
                            }
                          </span>
                        </div>
                      )}
                      {disposalValue && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <span className="text-gray-600">Value:</span>
                          <span className="font-medium text-gray-900">
                            ₱{parseFloat(disposalValue).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {disposalNotes && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-600 mt-0.5">Notes:</span>
                          <span className="font-medium text-gray-900">
                            {disposalNotes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Disposal Button */}
                <Button
                  onClick={handleDisposal}
                  disabled={
                    disposing ||
                    selectedAssets.length === 0 ||
                    !disposalReason ||
                    !disposalMethod
                  }
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {disposing ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing Disposal...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-5 w-5" />
                      Dispose {selectedAssets.length} Asset
                      {selectedAssets.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </Button>

                {selectedAssets.length === 0 && (
                  <p className="text-sm text-gray-500 text-center">
                    Select assets above to enable disposal
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Disposal History Table */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              Disposal History
              <Badge variant="secondary" className="ml-auto">
                {assets.filter(a => a.status === 'Disposed').length} disposed
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent>
            {assets.filter(a => a.status === 'Disposed').length === 0 ? (
              <div className="text-center py-12">
                <Trash2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  No disposal history found
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Disposed assets will appear here
                </p>
              </div>
            ) : (
              <DataTable<Asset>
                tableId="disposal-history"
                data={assets.filter(a => a.status === 'Disposed')}
                columns={disposalHistoryColumns}
                searchPlaceholder="Search disposal history..."
                emptyState={
                  <div className="text-center py-8">
                    <p className="text-gray-500">No matching records</p>
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
