'use client';

import { useEffect, useCallback } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';

export function useAssetAssignmentNotifications() {
  const { addNotification } = useNotifications();
  const { user } = useCurrentUser();

  // Listen for asset assignment notifications
  useEffect(() => {
    if (!user?.id) return;

    // This would typically be handled by the NotificationContext's socket connection
    // But we can add additional logic here specific to asset assignments

    // Example: Poll for new assignments if WebSocket is not available
    const pollForAssignments = async () => {
      try {
        // This would be an API endpoint to check for new asset assignments
        // const response = await api.get('/notifications/asset-assignments');
        // if (response.data?.length > 0) {
        //   response.data.forEach((assignment: any) => {
        //     addNotification({
        //       title: 'Asset Assigned',
        //       description: `${assignment.assetName} has been assigned to you`,
        //       time: 'Just now',
        //       read: false,
        //       type: 'asset_assigned',
        //       assetId: assignment.assetId,
        //       assetName: assignment.assetName,
        //       assignedBy: assignment.assignedBy,
        //     });
        //   });
        // }
      } catch (error) {
        console.error('Error polling for asset assignments:', error);
      }
    };

    // Set up polling interval as fallback (every 30 seconds)
    const interval = setInterval(pollForAssignments, 30000);

    return () => clearInterval(interval);
  }, [user?.id, addNotification]);

  // Function to manually trigger an asset assignment notification (for testing)
  const triggerAssetAssignmentNotification = useCallback(
    (assetData: { assetId: string; assetName: string; assignedBy: string }) => {
      addNotification({
        title: 'Asset Assigned',
        description: `${assetData.assetName} has been assigned to you by ${assetData.assignedBy}`,
        time: 'Just now',
        read: false,
        type: 'asset_assigned',
        assetId: assetData.assetId,
        assetName: assetData.assetName,
        assignedBy: assetData.assignedBy,
      });
    },
    [addNotification]
  );

  // Function to simulate a maintenance due notification
  const triggerMaintenanceNotification = useCallback(
    (assetData: { assetId: string; assetName: string; dueDate: string }) => {
      addNotification({
        title: 'Maintenance Due',
        description: `${assetData.assetName} requires maintenance by ${assetData.dueDate}`,
        time: 'Just now',
        read: false,
        type: 'maintenance_due',
        assetId: assetData.assetId,
        assetName: assetData.assetName,
      });
    },
    [addNotification]
  );

  // Function to simulate a warranty expiring notification
  const triggerWarrantyNotification = useCallback(
    (assetData: { assetId: string; assetName: string; expiryDate: string }) => {
      addNotification({
        title: 'Warranty Expiring',
        description: `${assetData.assetName} warranty expires on ${assetData.expiryDate}`,
        time: 'Just now',
        read: false,
        type: 'warranty_expiring',
        assetId: assetData.assetId,
        assetName: assetData.assetName,
      });
    },
    [addNotification]
  );

  // Function to handle asset request status change notifications
  const handleAssetRequestStatusChange = useCallback(
    (requestData: {
      requestId: string;
      status: string;
      message: string;
      assetName?: string;
      assetType?: string;
    }) => {
      addNotification({
        title: `Asset Request ${requestData.status.charAt(0).toUpperCase() + requestData.status.slice(1)}`,
        description:
          requestData.message ||
          `Your asset request has been ${requestData.status}`,
        time: 'Just now',
        read: false,
        type: 'asset_request_status_change',
        requestId: requestData.requestId,
        status: requestData.status,
        assetName: requestData.assetName,
        assetType: requestData.assetType,
      });
    },
    [addNotification]
  );

  return {
    triggerAssetAssignmentNotification,
    triggerMaintenanceNotification,
    triggerWarrantyNotification,
    handleAssetRequestStatusChange,
  };
}
