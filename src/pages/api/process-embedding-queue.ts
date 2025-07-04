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
        const startTime = Date.now();
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
          // Check if embedding already exists
          const { data: existing } = await supabase
            .from('expense_embeddings')
            .select('id')
            .eq('expense_id', item.record_id)
            .single();
          
          if (existing) {
            // Update existing embedding
            await supabase
              .from('expense_embeddings')
              .update({ embedding })
              .eq('expense_id', item.record_id);
          } else {
            // Insert new embedding
            await supabase.from('expense_embeddings').insert({
              expense_id: item.record_id,
              household_id: item.household_id,
              description: item.content,
              embedding: embedding
            });
          }
        } else if (item.table_name === 'household_rules') {
          await supabase.from('household_context_embeddings').insert({
            household_id: item.household_id,
            context_type: 'rules',
            content: item.content,
            embedding: embedding
          });
        } else if (item.table_name === 'conversations') {
          // Update the conversation embedding
          await supabase
            .from('conversation_embeddings')
            .update({ embedding })
            .eq('id', item.record_id);
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
        
        // Log success
        await embeddingMonitor.logEmbeddingGeneration(
          item.id,
          item.table_name,
          true,
          Date.now() - startTime
        );
      } catch (error) {
        // Mark as failed
        await supabase
          .from('embedding_queue')
          .update({ 
            error: error.message || 'Processing failed'
          })
          .eq('id', item.id);

        failed.push({ id: item.id, error: error.message });
        
        // Log failure
        await embeddingMonitor.logEmbeddingGeneration(
          item.id,
          item.table_name,
          false,
          Date.now() - startTime,
          error.message
        );
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