// src/lib/subscriptionManager.ts
import { RealtimeChannel } from '@supabase/supabase-js';

interface Subscription {
  id: string;
  channel: RealtimeChannel;
  topic: string;
  createdAt: Date;
}

class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();

  add(id: string, channel: RealtimeChannel, topic: string): void {
    this.subscriptions.set(id, {
      id,
      channel,
      topic,
      createdAt: new Date()
    });
  }

  remove(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      subscription.channel.unsubscribe();
      this.subscriptions.delete(id);
    }
  }

  get(id: string): Subscription | undefined {
    return this.subscriptions.get(id);
  }

  getAll(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  clear(): void {
    this.subscriptions.forEach(sub => sub.channel.unsubscribe());
    this.subscriptions.clear();
  }
}

export const subscriptionManager = new SubscriptionManager();