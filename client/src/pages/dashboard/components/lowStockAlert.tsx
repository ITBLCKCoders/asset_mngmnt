import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Package, Users, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function LowStockAlerts({ items }: any) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertCircle className="h-5 w-5" />
            Low Stock Alert
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map((i: any) => (
              <div key={i.name} className="flex items-center justify-between">
                <span className="text-sm">{i.name}</span>
                <Badge variant="destructive">{i.inStock} left</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button className="w-full justify-start" variant="outline" size="sm">
            <Package className="mr-2 h-4 w-4" /> Add New Asset
          </Button>
          <Button className="w-full justify-start" variant="outline" size="sm">
            <Users className="mr-2 h-4 w-4" /> Assign Asset
          </Button>
          <Button className="w-full justify-start" variant="outline" size="sm">
            <TrendingUp className="mr-2 h-4 w-4" /> Generate Report
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
