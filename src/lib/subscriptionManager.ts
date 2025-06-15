// src/lib/subscriptionManager.ts
import { RealtimeChannel } from '@supabase/supabase-js';

class SubscriptionManager {
  private subscriptions = new Map<string, RealtimeChannel>();
  private pendingUnsubscribes = new Set<string>();

  subscribe(key: string, channel: RealtimeChannel): RealtimeChannel | undefined {
    // Clean up any existing subscription first
    const existing = this.subscriptions.get(key);
    if (existing) {
      console.log(`Cleaning up existing subscription for: ${key}`);
      existing.unsubscribe();
      this.subscriptions.delete(key);
    }

    // Cancel any pending unsubscribe
    if (this.pendingUnsubscribes.has(key)) {
      this.pendingUnsubscribes.delete(key);
    }

    this.subscriptions.set(key, channel);
    console.log(`Subscription created: ${key}`);
    return channel;
  }

  unsubscribe(key: string) {
    const sub = this.subscriptions.get(key);
    if (sub) {
      // Immediate unsubscribe without delay
      sub.unsubscribe();
      this.subscriptions.delete(key);
      console.log(`Subscription removed: ${key}`);
    }
  }

  unsubscribeAll() {
    this.subscriptions.forEach((sub, key) => {
      sub.unsubscribe();
      console.log(`Subscription removed: ${key}`);
    });
    this.subscriptions.clear();
    this.pendingUnsubscribes.clear();
  }

  getActiveSubscriptions() {
    return Array.from(this.subscriptions.keys());
  }

  hasSubscription(key: string): boolean {
    return this.subscriptions.has(key);
  }
}

export const subscriptionManager = new SubscriptionManager();