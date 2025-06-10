// src/lib/subscriptionManager.ts

class SubscriptionManager {
  private subscriptions = new Map<string, any>();

  subscribe(key: string, channel: any) {
    if (this.subscriptions.has(key)) {
      this.unsubscribe(key);
    }
    this.subscriptions.set(key, channel);
    return channel;
  }

  unsubscribe(key: string) {
    const sub = this.subscriptions.get(key);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(key);
    }
  }

  unsubscribeAll() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();
  }
}

export const subscriptionManager = new SubscriptionManager();