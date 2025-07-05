// src/lib/debug/realtime.ts
import { supabase } from '../supabase';
import { subscriptionManager } from '../subscriptionManager';

export const debugRealtime = {
  // Check realtime connection status
  checkConnection: async () => {
    try {
      const channels = supabase.getChannels();
      console.log('Active channels:', channels.length);
      channels.forEach(channel => {
        console.log(`Channel: ${channel.topic}, State: ${channel.state}`);
      });
      
      // Check auth status
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Auth session exists:', !!session);
      if (session) {
        console.log('Session expires at:', new Date(session.expires_at! * 1000).toISOString());
      }
      
      // Check active subscriptions in manager
      const activeSubscriptions = subscriptionManager.getActiveSubscriptions();
      console.log('Active subscriptions:', activeSubscriptions);
      
      return {
        channels: channels.length,
        authenticated: !!session,
        subscriptions: activeSubscriptions
      };
    } catch (error) {
      console.error('Error checking realtime connection:', error);
      return null;
    }
  },
  
  // Test message subscription
  testMessageSubscription: (householdId: string) => {
    console.log(`Testing subscription for household: ${householdId}`);
    
    const testChannel = supabase
      .channel(`test-messages-${householdId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `household_id=eq.${householdId}`
      }, (payload) => {
        console.log('Test subscription received:', payload);
      })
      .subscribe((status, err) => {
        if (err) {
          console.error('Test subscription error:', err);
        } else {
          console.log('Test subscription status:', status);
        }
      });
    
    // Clean up after 30 seconds
    setTimeout(() => {
      console.log('Cleaning up test subscription');
      testChannel.unsubscribe();
    }, 30000);
    
    return testChannel;
  },
  
  // Force reconnect all channels
  reconnectAll: async () => {
    console.log('Forcing reconnection of all channels...');
    const channels = supabase.getChannels();
    
    for (const channel of channels) {
      console.log(`Reconnecting channel: ${channel.topic}`);
      await channel.unsubscribe();
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      await channel.subscribe();
    }
    
    console.log('All channels reconnected');
  }
};

// Export to window for debugging in browser console
declare global {
  interface Window {
    debugRealtime: typeof debugRealtime;
  }
}

if (typeof window !== 'undefined') {
  window.debugRealtime = debugRealtime;
}