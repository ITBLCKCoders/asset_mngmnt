export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type:
    | 'asset_assigned'
    | 'accountability_form'
    | 'maintenance_due'
    | 'warranty_expiring'
    | 'asset_relocated'
    | 'depreciation_report'
    | 'new_asset'
    | 'other'
    | 'asset_request_status_change'
    | 'user_lockout';
  assetId?: string;
  assetName?: string;
  assignedBy?: string;
  timestamp: Date;
  requestId?: string;
  status?: string;
  assetType?: string;
  /** From server notification data: where to navigate when notification is clicked */
  actionTarget?: string;
  /** Optional explicit route (e.g. /assets/return-requests) for click navigation */
  route?: string;
  /** Accountability declined by assignee — open detail dialog */
  formId?: string;
  declineReason?: string;
  formNumber?: string;
  /** Assignee display name (e.g. HR “ready to receive” notifications) */
  assigneeName?: string;
  /** User lockout notification fields */
  userId?: string;
  username?: string;
  lockoutMinutes?: number;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp'>
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
  /** Refetch notifications from the server (e.g. when opening the dropdown) */
  refreshNotifications: () => Promise<void>;
  isConnected: boolean;
}

export interface AssetAssignmentNotificationData {
  assetId: string;
  assetName: string;
  assignedTo: string;
  assignedBy: string;
  timestamp: string;
}

// Socket event types for better type safety
export interface SocketEvents {
  // Server to client events
  'asset-assigned': (data: AssetAssignmentNotificationData) => void;
  notification: (data: NotificationPayload) => void;
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
  reconnect: (attemptNumber: number) => void;
  reconnect_attempt: (attemptNumber: number) => void;

  // Client to server events (if needed)
  'mark-notification-read': (notificationId: string) => void;
  'mark-all-notifications-read': () => void;
}

export interface NotificationPayload {
  id?: string;
  title?: string;
  description?: string;
  type?: Notification['type'];
  assetId?: string;
  assetName?: string;
  assignedBy?: string;
  timestamp?: string;
  actionTarget?: string;
  route?: string;
  formId?: string;
  declineReason?: string;
  formNumber?: string;
  assigneeName?: string;
}

// Socket configuration interface
export interface SocketConfig {
  url: string;
  auth: {
    token: string;
  };
  transports: ('websocket' | 'polling')[];
  reconnectionAttempts: number;
  reconnectionDelay: number;
  reconnectionDelayMax: number;
  timeout: number;
  autoConnect: boolean;
}
