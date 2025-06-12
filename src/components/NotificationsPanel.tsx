// src/components/NotificationsPanel.tsx
"use client";
import React, { useState, useEffect, SetStateAction, Dispatch, useCallback, useRef } from 'react';
import { Bell, X, Check, DollarSign, CheckSquare, Users, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import * as api from '@/lib/api';
import type { Notification } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/Button';
import { subscriptionManager } from '@/lib/subscriptionManager';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationCountChange: Dispatch<SetStateAction<number>>;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose,
  onNotificationCountChange
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [notificationsData, count] = await Promise.all([
        api.getNotifications(50),
        api.getUnreadNotificationCount()
      ]);
      setNotifications(notificationsData);
      onNotificationCountChange(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, onNotificationCountChange]);

  useEffect(() => {
    if (user && isOpen) {
      loadNotifications();
    }
  }, [user, isOpen, loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      // Optimistic update
      const originalNotifications = notifications;
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      onNotificationCountChange((prev) => Math.max(0, prev - 1));
      
      await api.markNotificationsRead([notificationId]);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert on error
      loadNotifications(); 
    }
  };

  const markAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      onNotificationCountChange(0);

      await api.markAllNotificationsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Revert on error
      loadNotifications();
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'expense_added': return <DollarSign className="h-4 w-4" />;
      case 'payment_reminder': return <AlertCircle className="h-4 w-4" />;
      case 'task_assigned':
      case 'task_completed': return <CheckSquare className="h-4 w-4" />;
      case 'settlement_recorded': return <CreditCard className="h-4 w-4" />;
      case 'recurring_expense_added': return <Calendar className="h-4 w-4" />;
      case 'member_joined':
      case 'member_left': return <Users className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'expense_added': return 'text-primary bg-primary/10';
      case 'payment_reminder': return 'text-destructive bg-destructive/10';
      case 'settlement_recorded': return 'text-primary bg-primary/10';
      case 'recurring_expense_added': return 'text-accent bg-accent/10';
      case 'member_joined': return 'text-primary bg-primary/10';
      case 'task_assigned':
      case 'task_completed':
      case 'member_left':
      default: return 'text-secondary-foreground bg-secondary';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-25 z-40" onClick={onClose} />
      
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-background shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline" size="sm" className="text-primary">
                Mark all read
              </Button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-secondary-foreground">
              <Bell className="h-12 w-12 mb-2" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-secondary transition-colors ${
                    !notification.is_read ? 'bg-secondary' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{notification.title}</p>
                      <p className="text-sm text-secondary-foreground mt-1">{notification.message}</p>
                      <p className="text-xs text-secondary-foreground opacity-70 mt-1">{formatTime(notification.created_at)}</p>
                    </div>
                    {!notification.is_read && (
                      <button onClick={() => markAsRead(notification.id)} className="p-1 hover:bg-secondary rounded" aria-label="Mark as read" >
                        <Check className="h-4 w-4 text-secondary-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' && (
          <div className="p-4 border-t border-border bg-background">
            <Button onClick={() => Notification.requestPermission()} className="w-full">
              Enable Desktop Notifications
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const hasSubscribedRef = useRef(false);

  const handleNewNotification = useCallback((notification: Notification) => {
    setUnreadCount(prev => prev + 1);
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon.png'
      });
    }
  }, []);

  useEffect(() => {
    if (user?.id && !hasSubscribedRef.current) {
      hasSubscribedRef.current = true;
      console.log("Setting up notification subscription at NotificationBell level for user:", user.id);
      
      api.getUnreadNotificationCount().then(setUnreadCount).catch(console.error);
      
      const subscription = api.subscribeToNotifications(user.id, handleNewNotification);

      return () => {
        console.log('Cleaning up notification subscription at NotificationBell level');
        subscription?.unsubscribe();
        hasSubscribedRef.current = false;
        // Also use subscriptionManager for safety, though direct unsubscribe is better here.
        subscriptionManager.unsubscribe(`notifications:${user.id}`);
      };
    }
  }, [user?.id, handleNewNotification]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-foreground hover:bg-secondary rounded-md"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-destructive-foreground transform translate-x-1/2 -translate-y-1/2 bg-destructive rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationsPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onNotificationCountChange={setUnreadCount}
      />
    </>
  );
};
