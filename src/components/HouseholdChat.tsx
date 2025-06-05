// Create: src/components/NotificationsPanel.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { Bell, X, Check, DollarSign, CheckSquare, Users, CreditCard, Calendar, AlertCircle, MessageSquare } from 'lucide-react';
import * as api from '@/lib/api';
import type { Notification } from '@/lib/api';
import { useAuth } from './AuthProvider';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationCountChange: (count: number) => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose,
  onNotificationCountChange
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user && isOpen) {
      loadNotifications();
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time notifications
    const subscription = api.subscribeToNotifications(user.id, (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      onNotificationCountChange(unreadCount + 1);
      
      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon.png' // Add your app icon
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user, unreadCount, onNotificationCountChange]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [notificationsData, count] = await Promise.all([
        api.getNotifications(50),
        api.getUnreadNotificationCount()
      ]);
      setNotifications(notificationsData);
      setUnreadCount(count);
      onNotificationCountChange(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.markNotificationsRead([notificationId]);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      onNotificationCountChange(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
      onNotificationCountChange(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'expense_added':
        return <DollarSign className="h-4 w-4" />;
      case 'payment_reminder':
        return <AlertCircle className="h-4 w-4" />;
      case 'task_assigned':
      case 'task_completed':
        return <CheckSquare className="h-4 w-4" />;
      case 'settlement_recorded':
        return <CreditCard className="h-4 w-4" />;
      case 'recurring_expense_added':
        return <Calendar className="h-4 w-4" />;
      case 'member_joined':
      case 'member_left':
        return <Users className="h-4 w-4" />;
      case 'message_sent':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'expense_added':
        return 'text-blue-600 bg-blue-100';
      case 'payment_reminder':
        return 'text-red-600 bg-red-100';
      case 'task_assigned':
        return 'text-purple-600 bg-purple-100';
      case 'task_completed':
        return 'text-green-600 bg-green-100';
      case 'settlement_recorded':
        return 'text-green-600 bg-green-100';
      case 'recurring_expense_added':
        return 'text-orange-600 bg-orange-100';
      case 'member_joined':
        return 'text-indigo-600 bg-indigo-100';
      case 'member_left':
        return 'text-gray-600 bg-gray-100';
      case 'message_sent':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <Bell className="h-12 w-12 mb-2" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2 rounded-full ${getNotificationColor(
                        notification.type
                      )}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-1 hover:bg-gray-200 rounded"
                        aria-label="Mark as read"
                      >
                        <Check className="h-4 w-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request Permission Button */}
        {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' && (
          <div className="p-4 border-t bg-gray-50">
            <button
              onClick={() => Notification.requestPermission()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Enable Desktop Notifications
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// Notification Bell Icon Component
export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      // Load initial unread count
      api.getUnreadNotificationCount().then(setUnreadCount).catch(console.error);
    }
  }, [user]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
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