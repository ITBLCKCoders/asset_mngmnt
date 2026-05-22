import { createContext, useContext } from 'react';
import type { NotificationContextType } from '@/types/notifications';

/** Stable context instance (separate file avoids HMR replacing the context object). */
export const NotificationsReactContext = createContext<
  NotificationContextType | undefined
>(undefined);

export function useNotifications() {
  const context = useContext(NotificationsReactContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
}
