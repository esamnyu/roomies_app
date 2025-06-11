// src/lib/subscriptionManager.ts
import { RealtimeChannel } from '@supabase/supabase-js';

class SubscriptionManager {
  private subscriptions = new Map<string, RealtimeChannel>();
  private pendingUnsubscribes = new Set<string>();

  subscribe(key: string, channel: RealtimeChannel) {
    // Prevent rapid unsubscribe/resubscribe cycles by checking pending unsubscribes
    if (this.pendingUnsubscribes.has(key)) {
      this.pendingUnsubscribes.delete(key); // Cancel the pending unsubscribe
      return this.subscriptions.get(key); // Return the existing subscription
    }

    if (this.subscriptions.has(key)) {
      console.warn(`Subscription with key "${key}" already exists. Returning the existing one.`);
      return this.subscriptions.get(key);
    }

    this.subscriptions.set(key, channel);
    console.log(`Subscription created: ${key}`);
    return channel;
  }

  unsubscribe(key: string) {
    const sub = this.subscriptions.get(key);
    if (sub) {
      // Delay the actual unsubscribe to handle fast re-renders gracefully
      this.pendingUnsubscribes.add(key);
      setTimeout(() => {
        if (this.pendingUnsubscribes.has(key)) {
          sub.unsubscribe();
          this.subscriptions.delete(key);
          this.pendingUnsubscribes.delete(key);
          console.log(`Subscription removed: ${key}`);
        }
      }, 150); // A short delay
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

  /**
   * For development/debugging purposes.
   * @returns An array of active subscription keys.
   */
  getActiveSubscriptions() {
    return Array.from(this.subscriptions.keys());
  }
}

export const subscriptionManager = new SubscriptionManager();
