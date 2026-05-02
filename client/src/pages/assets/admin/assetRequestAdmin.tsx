'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Package,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlusCircle,
  Filter,
  ChevronDown,
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

interface User {
  id: string;
  username: string;
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
  user?: User;
  admin_notes?: string;
}

const assetRequestAdminColumns: ColumnDef<AssetRequest>[] = [
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
    id: 'requestedBy',
    header: 'Requested By',
    accessorFn: row => row.user?.username ?? '',
    size: 140,
    cell: ({ row }) => row.original.user?.username || 'Unknown',
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

export default function AssetRequestAdmin() {
  const { user: currentUser } = useCurrentUser();
  const { hasPermission } = useUserPermissions();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [assetRequests, setAssetRequests] = useState<AssetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<AssetRequest | null>(
    null
  );
  const [adminNotes, setAdminNotes] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  const fetchDepartments = async () => {
    try {
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

  const fetchAllAssetRequests = async () => {
    try {
      const response = await api.get('/asset-requests/all');
      setAssetRequests(response.requests || []);
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
        fetchAllAssetRequests(),
      ]);
      setLoading(false);
    };
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const handleApproveRequest = async (requestId: string) => {
    setProcessing(true);
    try {
      await api.put(`/asset-requests/${requestId}/approve`, {
        admin_notes: adminNotes,
      });
      toast.success('Asset request approved successfully');
      await fetchAllAssetRequests();
      closeModal();
    } catch (error) {
      console.error('Failed to approve asset request:', error);
      toast.error('Failed to approve asset request');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessing(true);
    try {
      await api.put(`/asset-requests/${requestId}/reject`, {
        admin_notes: adminNotes,
      });
      toast.success('Asset request rejected successfully');
      await fetchAllAssetRequests();
      closeModal();
    } catch (error) {
      console.error('Failed to reject asset request:', error);
      toast.error('Failed to reject asset request');
    } finally {
      setProcessing(false);
    }
  };

  const openModal = (request: AssetRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setAdminNotes(request.admin_notes || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setAdminNotes('');
    setIsModalOpen(false);
  };

  const allRequestColumns = useMemo(
    () =>
      [
        ...assetRequestAdminColumns,
        {
          id: 'actions',
          header: 'Actions',
          size: 160,
          enableSorting: false,
          cell: ({ row }: { row: { original: AssetRequest } }) =>
            row.original.status === 'pending' ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => openModal(row.original, 'approve')}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 h-8 text-sm"
                  disabled={processing}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  onClick={() => openModal(row.original, 'reject')}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 h-8 text-sm"
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            ) : null,
        },
      ] as ColumnDef<AssetRequest>[],
    [processing]
  );

  const filteredRequests = assetRequests.filter(request => {
    const matchesSearch =
      searchTerm === '' ||
      request.type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.department.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (request.user?.username &&
        request.user.username
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (request.user?.name &&
        request.user.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      filterStatus === 'all' || request.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const pendingRequests = filteredRequests.filter(
    request => request.status === 'pending'
  );
  const approvedRequests = filteredRequests.filter(
    request => request.status === 'approved'
  );
  const rejectedRequests = filteredRequests.filter(
    request => request.status === 'rejected' || request.status === 'declined'
  );

  return (
    <div className="min-h-screen">
      <main className="flex-1 p-6 space-y-6">
        <PageHeader
          icon={Package}
          title="Asset Request Management"
          description="Manage and process asset requests from users"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchAllAssetRequests()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </PageHeader>

        <div className="grid grid-cols-1 gap-8">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Filter className="h-5 w-5 text-blue-600" />
                </div>
                Filter and Search
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Search
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search requests..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">
                    Status Filter
                  </Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                All Asset Requests
                <Badge variant="secondary" className="ml-auto">
                  {filteredRequests.length} total
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-32 animate-pulse rounded bg-blue-100"></div>
                  <span className="ml-3 text-gray-600">
                    Loading requests...
                  </span>
                </div>
              ) : (
                <DataTable<AssetRequest>
                  tableId="all-asset-requests"
                  data={filteredRequests}
                  columns={allRequestColumns}
                  searchPlaceholder="Search requests..."
                  emptyState={
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">
                        No asset requests found
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Requests will appear here when submitted
                      </p>
                    </div>
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>

        {isModalOpen && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {actionType === 'approve' ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                  {actionType === 'approve'
                    ? 'Approve Request'
                    : 'Reject Request'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Request Details:
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium">Asset:</span>
                        <span>
                          {selectedRequest.type.name} (
                          {selectedRequest.category.name})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Department:</span>
                        <span>{selectedRequest.department.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Quantity:</span>
                        <span>{selectedRequest.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Requested by:</span>
                        <span>
                          {selectedRequest.user?.username || 'Unknown User'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      {actionType === 'approve'
                        ? 'Approval Notes'
                        : 'Rejection Reason'}
                    </Label>
                    <Textarea
                      placeholder={`Enter ${actionType === 'approve' ? 'approval notes' : 'reason for rejection'} (optional)`}
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={closeModal}
                      disabled={processing}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() =>
                        actionType === 'approve'
                          ? handleApproveRequest(selectedRequest.requestID)
                          : handleRejectRequest(selectedRequest.requestID)
                      }
                      disabled={processing}
                      className={
                        actionType === 'approve'
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }
                    >
                      {processing ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-16 animate-pulse rounded bg-white/40"></div>
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {actionType === 'approve' ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          {actionType === 'approve' ? 'Approve' : 'Reject'}
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
