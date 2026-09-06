'use client';

import { Badge } from '@/components/ui/badge';
import { assetColumns } from '../../assets-list/assetsComponents/assetTable/assetColumns';

interface TaggingColumnsProps {
  selectedAssets: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  hasPermission: (module: string, action: string) => boolean;
}

export function TaggingColumns({
  selectedAssets,
  onSelect,
  hasPermission,
}: TaggingColumnsProps) {
  const taggingColumns = [
    ...assetColumns.slice(0, 4), // Asset Code, Name, Description, Category
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'type',
      size: 110,
    },
    {
      id: 'status',
      header: 'Status',
      size: 130,
      cell: ({
        row,
      }: {
        row: {
          original: { status: string };
        };
      }) => {
        const status = row.original.status;

        const variants = {
          Assigned: {
            label: 'Assigned',
            variant: 'default' as const,
            className:
              'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/25 dark:text-emerald-300',
          },
          Available: {
            label: 'Available',
            variant: 'outline' as const,
            className:
              'bg-blue-500/10 text-blue-700 border-blue-500/30 hover:bg-blue-500/20 dark:text-blue-300',
          },
          'In Maintenance': {
            label: 'In Maintenance',
            variant: 'secondary' as const,
            className:
              'bg-orange-500/10 text-orange-700 border-orange-500/40 hover:bg-orange-500/20 dark:text-orange-300',
          },
        } as const;

        const style = variants[status as keyof typeof variants] ?? {
          label: status,
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
    {
      id: 'location',
      header: 'Location',
      size: 150,
      cell: ({ row }: any) => {
        const currentAssignment = row.original.currentAssignment;
        return <span>{currentAssignment?.location || 'N/A'}</span>;
      },
    },
  ];

  return taggingColumns;
}
