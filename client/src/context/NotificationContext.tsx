'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  ReactNode,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import {
  Notification,
  NotificationContextType,
  AssetAssignmentNotificationData,
} from '@/types/notifications';
import { getToken, api } from '@/lib/api';
import { handleApiError } from '@/utils/assetErrorHandling';
import { createLogger } from '@/lib/logger';
import { getApiBase } from '@/lib/env';

// Create a logger instance for NotificationContext
const logger = createLogger('NotificationContext');

const API_BASE = getApiBase();

// Action types
type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean };

// State interface
interface NotificationState {
  notifications: Notification[];
  isConnected: boolean;
}

// Initial state
const initialState: NotificationState = {
  notifications: [],
  isConnected: false,
};

// Reducer function
function notificationReducer(
  state: NotificationState,
  action: NotificationAction
): NotificationState {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
      };
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif =>
          notif.id === action.payload ? { ...notif, read: true } : notif
        ),
      };
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif => ({
          ...notif,
          read: true,
        })),
      };
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(
          notif => notif.id !== action.payload
        ),
      };
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.payload,
      };
    default:
      return state;
  }
}

// Create context
const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// Provider component
interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const [token, setToken] = useState<string | null>(getToken());
  const socketRef = useRef<Socket | null>(null);
  const isRefreshingRef = useRef(false);

  // Calculate unread count
  const unreadCount = state.notifications.filter(notif => !notif.read).length;

  const addNotification = useCallback((
    notification: Omit<Notification, 'id' | 'timestamp'>
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

    // Show toast notification for real-time notifications
    if (notification.type === 'asset_assigned') {
      toast.success(
        `Asset Assigned: ${notification.assetName || 'New asset'}`,
        {
          description: notification.description,
          duration: 5000,
        }
      );
    } else if (notification.type === 'accountability_form') {
      toast.success(
        'Accountability Form Issued',
        {
          description: notification.description,
          duration: 5000,
        }
      );
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      logger.info('Fetching notifications from API');
      const response = await api.get('/notifications');
      logger.info('API response received', {
        count: response.notifications?.length || 0,
      });
      const notifications: Notification[] = (response.notifications || []).map(
        (notif: any) => ({
          ...notif,
          timestamp: new Date(notif.timestamp),
        })
      );
      logger.info('Setting notifications in state (newest first)', {
        count: notifications.length,
      });
      dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
    } catch (error: any) {
      logger.error('Error fetching notifications', error);

      if (error.response?.data?.notifications) {
        logger.info('Using fallback notifications from error response');
        const fallback: Notification[] = error.response.data.notifications.map(
          (notif: any) => ({
            ...notif,
            timestamp: new Date(notif.timestamp),
          })
        );

        dispatch({ type: 'SET_NOTIFICATIONS', payload: fallback });

        if (error.response.data.warning) {
          logger.warn(error.response.data.warning);
        }

        return;
      }

      handleApiError(error, 'Notification fetch');
      if (error.response?.status >= 500) {
        logger.warn(
          'Server error when fetching notifications, will retry later'
        );
      }
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    dispatch({ type: 'MARK_AS_READ', payload: id });
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (error) {
      handleApiError(error, 'Mark notification as read');
      void fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    dispatch({ type: 'MARK_ALL_AS_READ' });
    try {
      await api.patch('/notifications/mark-all-read');
    } catch (error) {
      handleApiError(error, 'Mark all notifications as read');
      void fetchNotifications();
    }
  }, [fetchNotifications]);

  const clearNotifications = useCallback(async () => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
    try {
      await api.delete('/notifications');
    } catch (error) {
      handleApiError(error, 'Clear all notifications');
      void fetchNotifications();
    }
  }, [fetchNotifications]);

  const removeNotification = useCallback(async (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
    try {
      await api.delete(`/notifications/${id}`);
    } catch (error) {
      handleApiError(error, 'Remove notification');
      void fetchNotifications();
    }
  }, [fetchNotifications]);

  // Initialize socket connection
  useEffect(() => {
    const token = getToken();
    if (!token) {
      logger.info('No token found, skipping socket connection');
      return;
    }

    // Use current window origin for socket URL to work across network
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      `${window.location.protocol}//${window.location.hostname}:6996`;
    logger.info('Connecting to socket', { url: socketUrl });

    let connectionAttempts = 0;
    const maxConnectionAttempts = 5;

    // Initialize socket connection with better error handling
    const socket = io(socketUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      // Improved reconnection settings
      reconnectionAttempts: maxConnectionAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: true,
      withCredentials: true,
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
      connectionAttempts = 0; // Reset connection attempts on successful connection
    });

    socket.on('disconnect', reason => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });

      // Only attempt reconnection if it's not a manual disconnect
      if (
        reason !== 'io client disconnect' &&
        reason !== 'io server disconnect'
      ) {
        logger.debug('Attempting to reconnect...');
      }
    });

    socket.on('connect_error', async error => {
      connectionAttempts++;
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });

      // Log the error for debugging but don't spam console
      if (connectionAttempts === 1) {
        logger.warn(`[SOCKET] Connection error: ${error.message}. Will retry with polling if WebSocket fails.`);
      }

      // Check if error is due to authentication (expired token)
      if (error.message?.includes('TokenExpiredError') || error.message?.includes('401') || error.message?.includes('unauthorized')) {
        logger.info('[SOCKET] Authentication error detected, attempting token refresh');
        
        // Prevent multiple simultaneous refresh attempts
        if (isRefreshingRef.current) {
          logger.debug('[SOCKET] Refresh already in progress, skipping');
          return;
        }

        isRefreshingRef.current = true;

        try {
          // Call HTTP refresh endpoint
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });

          if (refreshRes.ok) {
            const newToken = getToken();
            if (newToken) {
              // Re-authenticate socket with new token
              socket.emit('authenticate', newToken);
              logger.info('[SOCKET] Token refreshed and socket re-authenticated');
            }
          } else {
            logger.warn('[SOCKET] Token refresh failed, disconnecting socket');
            socket.disconnect();
          }
        } catch (refreshError) {
          logger.error('[SOCKET] Token refresh error:', refreshError);
          socket.disconnect();
        } finally {
          isRefreshingRef.current = false;
        }
      }

      if (connectionAttempts >= maxConnectionAttempts) {
        logger.warn(
          `[SOCKET] Failed to connect after ${maxConnectionAttempts} attempts. Socket.IO will fall back to polling transport. Server should be running at ${socketUrl}`
        );
        // Don't automatically retry if max attempts reached - let Socket.IO handle fallback to polling
        socket.io.reconnection(false);
      }
    });

    socket.on('reconnect_failed', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
    });

    socket.on('reconnect', attemptNumber => {
      // Reconnected successfully
    });

    socket.on('reconnect_attempt', attemptNumber => {
      // Reconnection attempt
    });

    // Listen for authentication confirmation from server
    socket.on('authenticated', (data: { success: boolean; userId?: string; error?: string }) => {
      if (data.success) {
        logger.info(`[SOCKET] Successfully re-authenticated as user ${data.userId}`);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
      } else {
        logger.warn(`[SOCKET] Re-authentication failed: ${data.error}`);
        // If re-authentication fails, disconnect and let the user log in again
        socket.disconnect();
      }
    });

    // Listen for asset assignment notifications
    socket.on('asset-assigned', (data: AssetAssignmentNotificationData) => {
      addNotification({
        title: 'Asset Assigned',
        description: `${data.assetName} has been assigned to you by ${data.assignedBy}`,
        time: 'Just now',
        read: false,
        type: 'asset_assigned',
        assetId: data.assetId,
        assetName: data.assetName,
        assignedBy: data.assignedBy,
      });
    });

    // Listen for general notifications (real-time from server)
    socket.on('notification', (raw: any) => {
      // Server emissions are inconsistent: some put payload fields at the top
      // level and others nest them under `data`. Merge both shapes.
      const d =
        raw && raw.data && typeof raw.data === 'object'
          ? { ...raw, ...raw.data }
          : raw;
      addNotification({
        title: d.title || 'New Notification',
        description: d.description || d.message || 'You have a new notification',
        time: d.time || 'Just now',
        read: false,
        type: d.type || 'other',
        assetId: d.assetId,
        assetName: d.assetName,
        assignedBy: d.assignedBy,
        requestId: d.requestId,
        status: d.status,
        assetType: d.assetType,
        actionTarget: d.actionTarget,
        route: d.route,
        formId: d.formId,
        declineReason: d.declineReason,
        formNumber: d.formNumber,
        assigneeName: d.assigneeName,
      });
    });

    // Listen for asset request status change notifications
    socket.on('asset_request_status_change', (data: any) => {
      addNotification({
        title: `Asset Request ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
        description:
          data.message || `Your asset request has been ${data.status}`,
        time: 'Just now',
        read: false,
        type: 'asset_request_status_change',
        requestId: data.requestId,
        status: data.status,
        assetName: data.assetName,
        assetType: data.assetType,
      });
    });

    // Cleanup on unmount or token change
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  // Update token state when it changes
  useEffect(() => {
    const handleTokenChange = () => {
      const nextToken = getToken();
      setToken(nextToken);
      if (!nextToken) {
        dispatch({ type: 'CLEAR_NOTIFICATIONS' });
      }
    };

    window.addEventListener('tokenChanged', handleTokenChange);
    window.addEventListener('storage', handleTokenChange); // Also listen for storage changes from other tabs
    return () => {
      window.removeEventListener('tokenChanged', handleTokenChange);
      window.removeEventListener('storage', handleTokenChange);
    };
  }, []);

  // Fetch notifications on load, when tab becomes visible, and on an interval (no need to open bell)
  useEffect(() => {
    if (!token) return;
    fetchNotifications();

    // Refetch as soon as user returns to this tab
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Poll every 10s while tab is visible so badge and list update without opening the bell
    const pollIntervalMs = 10 * 1000;
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, pollIntervalMs);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(intervalId);
    };
  }, [token, fetchNotifications]);

  const contextValue = useMemo<NotificationContextType>(
    () => ({
      notifications: state.notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      removeNotification,
      refreshNotifications: fetchNotifications,
      isConnected: state.isConnected,
    }),
    [
      state.notifications,
      state.isConnected,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      removeNotification,
      fetchNotifications,
    ]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use notification context
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
}
