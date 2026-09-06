'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Layers } from 'lucide-react';
import { DataTable } from '@/components/ui/dataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { Dialog } from '@/components/ui/dialog';
import {
  AppDialogBody,
  AppDialogChromeFooter,
  AppDialogFrame,
  AppDialogGradientHeader,
} from '@/components/common/appDialogChrome';
import {
  AccountabilityFormDetail,
  type AccountabilityForm,
} from '@/pages/assets/accountability/accountabilityForm';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';

export interface LinkedAccountabilityFormSummary {
  id: string;
  formNumber: string;
  status: string;
  declineReason: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AssetAssignment {
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
  accountabilityForm?: LinkedAccountabilityFormSummary | null;
  assigned_by: {
    id: string;
    first_name: string;
    last_name: string;
    employeeNumber?: string;
  };
  assetType?: 'physical' | 'intangible';
}

interface AssignedAssetsTableProps {
  assignments: AssetAssignment[];
}

const TERMINAL_ACCOUNTABILITY_STATUSES = new Set([
  'Declined',
  'Disabled',
  'Revoked',
]);

function getDisplayedAssignmentStatus(assignment: AssetAssignment) {
  return assignment.accountabilityForm?.status === 'Declined'
    ? 'Declined'
    : assignment.status;
}

function getStatusBadgeClassName(status: string) {
  if (status === 'Active') {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
  }

  if (status === 'Declined') {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
  }

  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
}

const assignedAssetsColumns: ColumnDef<AssetAssignment>[] = [
  {
    id: 'asset',
    header: 'Asset',
    accessorFn: row => `${row.asset.name} ${row.asset.code}`,
    size: 220,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.assetType === 'intangible' && (
          <Layers className="h-4 w-4 shrink-0 text-orange-500" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-900 truncate">
              {row.original.asset.name}
            </span>
            {row.original.assetType === 'intangible' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-orange-200 text-orange-700 bg-orange-50 shrink-0 leading-none">
                Intangible
              </Badge>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {row.original.assetType === 'intangible'
              ? row.original.asset.type_id
              : row.original.asset.code}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'assignedTo',
    header: 'Assigned To',
    accessorFn: row => `${row.user.first_name} ${row.user.last_name}`.trim(),
    size: 200,
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-gray-900">
          {row.original.user.first_name} {row.original.user.last_name}
        </div>
        <div className="text-sm text-gray-500">
          {row.original.user.employeeNumber || 'No ID'}
        </div>
        <div className="text-sm text-gray-500">
          {row.original.user.position || 'No position'}
        </div>
      </div>
    ),
  },
  {
    id: 'assignedBy',
    header: 'Assigned By',
    accessorFn: row =>
      `${row.assigned_by.first_name} ${row.assigned_by.last_name}`.trim(),
    size: 160,
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-gray-900">
          {row.original.assigned_by.first_name}{' '}
          {row.original.assigned_by.last_name}
        </div>
        <div className="text-sm text-gray-500">
          {row.original.assigned_by.employeeNumber || 'No ID'}
        </div>
      </div>
    ),
  },
  {
    id: 'department',
    header: 'Department',
    accessorFn: row => row.department?.name ?? '',
    size: 140,
    cell: ({ row }) => (
      <span className="text-gray-900">
        {row.original.department?.name || 'N/A'}
      </span>
    ),
  },
  {
    id: 'location',
    header: 'Location',
    accessorFn: row =>
      row.location ? `${row.location.name} - ${row.location.floor_unit}` : '',
    size: 180,
    cell: ({ row }) => (
      <span className="text-gray-900">
        {row.original.location
          ? `${row.original.location.name} - ${row.original.location.floor_unit}`
          : 'N/A'}
      </span>
    ),
  },
  {
    id: 'assigned_date',
    header: 'Assigned Date',
    accessorKey: 'assigned_date',
    size: 130,
    cell: ({ row }) => (
      <span className="text-gray-900">
        {new Date(row.original.assigned_date).toLocaleDateString()}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    size: 110,
    cell: ({ row }) => {
      const status = getDisplayedAssignmentStatus(row.original);
      return (
        <Badge
          variant={status === 'Active' ? 'default' : 'secondary'}
          className={getStatusBadgeClassName(status)}
        >
          {status}
        </Badge>
      );
    },
  },
];

/** Builds a single searchable string from all assignment fields so search matches any column. */
function assignmentSearchText(a: AssetAssignment): string {
  const parts: string[] = [];
  parts.push(a.assignmentID ?? '');
  if (a.asset) {
    parts.push(
      a.asset.id ?? '',
      a.asset.code ?? '',
      a.asset.name ?? '',
      a.asset.category_id ?? '',
      a.asset.type_id ?? ''
    );
  }
  if (a.user) {
    parts.push(
      a.user.first_name ?? '',
      a.user.last_name ?? '',
      a.user.email ?? '',
      a.user.employeeNumber ?? '',
      a.user.position ?? ''
    );
  }
  parts.push(a.department?.name ?? '');
  if (a.location) {
    parts.push(
      a.location.name ?? '',
      a.location.floor_unit ?? '',
      a.location.building ?? '',
      a.location.room_name ?? ''
    );
  }
  parts.push(
    a.assigned_date ?? '',
    a.expected_return_date ?? '',
    a.assignment_notes ?? '',
    a.status ?? '',
    a.assetType ?? ''
  );
  if (a.accountabilityForm) {
    parts.push(
      a.accountabilityForm.formNumber ?? '',
      a.accountabilityForm.status ?? '',
      a.accountabilityForm.declineReason ?? ''
    );
  }
  if (a.assigned_by) {
    parts.push(
      a.assigned_by.first_name ?? '',
      a.assigned_by.last_name ?? '',
      a.assigned_by.employeeNumber ?? ''
    );
  }
  return parts.join(' ').toLowerCase();
}

export function AssignedAssetsTable({ assignments }: AssignedAssetsTableProps) {
  const [selectedForm, setSelectedForm] = useState<AccountabilityForm | null>(
    null
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewAssetCode, setPreviewAssetCode] = useState<string | null>(null);

  const getFormCreatedMs = (form: AccountabilityForm) =>
    Date.parse(String(form.created_at || '')) || 0;

  const sameUser = (form: AccountabilityForm, userId: string) =>
    String(form.user.id) === String(userId);

  const sortNewestFirst = (left: AccountabilityForm, right: AccountabilityForm) => {
    const c = getFormCreatedMs(right) - getFormCreatedMs(left);
    if (c !== 0) {
      return c;
    }
    return Number(right.id) - Number(left.id);
  };

  /** Newest non-terminal form for assignee (aligns with server linkage). */
  const pickNewestNonTerminalForUser = (
    userId: string,
    list: AccountabilityForm[]
  ) =>
    [...list]
      .filter(
        form =>
          sameUser(form, userId) &&
          !TERMINAL_ACCOUNTABILITY_STATUSES.has(form.status)
      )
      .sort(sortNewestFirst)[0];

  /** Fallback when only terminal/historical forms exist for this user on the asset. */
  const pickNewestAnyStatusForUser = (
    userId: string,
    list: AccountabilityForm[]
  ) =>
    [...list].filter(form => sameUser(form, userId)).sort(sortNewestFirst)[0];

  const resolvePreviewForm = (
    assignment: AssetAssignment,
    forms: AccountabilityForm[]
  ) => {
    const userId = assignment.user.id;
    const rowAssignmentId = String(assignment.assignmentID);

    // 1) Form row in DB tied to this assignment (strongest — correct PDF per assignment, including history)
    const byAssignmentId = forms.find(
      f =>
        f.assignment?.id != null &&
        String(f.assignment.id) === rowAssignmentId
    );
    if (byAssignmentId) {
      return byAssignmentId;
    }

    // 2) Summary from list API for this row — always honor (declined row shows declined form, new row shows new)
    if (assignment.accountabilityForm?.id) {
      const linkedId = String(assignment.accountabilityForm.id);
      const linked = forms.find(form => String(form.id) === linkedId);
      if (linked) {
        return linked;
      }
    }

    // 3) Bulk / legacy forms without assignment_id on the form row
    return (
      pickNewestNonTerminalForUser(userId, forms) ??
      pickNewestAnyStatusForUser(userId, forms)
    );
  };

  const handleRowClick = async (row: { original: AssetAssignment }) => {
    const assignment = row.original;

    if (assignment.assetType === 'intangible') {
      toast.info('Accountability forms are not available for intangible assets.');
      return;
    }

    setPreviewAssetCode(assignment.asset.code);
    setSelectedForm(null);
    setIsPreviewLoading(true);
    setIsPreviewOpen(true);

    try {
      const response = await api.get(
        `/accountability-forms/asset/${assignment.asset.id}`
      );
      const forms = Array.isArray(response.forms)
        ? (response.forms as AccountabilityForm[])
        : [];
      const previewForm = resolvePreviewForm(assignment, forms);

      if (!previewForm) {
        setIsPreviewOpen(false);
        toast.error('No accountability form found for this asset.');
        return;
      }

      setSelectedForm(previewForm);
    } catch (error) {
      console.error('Failed to load accountability form preview:', error);
      setIsPreviewOpen(false);
      toast.error('Failed to load accountability form preview');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <>
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex flex-col gap-3 text-xl sm:flex-row sm:items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserCheck className="h-5 w-5 text-blue-600" />
            </div>
            <span>Currently Assigned Assets</span>
            <Badge variant="secondary" className="sm:ml-auto w-fit">
              {assignments.length} assigned
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                No assets currently assigned
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Assets will appear here after assignment
              </p>
            </div>
          ) : (
            <DataTable<AssetAssignment>
              tableId="assigned-assets"
              data={assignments}
              columns={assignedAssetsColumns}
              searchPlaceholder="Search all columns..."
              onRowClick={handleRowClick}
              getRowClassName={() =>
                'cursor-pointer transition-colors hover:bg-slate-50'
              }
              globalFilterFn={(row, _columnId, filterValue) => {
                const q = String(filterValue ?? '').trim();
                if (!q) return true;
                return assignmentSearchText(row.original).includes(
                  q.toLowerCase()
                );
              }}
              mobileCardFields={[
                {
                  key: 'asset',
                  label: 'Asset',
                  render: row => (
                    <div className="flex items-center gap-2">
                      {row.assetType === 'intangible' && (
                        <Layers className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900 truncate">
                            {row.asset.name}
                          </span>
                          {row.assetType === 'intangible' && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-3.5 border-orange-200 text-orange-700 bg-orange-50 shrink-0 leading-none">
                              Intangible
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {row.assetType === 'intangible'
                            ? row.asset.type_id
                            : row.asset.code}
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'assigned-to',
                  label: 'Assigned To',
                  render: row => (
                    <div>
                      <div className="font-medium text-gray-900">
                        {row.user.first_name} {row.user.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {row.user.position || 'No position'}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: row => {
                    const status = getDisplayedAssignmentStatus(row);
                    return (
                      <Badge
                        variant={
                          status === 'Active' ? 'default' : 'secondary'
                        }
                        className={getStatusBadgeClassName(status)}
                      >
                        {status}
                      </Badge>
                    );
                  },
                },
                {
                  key: 'department',
                  label: 'Department',
                  render: row => row.department?.name || 'N/A',
                },
                {
                  key: 'location',
                  label: 'Location',
                  render: row =>
                    row.location
                      ? `${row.location.name} - ${row.location.floor_unit}`
                      : 'N/A',
                },
                {
                  key: 'assigned-date',
                  label: 'Assigned Date',
                  render: row =>
                    new Date(row.assigned_date).toLocaleDateString(),
                },
              ]}
              emptyState={
                <div className="text-center py-8">
                  <p className="text-gray-500">No matching assignments</p>
                </div>
              }
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isPreviewOpen}
        onOpenChange={open => {
          setIsPreviewOpen(open);
          if (!open) {
            setSelectedForm(null);
            setPreviewAssetCode(null);
            setIsPreviewLoading(false);
          }
        }}
      >
        <AppDialogFrame
          className="h-[min(96dvh,920px)] max-h-[calc(100dvh-1rem)] w-[min(94vw,1040px)] max-w-[min(94vw,1040px)] min-h-0 overflow-hidden !flex !flex-col !gap-0 !p-0 !border-0 outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:w-[min(88vw,1040px)] sm:max-w-[min(88vw,1040px)] sm:rounded-2xl"
          showCloseButton={false}
        >
          <AppDialogGradientHeader
            title="Accountability form"
            description={
              previewAssetCode
                ? `Preview for asset ${previewAssetCode}.`
                : 'Preview the accountability form for this asset.'
            }
            showCloseButton={false}
            className="shrink-0 pb-3 pt-4 sm:pb-3 sm:pt-4"
          />
          <AppDialogBody className="flex min-h-0 flex-1 flex-col overflow-y-auto !p-0">
            {isPreviewLoading ? (
              <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
                Loading accountability preview...
              </div>
            ) : selectedForm ? (
              <AccountabilityFormDetail
                form={selectedForm}
                onClose={() => setIsPreviewOpen(false)}
                onSign={() => {
                  throw new Error(
                    'Signing is disabled in the assigned assets preview.'
                  );
                }}
                headerInParentChrome
                readOnly
                embedded
              />
            ) : (
              <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
                No accountability form available for this asset.
              </div>
            )}
          </AppDialogBody>
          <AppDialogChromeFooter className="shrink-0 border-t bg-gray-50 !py-3">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </AppDialogChromeFooter>
        </AppDialogFrame>
      </Dialog>
    </>
  );
}
