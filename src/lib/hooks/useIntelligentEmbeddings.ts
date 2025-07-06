import { useEffect, useState } from 'react';
import { intelligentEmbeddingService } from '../services/intelligentEmbeddingService';

export function useEmbeddingStats(householdId?: string) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await intelligentEmbeddingService.getEmbeddingStats(householdId);
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch embedding stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [householdId]);
  
  return { stats, loading };
}

// Hook to ensure critical content gets embedded
export function useEnsureEmbedding() {
  const ensureEmbedding = async (
    content: string,
    type: 'expense' | 'conversation' | 'rule',
    metadata: any
  ) => {
    try {
      // For expenses, store in queue with high priority
      if (type === 'expense' && metadata.expenseId) {
        const response = await fetch('/api/queue-embedding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${metadata.token}`
          },
          body: JSON.stringify({
            type: 'expense',
            id: metadata.expenseId,
            content,
            priority: metadata.amount > 100 ? 'high' : 'normal'
          })
        });
        
        if (response.ok) {
          // Try to process immediately if high value
          if (metadata.amount > 100) {
            fetch('/api/process-high-priority', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${metadata.token}`
              }
            }).catch(() => {}); // Fire and forget
          }
        }
      }
    } catch (error) {
      console.error('Failed to ensure embedding:', error);
    }
  };
  
  return { ensureEmbedding };
}

// Monitor embedding health
export function useEmbeddingHealth() {
  const [health, setHealth] = useState<'healthy' | 'degraded' | 'unknown'>('unknown');
  
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/embedding-health');
        if (response.ok) {
          const data = await response.json();
          setHealth(data.health.status);
        }
      } catch (error) {
        setHealth('unknown');
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);
  
  return health;
}