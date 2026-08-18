import { format, differenceInYears } from 'date-fns';
import {
  FileText,
  ChevronRight,
  ChevronDown,
  Package,
  Edit,
  Eye,
} from 'lucide-react';
import { generateAccountabilityFormPDF, type AccountabilityForm } from '@/pages/assets/accountability/accountabilityForm';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';

export const assetColumns = [
  // 1. Asset Code
  {
    id: 'id',
    header: 'Asset Code',
    accessorKey: 'id',
    size: 220,
    cell: ({ row }: any) => {
      const canExpand = row.getCanExpand();
      const isChildRow = row.depth > 0;
      return (
        <div
          className="flex items-center gap-1"
          style={{ paddingLeft: isChildRow ? `${row.depth * 20}px` : undefined }}
        >
          {canExpand ? (
            <button
              type="button"
              aria-label={row.getIsExpanded() ? 'Collapse builder assets' : 'Expand builder assets'}
              onClick={e => {
                e.stopPropagation();
                row.toggleExpanded();
              }}
              className="rounded p-0.5 hover:bg-gray-100"
            >
              {row.getIsExpanded() ? (
                <ChevronDown className="h-4 w-4 text-[#EE1D25]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          ) : isChildRow ? (
            <span className="flex w-5 shrink-0 items-center justify-center text-gray-300">
              └
            </span>
          ) : (
            <span className="w-5 shrink-0" />
          )}
          <span className={isChildRow ? 'truncate text-gray-600' : 'truncate'}>
            {row.original.id}
          </span>
        </div>
      );
    },
  },

  // 2. Asset Name
  {
    id: 'name',
    header: 'Asset Name',
    accessorKey: 'name',
    size: 220,
    cell: ({ row }: any) => (
      <span className={row.depth > 0 ? 'text-gray-600' : undefined}>
        {row.original.name}
      </span>
    ),
  },

  // 4. Description
  {
    id: 'description',
    header: 'Description',
    accessorKey: 'description',
    size: 280,
    cell: ({ row }: any) => (
      <div className="truncate max-w-[260px]">{row.original.description}</div>
    ),
  },

  // 5. Category
  { id: 'category', header: 'Category', accessorKey: 'category', size: 130 },

  // 6. Type
  { id: 'type', header: 'Type', accessorKey: 'type', size: 110 },

  // 7. Serial No
  { id: 'serialNo', header: 'Serial No', accessorKey: 'serialNo', size: 150 },

  // 8. Model
  { id: 'modelNo', header: 'Model', accessorKey: 'modelNo', size: 120 },

  // 9. Brand
  { id: 'brand', header: 'Brand', accessorKey: 'brand', size: 110 },

  {
    id: 'status',
    header: 'Status',
    accessorFn: (row: any) =>
      row.isAssetBuilder && row.builderStatus ? row.builderStatus : row.status,
    size: 130,
    cell: ({
      row,
    }: {
      row: {
        original: {
          status: string;
          isAssetBuilder?: boolean;
          builderStatus?: string;
        };
      };
    }) => {
      // Check for transferred status first (takes precedence over builderStatus)
      if (String(row.original.status).startsWith('Transferred to ')) {
        return (
          <Badge
            variant="secondary"
            className="font-medium border bg-slate-100 text-slate-700 border-slate-300 transition-all duration-200"
          >
            {row.original.status}
          </Badge>
        );
      }
      // Use builderStatus for asset builders, otherwise use regular status
      const displayStatus =
        row.original.isAssetBuilder && row.original.builderStatus
          ? row.original.builderStatus
          : row.original.status;
      if (String(displayStatus).startsWith('Transferred to ')) {
        return (
          <Badge
            variant="secondary"
            className="font-medium border bg-slate-100 text-slate-700 border-slate-300 transition-all duration-200"
          >
            {displayStatus}
          </Badge>
        );
      }

      const variants = {
        Assigned: {
          label: 'Assigned',
          variant: 'default' as const,
          className:
            'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/25',
        },
        Available: {
          label: 'Available',
          variant: 'outline' as const,
          className:
            'bg-blue-500/10 text-blue-700 border-blue-500/30 hover:bg-blue-500/20',
        },
        'In Maintenance': {
          label: 'In Maintenance',
          variant: 'secondary' as const,
          className:
            'bg-orange-500/10 text-orange-700 border-orange-500/40 hover:bg-orange-500/20',
        },
        Partial: {
          label: 'Partial',
          variant: 'secondary' as const,
          className:
            'bg-yellow-500/15 text-yellow-700 border-yellow-500/30 hover:bg-yellow-500/25',
        },
      } as const;

      const style = variants[displayStatus as keyof typeof variants] ?? {
        label: displayStatus,
        variant: 'secondary' as const,
        className: 'bg-muted text-muted-foreground',
      };

      return (
        <Badge
          variant={style.variant}
          className={`font-medium border ${style.className} transition-all duration-200`}
        >
          {style.label}
        </Badge>
      );
    },
  },

  // 11. Assigned To
  {
    id: 'assignedTo',
    header: 'Assigned To',
    accessorFn: (row: any) => row.currentAssignment?.user?.name ?? '',
    size: 250,
    cell: ({ row }: any) => {
      const currentAssignment = row.original.currentAssignment;
      if (currentAssignment) {
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {currentAssignment.user.name}
            </div>
            <div className="text-gray-600 text-xs">
              {currentAssignment.user.employeeNumber || 'No ID'}
            </div>
            <div className="text-gray-600 text-xs">
              {currentAssignment.user.position || 'No position'}
            </div>
          </div>
        );
      }
      return <span className="text-gray-400">Not assigned</span>;
    },
  },

  // 12. Accountability Form #
  {
    id: 'accountabilityForm',
    header: 'Accountability Form #',
    accessorFn: (row: any) => row.accountabilityForm?.formNumber ?? '',
    size: 220,
    cell: ({ row }: any) => {
      const accountabilityForm = row.original.accountabilityForm;
      
      if (accountabilityForm) {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="font-mono text-xs h-auto py-1 px-2 hover:bg-blue-50 hover:text-blue-700"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                // Fetch the full accountability form data to get issuer and other fields
                const { api } = await import('@/lib/api');
                const fullFormResponse = await api.get(`/accountability-forms/${accountabilityForm.id}`);
                const fullForm = fullFormResponse.form;
                
                const pdfBlob = await generateAccountabilityFormPDF(fullForm);
                const pdfUrl = URL.createObjectURL(pdfBlob);
                window.dispatchEvent(
                  new CustomEvent('openPdfPreview', {
                    detail: { pdfUrl, title: `Accountability Form ${accountabilityForm.formNumber}` },
                  })
                );
              } catch (error) {
                window.dispatchEvent(
                  new CustomEvent('showPdfNotAvailable', {
                    detail: { message: 'Failed to generate PDF for this accountability form' },
                  })
                );
              }
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            {accountabilityForm.formNumber}
          </Button>
        );
      }
      return <span className="text-gray-400 text-xs">—</span>;
    },
  },

  // 12. Department
  {
    id: 'department',
    header: 'Department',
    accessorKey: 'department',
    size: 140,
    cell: ({ row }: any) => {
      const department = row.original.department;
      return <span>{department || ''}</span>;
    },
  },

  // 13. Location
  {
    id: 'location',
    header: 'Location',
    accessorKey: 'location',
    size: 150,
    cell: ({ row }: any) => {
      const location = row.original.location;
      return <span>{location || ''}</span>;
    },
  },

  // 14. Purchase Date
  {
    id: 'purchaseDate',
    header: 'Purchase Date',
    accessorKey: 'purchaseDate',
    size: 140,
    cell: ({ row }: any) =>
      row.original.purchaseDate
        ? format(new Date(row.original.purchaseDate), 'MMM dd, yyyy')
        : '—',
  },

  // 15. Purchase Price
  {
    id: 'purchasePrice',
    header: 'Purchase Price',
    accessorKey: 'purchasePrice',
    size: 140,
    cell: ({ row }: any) => formatCurrency(row.original.purchasePrice),
  },

  // 16. Supplier
  { id: 'supplier', header: 'Supplier', accessorKey: 'supplier', size: 140 },

  // 17. Warranty
  {
    id: 'warranty',
    header: 'Warranty',
    accessorFn: (row: any) => row.warranty_months ?? 0,
    size: 130,
    cell: ({ row }: any) =>
      row.original.warranty_months
        ? `${row.original.warranty_months} months`
        : '—',
  },

  // 18. Documents
  {
    id: 'documents',
    header: 'Documents',
    accessorFn: (row: any) => row.documents?.length ?? 0,
    size: 120,
    cell: ({ row }: any) => {
      const docs = row.original.documents || [];
      return (
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="font-medium">{docs.length}</span>
        </div>
      );
    },
  },

  // 19. Maintenance Schedule
  {
    id: 'maintenanceSchedule',
    header: 'Maintenance Schedule',
    accessorKey: 'maintenanceSchedule',
    size: 180,
  },

  // 20. Last Maintenance Date
  {
    id: 'lastMaintenanceDate',
    header: 'Last Maintenance Date',
    accessorKey: 'lastMaintenanceDate',
    size: 180,
    cell: ({ row }: any) =>
      row.original.lastMaintenanceDate
        ? format(row.original.lastMaintenanceDate, 'MMM dd, yyyy')
        : '—',
  },

  // 21. Next Maintenance Date
  {
    id: 'nextMaintenanceDate',
    header: 'Next Maintenance Date',
    accessorKey: 'nextMaintenanceDate',
    size: 180,
    cell: ({ row }: any) =>
      row.original.nextMaintenanceDate
        ? format(row.original.nextMaintenanceDate, 'MMM dd, yyyy')
        : '—',
  },

  //22. Condition
  {
    id: 'condition',
    header: 'Condition',
    accessorKey: 'condition',
    size: 130,
    cell: ({ row }: any) => {
      const condition = row.original.condition;

      const variants: Record<
        string,
        { label: string; variant: any; className: string }
      > = {
        New: {
          label: 'New',
          variant: 'default',
          className:
            'bg-green-500/15 text-green-700 border-green-500/30 hover:bg-green-500/25',
        },
        Excellent: {
          label: 'Excellent',
          variant: 'default',
          className:
            'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/25',
        },
        Good: {
          label: 'Good',
          variant: 'default',
          className:
            'bg-blue-500/15 text-blue-700 border-blue-500/30 hover:bg-blue-500/25',
        },
        Fair: {
          label: 'Fair',
          variant: 'outline',
          className:
            'bg-cyan-500/10 text-cyan-700 border-cyan-500/30 hover:bg-cyan-500/20',
        },
        Poor: {
          label: 'Poor',
          variant: 'outline',
          className:
            'bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/25',
        },
        Bad: {
          label: 'Bad',
          variant: 'destructive',
          className:
            'bg-red-500/15 text-red-700 border-red-500/30 hover:bg-red-500/25',
        },
        'Needs Repair': {
          label: 'Needs Repair',
          variant: 'outline',
          className:
            'bg-orange-500/10 text-orange-700 border-orange-500/40 hover:bg-orange-500/20',
        },
        Damaged: {
          label: 'Damaged',
          variant: 'destructive',
          className:
            'bg-red-500/15 text-red-700 border-red-500/30 hover:bg-red-500/25',
        },
        Obsolete: {
          label: 'Obsolete',
          variant: 'secondary',
          className:
            'bg-gray-500/15 text-gray-700 border-gray-500/30 hover:bg-gray-500/25',
        },
      };

      const style = variants[condition] || {
        label: condition,
        variant: 'secondary',
        className: 'bg-muted text-muted-foreground',
      };

      return (
        <Badge
          variant={style.variant}
          className={`font-medium border ${style.className} transition-all duration-200`}
        >
          {style.label}
        </Badge>
      );
    },
  },
  // 23. Useful Life
  {
    id: 'usefulLife',
    header: 'Useful Life',
    accessorFn: (row: any) => {
      if (!row.purchaseDate || !row.usefulLifeYears) return -1;
      const yearsOld = differenceInYears(
        new Date(),
        new Date(row.purchaseDate)
      );
      const total = row.usefulLifeYears;
      return Math.min(100, Math.max(0, (yearsOld / total) * 100));
    },
    size: 200,
    cell: ({ row }: any) => {
      if (!row.original.purchaseDate || !row.original.usefulLifeYears) {
        return <span className="text-muted-foreground">—</span>;
      }
      const yearsOld = differenceInYears(
        new Date(),
        new Date(row.original.purchaseDate)
      );
      const total = row.original.usefulLifeYears;
      const percent = Math.min(100, Math.max(0, (yearsOld / total) * 100));
      const isExpired = yearsOld > total;

      const fillColor = isExpired
        ? 'bg-red-500'
        : percent >= 95
          ? 'bg-orange-500'
          : percent >= 70
            ? 'bg-yellow-500'
            : 'bg-green-500';

      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>
              {yearsOld} / {total} years
            </span>
            {isExpired && (
              <span className="text-red-600 font-semibold">Expired</span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
            <div
              className={`h-1 transition-all duration-500 ease-out ${fillColor}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      );
    },
  },

  // Salvage / Residual Value
  {
    id: 'salvageValue',
    header: 'Salvage / Residual Value',
    accessorKey: 'salvageValue',
    size: 180,
    cell: ({ row }: any) => formatCurrency(row.original.salvageValue),
  },

  // Depreciation Method
  {
    id: 'depreciationMethod',
    header: 'Depreciation Method',
    accessorKey: 'depreciationMethod',
    size: 170,
  },

  // Annual Depreciation
  {
    id: 'annualDepreciation',
    header: 'Annual Depreciation',
    accessorKey: 'annualDepreciation',
    size: 160,
    cell: ({ row }: any) => formatCurrency(row.original.annualDepreciation),
  },

  // Book Value
  {
    id: 'bookValue',
    header: 'Book Value',
    accessorKey: 'bookValue',
    size: 150,
    cell: ({ row }: any) => formatCurrency(row.original.bookValue ?? 0),
  },

  // Accumulated Depreciation
  {
    id: 'accumulatedDepreciation',
    header: 'Accumulated Depreciation',
    accessorKey: 'accumulatedDepreciation',
    size: 190,
    cell: ({ row }: any) =>
      formatCurrency(row.original.accumulatedDepreciation ?? 0),
  },

  // Depreciation per Month
  {
    id: 'monthlyDepreciation',
    header: 'Depreciation / Month',
    accessorKey: 'monthlyDepreciation',
    size: 180,
    cell: ({ row }: any) => formatCurrency(row.original.monthlyDepreciation ?? 0),
  },

  // Depreciation Start Date
  {
    id: 'depreciationStartDate',
    header: 'Depreciation Start Date',
    accessorKey: 'depreciationStartDate',
    size: 180,
    cell: ({ row }: any) =>
      row.original.depreciationStartDate
        ? format(row.original.depreciationStartDate, 'MMM dd, yyyy')
        : '—',
  },

  // Company
  {
    id: 'company',
    header: 'Company',
    accessorKey: 'company',
    size: 140,
  },

  // Building
  {
    id: 'building',
    header: 'Building',
    accessorKey: 'building',
    size: 140,
  },

  // 24. Created By
  {
    id: 'createdBy',
    header: 'Created By',
    accessorKey: 'createdBy',
    size: 180,
    cell: ({ row }: any) => {
      const displayName = row.original.createdBy.includes('@')
        ? row.original.createdBy
            .split('@')[0]
            .replace(/[._-]/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase())
        : row.original.createdBy;
      return <span className="text-sm">{displayName}</span>;
    },
  },

  // 25. Date Created
  {
    id: 'createdAt',
    header: 'Date Created',
    accessorKey: 'createdAt',
    size: 160,
    cell: ({ row }: any) =>
      row.original.createdAt &&
      row.original.createdAt instanceof Date &&
      !isNaN(row.original.createdAt.getTime())
        ? format(row.original.createdAt, 'MMM dd, yyyy h:mm a')
        : '—',
  },

  // 26. Updated By
  {
    id: 'updatedBy',
    header: 'Updated By',
    accessorKey: 'updatedBy',
    size: 180,
    cell: ({ row }: any) => {
      const displayName = row.original.updatedBy.includes('@')
        ? row.original.updatedBy
            .split('@')[0]
            .replace(/[._-]/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase())
        : row.original.updatedBy;
      return <span className="text-sm">{displayName}</span>;
    },
  },

  // 27. Last Updated
  {
    id: 'updatedAt',
    header: 'Last Updated',
    accessorKey: 'updatedAt',
    size: 160,
    cell: ({ row }: any) =>
      row.original.updatedAt &&
      row.original.updatedAt instanceof Date &&
      !isNaN(row.original.updatedAt.getTime())
        ? format(row.original.updatedAt, 'MMM dd, yyyy h:mm a')
        : '—',
  },
];
