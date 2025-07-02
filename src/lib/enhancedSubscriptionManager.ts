// Enhanced subscription manager with deduplication, throttling, and stability features
import { RealtimeChannel } from '@supabase/supabase-js';

interface SubscriptionConfig {
  throttleMs?: number;
  dedupWindow?: number;
  maxRetries?: number;
}

interface SubscriptionInfo {
  channel: RealtimeChannel;
  lastUpdate: number;
  updateCount: number;
  config: SubscriptionConfig;
}

class EnhancedSubscriptionManager {
  private subscriptions = new Map<string, SubscriptionInfo>();
  private updateQueue = new Map<string, NodeJS.Timeout>();
  private retryCount = new Map<string, number>();
  
  // Prevent duplicate subscriptions within a time window
  private recentSubscriptions = new Map<string, number>();
  private readonly DEDUP_WINDOW = 1000; // 1 second

  subscribe(
    key: string, 
    channel: RealtimeChannel, 
    config: SubscriptionConfig = {}
  ): RealtimeChannel | undefined {
    // Check for recent duplicate subscription attempts
    const lastAttempt = this.recentSubscriptions.get(key);
    const now = Date.now();
    
    if (lastAttempt && now - lastAttempt < (config.dedupWindow || this.DEDUP_WINDOW)) {
      console.log(`Skipping duplicate subscription attempt for: ${key}`);
      return this.subscriptions.get(key)?.channel;
    }
    
    this.recentSubscriptions.set(key, now);
    
    // Clean up existing subscription
    const existing = this.subscriptions.get(key);
    if (existing) {
      this.cleanupSubscription(key, existing);
    }

    // Clear any pending updates
    const pendingUpdate = this.updateQueue.get(key);
    if (pendingUpdate) {
      clearTimeout(pendingUpdate);
      this.updateQueue.delete(key);
    }

    // Store subscription with metadata
    this.subscriptions.set(key, {
      channel,
      lastUpdate: now,
      updateCount: 0,
      config: {
        throttleMs: config.throttleMs || 500,
        dedupWindow: config.dedupWindow || this.DEDUP_WINDOW,
        maxRetries: config.maxRetries || 3,
        ...config
      }
    });

    console.log(`Subscription created: ${key} with throttle: ${config.throttleMs || 500}ms`);
    return channel;
  }

  // Throttle updates from subscriptions
  throttleUpdate(key: string, callback: () => void): void {
    const sub = this.subscriptions.get(key);
    if (!sub) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - sub.lastUpdate;
    
    // Clear existing timeout
    const existing = this.updateQueue.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    // If enough time has passed, execute immediately
    if (timeSinceLastUpdate >= sub.config.throttleMs!) {
      sub.lastUpdate = now;
      sub.updateCount++;
      callback();
    } else {
      // Otherwise, queue the update
      const delay = sub.config.throttleMs! - timeSinceLastUpdate;
      const timeout = setTimeout(() => {
        const subInfo = this.subscriptions.get(key);
        if (subInfo) {
          subInfo.lastUpdate = Date.now();
          subInfo.updateCount++;
        }
        this.updateQueue.delete(key);
        callback();
      }, delay);
      
      this.updateQueue.set(key, timeout);
    }
  }

  // Circuit breaker for retries
  shouldRetry(key: string): boolean {
    const retries = this.retryCount.get(key) || 0;
    const sub = this.subscriptions.get(key);
    const maxRetries = sub?.config.maxRetries || 3;
    
    if (retries >= maxRetries) {
      console.error(`Max retries (${maxRetries}) reached for: ${key}`);
      return false;
    }
    
    this.retryCount.set(key, retries + 1);
    return true;
  }

  resetRetryCount(key: string): void {
    this.retryCount.delete(key);
  }

  private cleanupSubscription(key: string, info: SubscriptionInfo): void {
    try {
      info.channel.unsubscribe();
    } catch (error) {
      console.error(`Error unsubscribing from ${key}:`, error);
    }
    
    const pendingUpdate = this.updateQueue.get(key);
    if (pendingUpdate) {
      clearTimeout(pendingUpdate);
      this.updateQueue.delete(key);
    }
  }

  unsubscribe(key: string): void {
    const sub = this.subscriptions.get(key);
    if (sub) {
      this.cleanupSubscription(key, sub);
      this.subscriptions.delete(key);
      this.retryCount.delete(key);
      console.log(`Subscription removed: ${key}`);
    }
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach((sub, key) => {
      this.cleanupSubscription(key, sub);
    });
    this.subscriptions.clear();
    this.updateQueue.clear();
    this.retryCount.clear();
    this.recentSubscriptions.clear();
  }

  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  hasSubscription(key: string): boolean {
    return this.subscriptions.has(key);
  }

  getSubscriptionStats(key: string) {
    const sub = this.subscriptions.get(key);
    if (!sub) return null;
    
    return {
      updateCount: sub.updateCount,
      lastUpdate: new Date(sub.lastUpdate),
      retryCount: this.retryCount.get(key) || 0,
      hasPendingUpdate: this.updateQueue.has(key)
    };
  }
}

export const enhancedSubscriptionManager = new EnhancedSubscriptionManager();