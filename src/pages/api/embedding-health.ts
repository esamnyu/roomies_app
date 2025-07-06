import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { embeddingMonitor } from '@/lib/services/embeddingMonitor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authorization
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const { timeRange = 'day' } = req.query;
    
    // Get health status
    const health = await embeddingMonitor.getQueueHealth();
    
    // Get detailed metrics
    const metrics = await embeddingMonitor.getDetailedMetrics(
      timeRange as 'hour' | 'day' | 'week'
    );
    
    // Get current queue size
    const { data: queueStats } = await supabase.rpc('get_embedding_queue_stats');
    
    res.status(200).json({
      health,
      metrics,
      queue: queueStats?.[0] || {
        total_queued: 0,
        unprocessed: 0,
        processed: 0,
        failed: 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching embedding health:', error);
    res.status(500).json({ error: 'Failed to fetch health status' });
  }
}