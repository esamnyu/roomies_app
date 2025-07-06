import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { geminiEmbeddingService } from '@/lib/services/geminiEmbeddingService';
import { embeddingMonitor } from '@/lib/services/embeddingMonitor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Protect endpoint with Supabase auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  // Check if it's the service role key (for admin/cron operations)
  const isServiceRole = token === process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!isServiceRole) {
    // For regular users, verify the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Check if user is a member of any household
    const { data: memberships } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .limit(1);
      
    if (!memberships || memberships.length === 0) {
      return res.status(403).json({ error: 'User must be a household member to process embeddings' });
    }
  }

  try {
    // Get unprocessed items from queue, prioritized by priority field
    const { data: queueItems, error: queueError } = await supabase
      .from('embedding_queue')
      .select('*')
      .eq('processed', false)
      .is('error', null)
      .order("metadata->priority", { ascending: false }) // High priority first
      .limit(10);

    if (queueError) {
      throw queueError;
    }

    if (!queueItems || queueItems.length === 0) {
      return res.status(200).json({ message: 'No items to process' });
    }

    const processed: any[] = [];
    const failed: any[] = [];
    const skipped: any[] = [];

    // Process embeddings with timeout and concurrency limit
    const EMBEDDING_TIMEOUT = 15000; // 15 seconds per embedding
    const CONCURRENT_LIMIT = 3; // Process 3 at a time to avoid rate limits
    
    // Process in batches
    for (let i = 0; i < queueItems.length; i += CONCURRENT_LIMIT) {
      const batch = queueItems.slice(i, i + CONCURRENT_LIMIT);
      
      await Promise.all(batch.map(async (item) => {
        const startTime = Date.now();
        try {
          // Check if embedding already exists in unified table
          const { data: existingEmbedding } = await supabase
            .from('embeddings')
            .select('id, embedding')
            .eq('id', item.record_id)
            .single();

          if (existingEmbedding?.embedding) {
            // Already has embedding, skip processing
            await supabase
              .from('embedding_queue')
              .update({ 
                processed: true, 
                processed_at: new Date().toISOString(),
                error: 'Embedding already exists'
              })
              .eq('id', item.id);
            
            skipped.push({ id: item.id, reason: 'Already has embedding' });
            return;
          }

          // Generate embedding with timeout
          const embedding = await Promise.race([
            geminiEmbeddingService.generateEmbedding(item.content),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Embedding generation timeout')), EMBEDDING_TIMEOUT)
            )
          ]);

          // Update unified embeddings table
          const { error: updateError } = await supabase
            .from('embeddings')
            .update({ 
              embedding,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.record_id);

          if (updateError) {
            throw updateError;
          }

          // Mark as processed in queue
          await supabase
            .from('embedding_queue')
            .update({ 
              processed: true, 
              processed_at: new Date().toISOString() 
            })
            .eq('id', item.id);

          processed.push({
            id: item.id,
            record_id: item.record_id,
            table_name: item.table_name
          });
          
          // Log success
          await embeddingMonitor.logEmbeddingGeneration(
            item.record_id,
            item.table_name,
            true,
            Date.now() - startTime
          );
        } catch (error) {
          // Mark as failed
          await supabase
            .from('embedding_queue')
            .update({ 
              error: error instanceof Error ? error.message : 'Processing failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

          failed.push({ 
            id: item.id, 
            record_id: item.record_id,
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          
          // Log failure
          await embeddingMonitor.logEmbeddingGeneration(
            item.record_id,
            item.table_name,
            false,
            Date.now() - startTime,
            error instanceof Error ? error.message : undefined
          );
        }
      }));
    }

    // Get queue statistics
    const { data: queueStats } = await supabase
      .rpc('get_embedding_queue_stats');

    res.status(200).json({ 
      message: 'Queue processed',
      processed: processed.length,
      failed: failed.length,
      skipped: skipped.length,
      details: { 
        processed, 
        failed, 
        skipped,
        queueStats: queueStats?.[0] || { unprocessed: 0, processed: 0, failed: 0 }
      }
    });

  } catch (error) {
    console.error('Queue processing error:', error);
    res.status(500).json({ error: 'Failed to process queue' });
  }
}

// Export config for proper timeout handling
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    // Increase timeout for processing multiple embeddings
    externalResolver: true,
  },
};