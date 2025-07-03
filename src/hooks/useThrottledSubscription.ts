// Hook for using throttled subscriptions with the enhanced subscription manager
import { useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { enhancedSubscriptionManager } from '@/lib/enhancedSubscriptionManager';

interface UseThrottledSubscriptionOptions {
  throttleMs?: number;
  dedupWindow?: number;
  maxRetries?: number;
  enabled?: boolean;
}

export function useThrottledSubscription(
  key: string,
  createChannel: () => RealtimeChannel | null,
  onUpdate: (payload: any) => void,
  dependencies: any[] = [],
  options: UseThrottledSubscriptionOptions = {}
) {
  const { enabled = true, ...config } = options;
  const onUpdateRef = useRef(onUpdate);
  
  // Keep callback reference fresh without causing re-subscriptions
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  const throttledCallback = useCallback((payload: any) => {
    enhancedSubscriptionManager.throttleUpdate(key, () => {
      onUpdateRef.current(payload);
    });
  }, [key]);

  useEffect(() => {
    if (!enabled) return;

    const channel = createChannel();
    if (!channel) return;

    // Subscribe with deduplication and config
    const subscribedChannel = enhancedSubscriptionManager.subscribe(key, channel, config);
    
    if (!subscribedChannel) {
      console.log(`Subscription ${key} was deduplicated`);
      return;
    }

    // Set up the actual subscription with throttled callback
    const subscription = subscribedChannel
      .on('*', throttledCallback)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime subscription ${key} connected`);
          enhancedSubscriptionManager.resetRetryCount(key);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Realtime subscription ${key} error`);
          if (!enhancedSubscriptionManager.shouldRetry(key)) {
            enhancedSubscriptionManager.unsubscribe(key);
          }
        }
      });

    return () => {
      enhancedSubscriptionManager.unsubscribe(key);
    };
  }, [key, enabled, ...dependencies]);

  return {
    stats: () => enhancedSubscriptionManager.getSubscriptionStats(key),
    isActive: () => enhancedSubscriptionManager.hasSubscription(key)
  };
}