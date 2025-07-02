import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { geminiEmbeddingService } from '@/lib/services/geminiEmbeddingService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // This endpoint should be protected - either by API key or by checking a cron secret
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get unprocessed items from queue
    const { data: queueItems, error: queueError } = await supabase
      .from('embedding_queue')
      .select('*')
      .eq('processed', false)
      .is('error', null)
      .limit(10);

    if (queueError) {
      throw queueError;
    }

    if (!queueItems || queueItems.length === 0) {
      return res.status(200).json({ message: 'No items to process' });
    }

    const processed = [];
    const failed = [];

    // Process embeddings with timeout and concurrency limit
    const EMBEDDING_TIMEOUT = 15000; // 15 seconds per embedding
    const CONCURRENT_LIMIT = 3; // Process 3 at a time to avoid rate limits
    
    // Process in batches
    for (let i = 0; i < queueItems.length; i += CONCURRENT_LIMIT) {
      const batch = queueItems.slice(i, i + CONCURRENT_LIMIT);
      
      await Promise.all(batch.map(async (item) => {
        try {
          // Generate embedding with timeout
          const embedding = await Promise.race([
            geminiEmbeddingService.generateEmbedding(item.content),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Embedding generation timeout')), EMBEDDING_TIMEOUT)
            )
          ]);

        // Store based on table type
        if (item.table_name === 'expenses') {
          await supabase.from('expense_embeddings').insert({
            expense_id: item.record_id,
            household_id: item.household_id,
            description: item.content,
            embedding: embedding
          });
        } else if (item.table_name === 'household_rules') {
          await supabase.from('household_context_embeddings').insert({
            household_id: item.household_id,
            context_type: 'rules',
            content: item.content,
            embedding: embedding
          });
        }

        // Mark as processed
        await supabase
          .from('embedding_queue')
          .update({ 
            processed: true, 
            processed_at: new Date().toISOString() 
          })
          .eq('id', item.id);

        processed.push(item.id);
      } catch (error) {
        // Mark as failed
        await supabase
          .from('embedding_queue')
          .update({ 
            error: error.message || 'Processing failed'
          })
          .eq('id', item.id);

        failed.push({ id: item.id, error: error.message });
      }
      }))
    }

    res.status(200).json({ 
      message: 'Queue processed',
      processed: processed.length,
      failed: failed.length,
      details: { processed, failed }
    });

  } catch (error) {
    console.error('Queue processing error:', error);
    res.status(500).json({ error: 'Failed to process queue' });
  }
}