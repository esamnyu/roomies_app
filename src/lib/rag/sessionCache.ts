// Simple session-based cache for RAG context
// Caches for 5 minutes to balance freshness vs performance

interface CacheEntry {
  data: any;
  timestamp: number;
  key: string;
}

class SessionCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  generateKey(householdId: string, userId: string, intent: string): string {
    return `${householdId}-${userId}-${intent}`;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key
    });

    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  invalidate(householdId: string): void {
    // Clear all entries for a household when data changes
    for (const [key, _] of this.cache) {
      if (key.startsWith(householdId)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const ragCache = new SessionCache();