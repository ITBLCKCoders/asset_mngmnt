'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell, BellRing, Check, CheckCheck, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/types/notifications';
import { AccountabilityDeclinedNotificationDialog } from '@/components/AccountabilityDeclinedNotificationDialog';
import { AccountabilityFormPreviewDialog } from '@/components/AccountabilityFormPreviewDialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { AccountabilityForm } from '@/pages/assets/accountability/accountabilityForm';

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn('animate-shimmer rounded bg-gray-200/80', className)} />
);

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accountabilityDeclinedDetail, setAccountabilityDeclinedDetail] =
    useState<{
      formId: string;
      declineReason: string;
      formNumber?: string;
    } | null>(null);
  const [accountabilityFormPreview, setAccountabilityFormPreview] =
    useState<AccountabilityForm | null>(null);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
    refreshNotifications,
    isConnected,
  } = useNotifications();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setIsLoading(true);
      // Always refetch when opening so new notifications show without reload
      refreshNotifications().finally(() => setIsLoading(false));
    }
  };

  const handleDeclineAccountabilityForm = async (
    formId: string,
    reason: string
  ) => {
    try {
      await api.post(`/accountability-forms/${formId}/decline`, { reason });
      toast.success('Accountability form declined successfully');
      setAccountabilityFormPreview(null);
    } catch (error) {
      console.error('Failed to decline accountability form:', error);
      toast.error('Failed to decline accountability form');
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Handle user lockout notifications - navigate to settings users tab with edit modal
    // Check for userId in notification data to identify lockout notifications (using 'system' type)
    if (notif.userId && notif.title === 'User Account Locked') {
      console.log('[NOTIFICATION CLICK] Opening user edit for lockout:', notif.userId);
      navigate(`/settings?tab=users&action=edit&userId=${notif.userId}`);
      markAsRead(notif.id);
      setIsOpen(false);
      return;
    }

    // Handle accountability form declined notifications - navigate to forms/accountability and open preview dialog
    if (
      notif.actionTarget === 'accountability_form_declined' &&
      notif.formId
    ) {
      console.log('[NOTIFICATION CLICK] Opening declined accountability form preview:', notif.formId);
      try {
        const response = await api.get(`/accountability-forms/${notif.formId}`);
        const form = (response as { form?: AccountabilityForm }).form;
        console.log('[NOTIFICATION CLICK] Form data fetched:', form);
        if (form) {
          // Navigate to forms/accountability page first
          navigate('/forms/accountability');
          // Then open the preview dialog
          setAccountabilityFormPreview(form);
          // Also set the declined detail for context
          setAccountabilityDeclinedDetail({
            formId: notif.formId,
            declineReason: notif.declineReason ?? '',
            formNumber: notif.formNumber,
          });
        } else {
          console.error('[NOTIFICATION CLICK] Form data is missing in response');
          // Fallback to navigation
          navigate(`/forms/accountability#accountability-form-${notif.formId}`);
        }
        markAsRead(notif.id);
        setIsOpen(false);
      } catch (error) {
        console.error('[NOTIFICATION CLICK] Failed to fetch accountability form:', error);
        // Fallback to navigation if fetch fails
        navigate(`/forms/accountability#accountability-form-${notif.formId}`);
        markAsRead(notif.id);
        setIsOpen(false);
      }
      return;
    }

    // Handle accountability form notifications - open preview dialog
    if (notif.type === 'accountability_form' && notif.formId) {
      console.log('[NOTIFICATION CLICK] Opening accountability form preview:', notif.formId);
      try {
        const response = await api.get(`/accountability-forms/${notif.formId}`);
        const form = (response as { form?: AccountabilityForm }).form;
        console.log('[NOTIFICATION CLICK] Form data fetched:', form);
        if (form) {
          // Navigate to profile documents tab first
          navigate('/profile?tab=documents');
          // Then open the preview dialog
          setAccountabilityFormPreview(form);
        } else {
          console.error('[NOTIFICATION CLICK] Form data is missing in response');
          // Fallback to navigation
          navigate(`/profile?tab=documents#accountability-form-${notif.formId}`);
        }
        markAsRead(notif.id);
        setIsOpen(false);
      } catch (error) {
        console.error('[NOTIFICATION CLICK] Failed to fetch accountability form:', error);
        // Fallback to navigation if fetch fails
        navigate(`/profile?tab=documents#accountability-form-${notif.formId}`);
        markAsRead(notif.id);
        setIsOpen(false);
      }
      return;
    }

    const target =
      notif.actionTarget ||
      (notif.type === 'asset_assigned' ? 'my_assets' : null);
    const route = notif.route;
    if (route) {
      navigate(route);
    } else if (target === 'my_assets') {
      navigate('/my-assets');
    } else if (target === 'profile_documents') {
      navigate('/profile?tab=documents');
    } else if (target === 'profile_documents_return_forms') {
      navigate('/profile?tab=documents#asset-return-forms');
    } else if (target === 'asset_return_requests') {
      navigate('/assets/return-requests');
    } else if (target === 'my_return_requests') {
      navigate('/assets/return-request/my-requests');
    } else if (target === 'asset_return_wet_upload') {
      // Typically routed from server notification after DH approval.
      // Prefer explicit route if provided, else open the return forms page.
      navigate(route || '/forms/return');
    } else if (notif.type === 'asset_assigned') {
      navigate('/my-assets');
    }
    markAsRead(notif.id);
    setIsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const formatTime = (timestamp: Date) => {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'asset_assigned':
        return '📦';
      case 'accountability_form':
        return '📄';
      case 'maintenance_due':
        return '🔧';
      case 'warranty_expiring':
        return '⚠️';
      case 'asset_relocated':
        return '📍';
      case 'depreciation_report':
        return '📊';
      case 'new_asset':
        return '✨';
      default:
        return '🔔';
    }
  };

  return (
    <>
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-14 w-14 rounded-full bg-white/10 backdrop-blur shadow-lg hover:shadow-xl transition-all',
            className
          )}
        >
          {isConnected ? (
            <BellRing className="h-8 w-8 text-gray-800" />
          ) : (
            <Bell className="h-8 w-8 text-gray-800" />
          )}
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-6 w-6 p-0 flex items-center justify-center rounded-full bg-[#EE1D25] text-white text-xs font-bold shadow-md animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {!isConnected && (
            <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-gray-400 rounded-full border-2 border-white" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[28rem] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)] p-0 bg-white border-gray-200 shadow-2xl rounded-2xl overflow-hidden box-border"
        align="start"
        side="bottom"
        sideOffset={12}
        collisionPadding={{ top: 16, right: 32, bottom: 16, left: 16 }}
        avoidCollisions={true}
        onOpenAutoFocus={e => e.preventDefault()}
      >
        {isLoading ? (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 pt-2 px-4 bg-gradient-to-r rounded-2xl from-[#EE1D25] to-[#c91b20]">
              <Shimmer className="h-6 w-48 rounded bg-white/30" />
              <Shimmer className="h-8 w-28 rounded-md bg-white/30" />
            </div>
            <Separator />
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4 p-4">
                  <Shimmer className="h-11 w-11 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Shimmer className="h-4 w-32 rounded" />
                    <Shimmer className="h-3 w-full rounded" />
                    <Shimmer className="h-3 w-24 rounded" />
                  </div>
                  {i < 2 && (
                    <Shimmer className="h-2.5 w-2.5 rounded-full mt-2" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Card className="border-0 shadow-none bg-white rounded-2xl min-w-0 w-full overflow-hidden max-w-full">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3 pt-2 px-4 bg-gradient-to-r from-[#EE1D25] to-[#c91b20] text-white min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-lg font-bold truncate">Notifications</h3>
                {!isConnected && (
                  <div className="h-2 w-2 bg-yellow-400 rounded-full animate-pulse" />
                )}
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-white hover:bg-white/20 transition-colors"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </CardHeader>
            <Separator />
            <ScrollArea className="min-w-0 w-full overflow-x-hidden max-h-[calc(100vh-16rem)]">
              <div className="p-4 pr-5 space-y-3 min-w-0 w-full max-w-full overflow-hidden box-border [&>*]:min-w-0">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No notifications yet</p>
                    <p className="text-xs mt-1">
                      We'll notify you when something happens
                    </p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <motion.div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={cn(
                        'flex gap-3 p-4 rounded-xl transition-all hover:bg-gray-50 cursor-pointer border-l-4 min-w-0 w-full max-w-full overflow-hidden group',
                        notif.read
                          ? 'border-transparent bg-white'
                          : 'border-[#EE1D25] bg-red-50 hover:bg-red-100'
                      )}
                      whileHover={{ y: -2, scale: 1.01 }}
                      transition={{
                        type: 'spring',
                        stiffness: 320,
                        damping: 24,
                        mass: 0.7,
                      }}
                    >
                      <Avatar className="h-11 w-11 ring-2 ring-white shadow-md flex-shrink-0">
                        <AvatarFallback
                          className={cn(
                            'text-sm font-bold',
                            notif.read
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-[#EE1D25] text-white'
                          )}
                        >
                          {getNotificationIcon(notif.type)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 overflow-hidden max-w-full">
                        <div className="flex items-start justify-between gap-2 min-w-0 overflow-hidden">
                          <p className="text-sm font-semibold text-gray-900 min-w-0 max-w-full break-words line-clamp-2">
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <div className="w-2.5 h-2.5 bg-[#EE1D25] rounded-full mt-1 animate-pulse flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2 break-words overflow-hidden max-w-full">
                          {notif.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-2 truncate max-w-full">
                          {formatTime(notif.timestamp)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end justify-between ml-1 flex-shrink-0">
                        {notif.read ? (
                          <Check className="h-4 w-4 text-gray-400 mt-1" />
                        ) : (
                          <div className="h-4 w-4 mt-1" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => {
                            e.stopPropagation();
                            removeNotification(notif.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
            {notifications.length > 0 && (
              <>
                <Separator />
                <div className="p-2 bg-gray-50 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearNotifications()}
                    className="w-full text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors text-sm"
                  >
                    Clear all notifications
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}
      </PopoverContent>
    </Popover>
    <AccountabilityDeclinedNotificationDialog
      detail={accountabilityDeclinedDetail}
      onClose={() => setAccountabilityDeclinedDetail(null)}
    />
    <AccountabilityFormPreviewDialog
      form={accountabilityFormPreview}
      onClose={() => setAccountabilityFormPreview(null)}
      onSign={async (formId: string, acknowledgments?: Record<string, unknown>) => {
        // Navigate to documents tab to use the sign flow there
        navigate('/profile?tab=documents');
        setAccountabilityFormPreview(null);
      }}
      onDecline={handleDeclineAccountabilityForm}
    />
    </>
  );
}
