'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

export interface AssetByTypeItem {
  typeName: string;
  typeId: string;
  typeCode?: string;
  total: number;
  inUse: number;
}

export default function AssetByTypeCards({
  data,
}: {
  data: AssetByTypeItem[];
}) {
  if (!data?.length) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No asset types
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {data.map(item => {
        const available = Math.max(0, item.total - item.inUse);
        return (
          <Card
            key={item.typeId || item.typeName}
            className="hover:shadow-md transition-shadow"
          >
            <CardHeader className="space-y-1.5 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{item.typeName || 'Uncategorized'}</span>
              </CardTitle>
              {item.typeCode ? (
                <p className="text-xs text-muted-foreground pl-6">
                  Code: <span className="font-mono">{item.typeCode}</span>
                </p>
              ) : null}
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">{item.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">In use</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {item.inUse}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {available}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
