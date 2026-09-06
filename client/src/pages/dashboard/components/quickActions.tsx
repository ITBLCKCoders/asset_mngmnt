import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  HandHelping,
  Wrench,
  ArrowRightLeft,
  RotateCcw,
} from 'lucide-react';

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  variant?: 'default' | 'outline' | 'secondary';
}

const ACTIONS: QuickAction[] = [
  {
    label: 'Borrow Asset',
    icon: HandHelping,
    path: '/assets/borrow',
    variant: 'outline',
  },
  {
    label: 'Report Maintenance',
    icon: Wrench,
    path: '/assets/maintenance',
    variant: 'outline',
  },
  {
    label: 'Transfer Asset',
    icon: ArrowRightLeft,
    path: '/assets/transfer',
    variant: 'outline',
  },
  {
    label: 'Return Asset',
    icon: RotateCcw,
    path: '/assets/return',
    variant: 'outline',
  },
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {ACTIONS.map(action => (
          <Button
            key={action.label}
            className="w-full justify-start"
            variant={action.variant || 'outline'}
            size="sm"
            onClick={() => navigate(action.path)}
          >
            <action.icon className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
