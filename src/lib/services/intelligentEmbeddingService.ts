import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateEmbeddingWithFallback } from './geminiEmbeddingService';

let supabase: SupabaseClient;

function getSupabaseClient() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error('Supabase environment variables are not set');
    }
    
    supabase = createClient(url, key);
  }
  return supabase;
}

interface EmbeddingOptions {
  priority?: 'high' | 'normal' | 'low';
  processImmediately?: boolean;
  similarityThreshold?: number;
}

export class IntelligentEmbeddingService {
  private get supabase() {
    return getSupabaseClient();
  }

  // Store conversation with intelligent embedding
  async storeConversationWithEmbedding(
    householdId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    options: EmbeddingOptions = {}
  ) {
    const { processImmediately = true, priority = 'normal' } = options;
    
    try {
      // Store conversation first
      const { data: conversation, error } = await this.supabase
        .from('conversation_embeddings')
        .insert({
          household_id: householdId,
          user_id: userId,
          message_role: role,
          message_content: content,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Try to generate embedding immediately if requested
      if (processImmediately && priority === 'high') {
        const embedding = await generateEmbeddingWithFallback(content, {
          maxRetries: 3,
          priority: true
        });
        
        if (embedding) {
          await this.supabase
            .from('conversation_embeddings')
            .update({ embedding })
            .eq('id', conversation.id);
          
          return { conversation, embedded: true };
        }
      }
      
      // Queue for background processing
      await this.supabase.from('embedding_queue').insert({
        table_name: 'conversations',
        record_id: conversation.id,
        content: content,
        household_id: householdId,
        metadata: { priority }
      });
      
      return { conversation, embedded: false, queued: true };
      
    } catch (error) {
      console.error('Error storing conversation:', error);
      throw error;
    }
  }

  // Check if similar content already has embedding
  async checkSimilarEmbeddingExists(
    content: string,
    householdId: string,
    threshold: number = 0.9
  ): Promise<{ exists: boolean; embedding?: number[] }> {
    try {
      // Use trigram similarity to find very similar text
      const { data: similar } = await this.supabase
        .from('conversation_embeddings')
        .select('id, message_content, embedding')
        .eq('household_id', householdId)
        .not('embedding', 'is', null)
        .textSearch('message_content', content, {
          type: 'websearch',
          config: 'english'
        })
        .limit(5);
      
      if (!similar || similar.length === 0) {
        return { exists: false };
      }
      
      // Check for high similarity using simple text comparison
      for (const item of similar) {
        const similarity = this.calculateTextSimilarity(content, item.message_content);
        if (similarity > threshold && item.embedding) {
          return { exists: true, embedding: item.embedding };
        }
      }
      
      return { exists: false };
    } catch (error) {
      console.error('Error checking similar embeddings:', error);
      return { exists: false };
    }
  }

  // Simple text similarity calculation
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // Process high-priority items immediately
  async processHighPriorityQueue(limit: number = 5) {
    try {
      const { data: items } = await this.supabase
        .from('embedding_queue')
        .select('*')
        .eq('processed', false)
        .is('error', null)
        .eq('metadata->priority', 'high')
        .limit(limit);
      
      if (!items || items.length === 0) {
        return { processed: 0 };
      }
      
      let processed = 0;
      for (const item of items) {
        try {
          const embedding = await generateEmbeddingWithFallback(item.content, {
            maxRetries: 2,
            priority: true
          });
          
          if (embedding) {
            // Update the appropriate table
            await this.updateEmbedding(item.table_name, item.record_id, embedding);
            
            // Mark as processed
            await this.supabase
              .from('embedding_queue')
              .update({ 
                processed: true, 
                processed_at: new Date().toISOString() 
              })
              .eq('id', item.id);
            
            processed++;
          }
        } catch (error) {
          console.error(`Failed to process item ${item.id}:`, error);
        }
      }
      
      return { processed };
    } catch (error) {
      console.error('Error processing priority queue:', error);
      return { processed: 0, error };
    }
  }

  private async updateEmbedding(tableName: string, recordId: string, embedding: number[]) {
    const tableMap = {
      'conversations': 'conversation_embeddings',
      'expenses': 'expense_embeddings',
      'household_rules': 'household_context_embeddings'
    };
    
    const table = tableMap[tableName];
    if (!table) throw new Error(`Unknown table: ${tableName}`);
    
    await this.supabase
      .from(table)
      .update({ embedding })
      .eq('id', recordId);
  }

  // Get embedding stats for monitoring
  async getEmbeddingStats(householdId?: string) {
    const baseQuery = this.supabase
      .from('conversation_embeddings')
      .select('id', { count: 'exact' });
    
    if (householdId) {
      baseQuery.eq('household_id', householdId);
    }
    
    const [withEmbedding, withoutEmbedding, queueStats] = await Promise.all([
      baseQuery.not('embedding', 'is', null),
      baseQuery.is('embedding', null),
      supabase.rpc('get_embedding_queue_stats')
    ]);
    
    return {
      conversations: {
        with_embeddings: withEmbedding.count || 0,
        without_embeddings: withoutEmbedding.count || 0,
        percentage: withEmbedding.count 
          ? Math.round((withEmbedding.count / (withEmbedding.count + (withoutEmbedding.count || 0))) * 100)
          : 0
      },
      queue: queueStats.data?.[0] || { unprocessed: 0, processed: 0, failed: 0 }
    };
  }
}

export const intelligentEmbeddingService = new IntelligentEmbeddingService();