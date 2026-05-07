'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  Search,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';

interface Department {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface AssetType {
  id: string;
  name: string;
}

interface AssetRequest {
  requestID: string;
  department: Department;
  category: Category;
  type: AssetType;
  request_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'declined';
  notes?: string;
  quantity: number;
  user_id: string;
}

const myAssetRequestColumns: ColumnDef<AssetRequest>[] = [
  {
    id: 'type',
    header: 'Type',
    accessorFn: row => row.type.name,
    size: 140,
    cell: ({ row }) => row.original.type.name,
  },
  {
    id: 'category',
    header: 'Category',
    accessorFn: row => row.category.name,
    size: 140,
    cell: ({ row }) => row.original.category.name,
  },
  {
    id: 'department',
    header: 'Department',
    accessorFn: row => row.department.name,
    size: 160,
    cell: ({ row }) => row.original.department.name,
  },
  {
    id: 'quantity',
    header: 'Quantity',
    accessorKey: 'quantity',
    size: 90,
    cell: ({ row }) => row.original.quantity,
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    size: 110,
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: 'request_date',
    header: 'Requested',
    accessorKey: 'request_date',
    size: 150,
    cell: ({ row }) => new Date(row.original.request_date).toLocaleString(),
  },
  {
    id: 'notes',
    header: 'Notes',
    accessorKey: 'notes',
    size: 180,
    cell: ({ row }) => row.original.notes || '—',
  },
];

export default function AssetDepartment() {
  const { user: currentUser } = useCurrentUser();
  const { hasPermission } = useUserPermissions();
  const [searchParams] = useSearchParams();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [assetRequests, setAssetRequests] = useState<AssetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [requestNotes, setRequestNotes] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const fetchDepartments = async () => {
    try {
      // Hardcoded IT and Admin departments as requested
      const staticDepartments = [
        { id: 'it-dept', name: 'IT Department' },
        { id: 'admin-dept', name: 'Administration Department' },
      ];
      setDepartments(staticDepartments);
    } catch (error) {
      console.error('Failed to set departments:', error);
      setDepartments([]);
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

  const fetchTypes = async () => {
    try {
      const response = await api.get('/asset-types');
      setTypes(response.types || []);
    } catch (error) {
      console.error('Failed to fetch asset types:', error);
      setTypes([]);
    }
  };

  const fetchAssetRequests = async () => {
    try {
      const response = await api.get('/asset-requests');
      const userRequests = response.requests.filter(
        (request: AssetRequest) => request.user_id === currentUser?.id
      );
      setAssetRequests(userRequests || []);
    } catch (error) {
      console.error('Failed to fetch asset requests:', error);
      setAssetRequests([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchDepartments(),
        fetchCategories(),
        fetchTypes(),
        fetchAssetRequests(),
      ]);
      setLoading(false);
    };
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const handleSubmitRequest = async () => {
    if (!selectedDepartment || !selectedCategory || !selectedType) {
      toast.error('Please select department, category, and type');
      return;
    }

    if (quantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    setSubmitting(true);
    try {
      const requestData = {
        department_id: selectedDepartment,
        category_id: selectedCategory,
        type_id: selectedType,
        notes: requestNotes,
        user_id: currentUser?.id,
        quantity: quantity,
      };

      await api.post('/asset-requests', requestData);
      toast.success('Asset request submitted successfully');

      // Reset form
      setSelectedDepartment('');
      setSelectedCategory('');
      setSelectedType('');
      setRequestNotes('');
      setQuantity(1);

      await fetchAssetRequests();
    } catch (error) {
      console.error('Failed to submit asset request:', error);
      toast.error('Failed to submit asset request');
    } finally {
      setSubmitting(false);
    }
  };

  const statusFilter = (searchParams.get('status') ?? '').trim().toLowerCase();
  const visibleAssetRequests = useMemo(() => {
    if (!statusFilter) return assetRequests;
    if (statusFilter === 'pending') {
      return assetRequests.filter(
        request => String(request.status).toLowerCase() === 'pending'
      );
    }
    if (statusFilter === 'completed') {
      return assetRequests.filter(request =>
        ['approved', 'completed'].includes(
          String(request.status).toLowerCase()
        )
      );
    }
    if (statusFilter === 'declined') {
      return assetRequests.filter(request =>
        ['declined', 'rejected'].includes(String(request.status).toLowerCase())
      );
    }
    return assetRequests;
  }, [assetRequests, statusFilter]);

  return (
    <div className="min-h-screen">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={PlusCircle}
          title="Asset Request"
          description="Request specific types of assets for your needs"
        >
          <Button
            variant="header"
            size="sm"
            onClick={() => fetchAssetRequests()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </PageHeader>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  Select Asset Details
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Asset Department *
                    </Label>
                    <Select
                      value={selectedDepartment}
                      onValueChange={(value: string) =>
                        setSelectedDepartment(value)
                      }
                      disabled={!hasPermission('Asset Request', 'create')}
                    >
                      <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {departments.map(department => (
                          <SelectItem
                            key={department.id}
                            value={department.id}
                            className="hover:bg-gray-200"
                          >
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Category *
                    </Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={(value: string) =>
                        setSelectedCategory(value)
                      }
                      disabled={!hasPermission('Asset Request', 'create')}
                    >
                      <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {categories.map(category => (
                          <SelectItem
                            key={category.id}
                            value={category.id}
                            className="hover:bg-gray-200"
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Type *
                    </Label>
                    <Select
                      value={selectedType}
                      onValueChange={(value: string) => setSelectedType(value)}
                      disabled={!hasPermission('Asset Request', 'create')}
                    >
                      <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {types.map(type => (
                          <SelectItem
                            key={type.id}
                            value={type.id}
                            className="hover:bg-gray-200"
                          >
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700">
                      Quantity
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                      className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      disabled={!hasPermission('Asset Request', 'create')}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700">
                      Additional Notes
                    </Label>
                    <Textarea
                      placeholder="Add notes about your request (optional)"
                      value={requestNotes}
                      onChange={e => setRequestNotes(e.target.value)}
                      className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      rows={3}
                      disabled={!hasPermission('Asset Request', 'create')}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSubmitRequest}
                  disabled={
                    submitting ||
                    !selectedDepartment ||
                    !selectedCategory ||
                    !selectedType ||
                    !hasPermission('Asset Request', 'create')
                  }
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting Request...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <PlusCircle className="h-5 w-5" />
                      Submit Asset Request
                    </div>
                  )}
                </Button>

                {!selectedDepartment || !selectedCategory || !selectedType ? (
                  <p className="text-sm text-gray-500 text-center">
                    Please select department, category, and type to enable
                    submission
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <PlusCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  Request Summary
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">
                    Selected Asset Details:
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    {selectedDepartment && (
                      <div className="flex justify-between">
                        <span className="font-medium">Asset Department:</span>
                        <span>
                          {
                            departments.find(d => d.id === selectedDepartment)
                              ?.name
                          }
                        </span>
                      </div>
                    )}
                    {selectedCategory && (
                      <div className="flex justify-between">
                        <span className="font-medium">Category:</span>
                        <span>
                          {
                            categories.find(c => c.id === selectedCategory)
                              ?.name
                          }
                        </span>
                      </div>
                    )}
                    {selectedType && (
                      <div className="flex justify-between">
                        <span className="font-medium">Type:</span>
                        <span>
                          {types.find(t => t.id === selectedType)?.name}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="font-medium">Quantity:</span>
                      <span>{quantity}</span>
                    </div>
                  </div>
                </div>

                {requestNotes && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900">Notes:</h3>
                    <p className="text-sm text-gray-600">{requestNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="xl:col-span-3">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <PlusCircle className="h-5 w-5 text-blue-600" />
                </div>
                My Asset Requests
                <Badge variant="secondary" className="ml-auto">
                  {visibleAssetRequests.length} total
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">
                    Loading requests...
                  </span>
                </div>
              ) : visibleAssetRequests.length === 0 ? (
                <div className="text-center py-12">
                  <PlusCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    No asset requests found for this filter
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Try another status or submit a new request
                  </p>
                </div>
              ) : (
                <DataTable<AssetRequest>
                  tableId="my-asset-requests"
                  data={visibleAssetRequests}
                  columns={myAssetRequestColumns}
                  searchPlaceholder="Search my requests..."
                  emptyState={
                    <div className="text-center py-8">
                      <p className="text-gray-500">No matching requests</p>
                    </div>
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
