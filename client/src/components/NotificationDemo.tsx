'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAssetAssignmentNotifications } from '@/hooks/useAssetAssignmentNotifications';
import { useNotifications } from '@/context/NotificationContext';
import { Package, Wrench, AlertTriangle, Bell } from 'lucide-react';

export default function NotificationDemo() {
  const {
    triggerAssetAssignmentNotification,
    triggerMaintenanceNotification,
    triggerWarrantyNotification,
  } = useAssetAssignmentNotifications();

  const { unreadCount, isConnected } = useNotifications();

  const handleAssetAssignment = () => {
    triggerAssetAssignmentNotification({
      assetId: 'AST-001',
      assetName: 'MacBook Pro 16"',
      assignedBy: 'John Doe',
    });
  };

  const handleMaintenanceDue = () => {
    triggerMaintenanceNotification({
      assetId: 'AST-002',
      assetName: 'Server Rack A12',
      dueDate: '2024-01-20',
    });
  };

  const handleWarrantyExpiring = () => {
    triggerWarrantyNotification({
      assetId: 'AST-003',
      assetName: 'Cisco Router',
      expiryDate: '2024-02-15',
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notification System Demo</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge variant="outline">{unreadCount} unread</Badge>
          </div>
        </div>
        <CardDescription>
          Test the real-time notification system by triggering different types
          of notifications.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Button
            onClick={handleAssetAssignment}
            className="flex items-center gap-2 h-auto p-4 flex-col"
            variant="outline"
          >
            <Package className="h-8 w-8 text-blue-600" />
            <div className="text-center">
              <div className="font-medium">Asset Assignment</div>
              <div className="text-xs text-muted-foreground">
                Simulate asset assigned to user
              </div>
            </div>
          </Button>

          <Button
            onClick={handleMaintenanceDue}
            className="flex items-center gap-2 h-auto p-4 flex-col"
            variant="outline"
          >
            <Wrench className="h-8 w-8 text-orange-600" />
            <div className="text-center">
              <div className="font-medium">Maintenance Due</div>
              <div className="text-xs text-muted-foreground">
                Simulate maintenance reminder
              </div>
            </div>
          </Button>

          <Button
            onClick={handleWarrantyExpiring}
            className="flex items-center gap-2 h-auto p-4 flex-col"
            variant="outline"
          >
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="text-center">
              <div className="font-medium">Warranty Expiring</div>
              <div className="text-xs text-muted-foreground">
                Simulate warranty expiration
              </div>
            </div>
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Click any button above to trigger a notification</li>
            <li>• Notifications will appear in the navbar bell icon</li>
            <li>• Real-time notifications use WebSocket connections</li>
            <li>• Toast notifications will also appear for important events</li>
            <li>• Connection status shows if WebSocket is connected</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium mb-2 text-blue-900">Integration Notes:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Backend should emit 'asset-assigned' events via Socket.IO</li>
            <li>• Configure VITE_SOCKET_URL environment variable</li>
            <li>• Notifications persist in context state during session</li>
            <li>• Mark as read functionality updates UI immediately</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
