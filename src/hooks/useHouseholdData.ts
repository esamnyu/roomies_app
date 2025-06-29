// src/hooks/useHouseholdData.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { getHouseholdFullData } from '@/lib/api/households';
import type { HouseholdFullData } from '@/lib/types/types';
import { subscriptionManager } from '@/lib/subscriptionManager';
import { supabase } from '@/lib/supabase';

// Cache configuration
const CACHE_DURATION = 30000; // 30 seconds
const STALE_WHILE_REVALIDATE_DURATION = 60000; // 60 seconds

// Global cache store
const cache = new Map<string, {
  data: HouseholdFullData;
  timestamp: number;
  etag?: string;
}>();

// Global in-flight requests to prevent duplicate fetches
const inFlightRequests = new Map<string, Promise<HouseholdFullData>>();

interface UseHouseholdDataReturn {
  data: HouseholdFullData | null;
  loading: boolean;
  error: Error | null;
  isStale: boolean;
  refetch: (forceRefresh?: boolean) => Promise<HouseholdFullData | null>;
  invalidateCache: () => void;
  updateOptimistically: (updater: (data: HouseholdFullData) => HouseholdFullData) => void;
}

export function useHouseholdData(householdId: string): UseHouseholdDataReturn {
  const [data, setData] = useState<HouseholdFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  
  // Track if component is mounted to prevent memory leaks
  const isMountedRef = useRef(true);
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();

  // Check if cache is fresh
  const isCacheFresh = useCallback((timestamp: number): boolean => {
    return Date.now() - timestamp < CACHE_DURATION;
  }, []);

  // Check if cache is usable (stale but still valid)
  const isCacheUsable = useCallback((timestamp: number): boolean => {
    return Date.now() - timestamp < STALE_WHILE_REVALIDATE_DURATION;
  }, []);

  // Fetch data with deduplication
  const fetchData = useCallback(async (forceRefresh = false): Promise<HouseholdFullData | null> => {
    try {
      // Check if we have a fresh cache and not forcing refresh
      if (!forceRefresh) {
        const cached = cache.get(householdId);
        if (cached) {
          const fresh = isCacheFresh(cached.timestamp);
          const usable = isCacheUsable(cached.timestamp);
          
          if (fresh) {
            // Cache is fresh, return immediately
            if (isMountedRef.current) {
              setData(cached.data);
              setLoading(false);
              setIsStale(false);
            }
            return cached.data;
          } else if (usable) {
            // Cache is stale but usable - return it and fetch in background
            if (isMountedRef.current) {
              setData(cached.data);
              setLoading(false);
              setIsStale(true);
            }
            
            // Don't return here - continue to fetch fresh data
          }
        }
      }

      // Check if there's already a request in flight
      const existingRequest = inFlightRequests.get(householdId);
      if (existingRequest && !forceRefresh) {
        const result = await existingRequest;
        if (isMountedRef.current) {
          setData(result);
          setLoading(false);
          setError(null);
          setIsStale(false);
        }
        return result;
      }

      // Create new request
      if (isMountedRef.current) {
        setLoading(true);
        setError(null);
      }

      const request = getHouseholdFullData(householdId);
      inFlightRequests.set(householdId, request);

      const fullData = await request;
      
      // Update cache
      cache.set(householdId, {
        data: fullData,
        timestamp: Date.now(),
        etag: `${householdId}-${Date.now()}` // Simple etag for tracking
      });
      
      if (isMountedRef.current) {
        setData(fullData);
        setError(null);
        setIsStale(false);
      }
      
      return fullData;
    } catch (err) {
      const error = err as Error;
      if (isMountedRef.current) {
        setError(error);
        
        // If we have stale data, keep showing it
        const cached = cache.get(householdId);
        if (cached && isCacheUsable(cached.timestamp)) {
          setData(cached.data);
          setIsStale(true);
        }
      }
      throw error;
    } finally {
      inFlightRequests.delete(householdId);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [householdId, isCacheFresh, isCacheUsable]);

  // Invalidate cache for this household
  const invalidateCache = useCallback(() => {
    cache.delete(householdId);
    setIsStale(true);
    
    // Clear any pending refetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Debounce refetch by 100ms to batch multiple invalidations
    fetchTimeoutRef.current = setTimeout(() => {
      fetchData(true);
    }, 100);
  }, [householdId, fetchData]);

  // Optimistic update function
  const updateOptimistically = useCallback((updater: (data: HouseholdFullData) => HouseholdFullData) => {
    const currentData = data || cache.get(householdId)?.data;
    if (!currentData) return;
    
    const newData = updater(currentData);
    
    // Update local state immediately
    setData(newData);
    
    // Update cache
    cache.set(householdId, {
      data: newData,
      timestamp: Date.now(),
      etag: `${householdId}-${Date.now()}-optimistic`
    });
  }, [data, householdId]);

  // Set up real-time subscriptions for cache invalidation
  useEffect(() => {
    if (!householdId) return;

    // Subscribe to changes that should invalidate cache
    const subscriptions = [
      // Expenses
      supabase
        .channel(`household-expenses-${householdId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `household_id=eq.${householdId}`
        }, () => {
          console.log('Expense changed, invalidating cache');
          invalidateCache();
        }),
      
      // Settlements
      supabase
        .channel(`household-settlements-${householdId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'settlements',
          filter: `household_id=eq.${householdId}`
        }, () => {
          console.log('Settlement changed, invalidating cache');
          invalidateCache();
        }),
      
      // Members
      supabase
        .channel(`household-members-${householdId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'household_members',
          filter: `household_id=eq.${householdId}`
        }, () => {
          console.log('Members changed, invalidating cache');
          invalidateCache();
        })
    ];

    // Subscribe all channels
    subscriptions.forEach(channel => channel.subscribe());

    // Cleanup
    return () => {
      subscriptions.forEach(channel => {
        channel.unsubscribe();
      });
    };
  }, [householdId, invalidateCache]);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchData]);

  // Periodic background refresh for active tabs
  useEffect(() => {
    if (!data || error) return;

    const refreshInterval = setInterval(() => {
      // Only refresh if the tab is visible
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    }, CACHE_DURATION);

    return () => clearInterval(refreshInterval);
  }, [data, error, fetchData]);

  // Handle visibility change - refresh when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isStale) {
        fetchData(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isStale, fetchData]);

  return {
    data,
    loading,
    error,
    isStale,
    refetch: fetchData,
    invalidateCache,
    updateOptimistically
  };
}

// Utility hook for prefetching household data
export function usePrefetchHouseholdData() {
  return useCallback((householdId: string) => {
    // Check if already cached
    const cached = cache.get(householdId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return; // Already fresh in cache
    }

    // Prefetch in background
    getHouseholdFullData(householdId)
      .then(data => {
        cache.set(householdId, {
          data,
          timestamp: Date.now()
        });
      })
      .catch(err => {
        console.error('Prefetch failed:', err);
      });
  }, []);
}

// Utility to clear all cached data (useful for logout)
export function clearAllHouseholdCache() {
  cache.clear();
  inFlightRequests.clear();
}

// Export cache stats for debugging
export function getHouseholdCacheStats() {
  return {
    size: cache.size,
    entries: Array.from(cache.entries()).map(([key, value]) => ({
      householdId: key,
      age: Date.now() - value.timestamp,
      isStale: Date.now() - value.timestamp > CACHE_DURATION
    }))
  };
}