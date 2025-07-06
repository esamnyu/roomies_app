import { NextApiRequest, NextApiResponse } from 'next';
import { intelligentEmbeddingService } from '@/lib/services/intelligentEmbeddingService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // This runs periodically (every 5 minutes) via cron
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  // Allow service role or cron job
  const isAuthorized = token === process.env.SUPABASE_SERVICE_ROLE_KEY ||
                      req.headers['x-vercel-cron-signature'] || // Vercel cron
                      req.headers['x-github-event']; // GitHub Actions
  
  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Process high-priority items first
    const { processed: highPriority } = await intelligentEmbeddingService
      .processHighPriorityQueue(5);
    
    // 2. Get current stats
    const stats = await intelligentEmbeddingService.getEmbeddingStats();
    
    // 3. Decide how many to process based on queue size
    let batchSize = 10;
    if (stats.queue.unprocessed > 100) batchSize = 20;
    if (stats.queue.unprocessed > 500) batchSize = 50;
    
    // 4. Process normal priority items
    const { data: normalItems } = await supabase
      .from('embedding_queue')
      .select('*')
      .eq('processed', false)
      .is('error', null)
      .or('metadata->priority.eq.normal,metadata->priority.is.null')
      .limit(batchSize);
    
    let normalProcessed = 0;
    if (normalItems && normalItems.length > 0) {
      // Process in smaller batches to avoid timeouts
      for (let i = 0; i < normalItems.length; i += 3) {
        const batch = normalItems.slice(i, i + 3);
        
        await Promise.all(batch.map(async (item) => {
          try {
            const { generateEmbeddingWithFallback } = await import('@/lib/services/geminiEmbeddingService');
            const embedding = await generateEmbeddingWithFallback(item.content, {
              maxRetries: 1
            });
            
            if (embedding) {
              // Update embedding
              await intelligentEmbeddingService['updateEmbedding'](
                item.table_name,
                item.record_id,
                embedding
              );
              
              // Mark as processed
              await supabase
                .from('embedding_queue')
                .update({ 
                  processed: true, 
                  processed_at: new Date().toISOString() 
                })
                .eq('id', item.id);
              
              normalProcessed++;
            }
          } catch (error) {
            console.error(`Failed to process ${item.id}:`, error);
          }
        }));
        
        // Small delay between batches
        if (i + 3 < normalItems.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    // 5. Clean up old processed items
    await supabase
      .from('embedding_queue')
      .delete()
      .eq('processed', true)
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    res.status(200).json({
      success: true,
      processed: {
        highPriority,
        normal: normalProcessed,
        total: highPriority + normalProcessed
      },
      stats: {
        remaining: stats.queue.unprocessed - (highPriority + normalProcessed),
        failed: stats.queue.failed
      }
    });
    
  } catch (error) {
    console.error('Background processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
}