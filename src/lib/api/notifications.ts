// src/lib/api/notifications.ts
import { supabase } from '../supabase';
import { subscriptionManager } from '../subscriptionManager';
import type { Notification } from '../types/types';
import { getProfile } from './profile';

export const getNotifications = async (limit = 50, onlyUnread = false) => {
  const { data: { user } } = await supabase.auth.getUser(); 
  if (!user) throw new Error('Not authenticated');
  
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (onlyUnread) { 
    query = query.eq('is_read', false); 
  }
  
  const { data, error } = await query; 
  if (error) throw error; 
  return data || [];
};

export const getUnreadNotificationCount = async () => {
  const { data: { user } } = await supabase.auth.getUser(); 
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase.rpc('get_unread_notification_count', { 
    p_user_id: user.id 
  });
  
  if (error) throw error; 
  return data || 0;
};

export const markNotificationsRead = async (notificationIds: string[]) => {
  const { error } = await supabase.rpc('mark_notifications_read', { 
    p_notification_ids: notificationIds 
  });
  
  if (error) throw error;
};

export const markAllNotificationsRead = async () => {
  const { data: { user } } = await supabase.auth.getUser(); 
  if (!user) throw new Error('Not authenticated');
  
  const { error } = await supabase
    .from('notifications')
    .update({ 
      is_read: true, 
      read_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    })
    .eq('user_id', user.id)
    .eq('is_read', false);
    
  if (error) throw error;
};

export const createNotification = async (
  userId: string, 
  type: Notification['type'], 
  title: string, 
  message: string, 
  householdId?: string, 
  data?: Record<string, unknown>
) => {
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({ 
      user_id: userId, 
      household_id: householdId, 
      type, 
      title, 
      message, 
      data: data || {} 
    })
    .select()
    .single();
    
  if (error) throw error; 
  return notification;
};

export const subscribeToNotifications = (userId: string, onNotification: (notification: Notification) => void) => {
  const key = `notifications:${userId}`;
  
  // Check if already subscribed
  if (subscriptionManager.hasSubscription(key)) {
    console.log(`Already subscribed to ${key}, skipping...`);
    return;
  }
  
  const channel = supabase
    .channel(key)
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'notifications', 
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      if (payload.new) {
        onNotification(payload.new as Notification);
      }
    })
    .subscribe((status, err) => {
      if (err) {
        console.error(`Subscription error for ${key}:`, err);
      } else {
        console.log(`Subscription status for ${key}:`, status);
      }
    });

  return subscriptionManager.subscribe(key, channel);
};

export const sendPaymentReminder = async (householdId: string, debtorId: string, amount: number) => {
  const { data: { user } } = await supabase.auth.getUser(); 
  if (!user) throw new Error('Not authenticated');
  
  const creditorProfile = await getProfile(user.id); 
  if (!creditorProfile) throw new Error('Creditor profile not found');
  
  return createNotification(
    debtorId, 
    'payment_reminder', 
    'Payment Reminder', 
    `${creditorProfile.name} has sent you a reminder: You owe $${amount.toFixed(2)}`, 
    householdId, 
    { amount, creditor_id: user.id, manual_reminder: true }
  );
};