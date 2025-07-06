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
  entityType?: 'conversation' | 'expense' | 'household_context' | 'message' | 'chore';
  entityId?: string;
  metadata?: Record<string, any>;
}

export class IntelligentEmbeddingService {
  private get supabase() {
    return getSupabaseClient();
  }

  // Store any content with intelligent embedding using unified table
  async storeEmbedding(
    householdId: string,
    content: string,
    options: EmbeddingOptions = {}
  ) {
    const { 
      processImmediately = true, 
      priority = 'normal',
      entityType = 'conversation',
      entityId,
      metadata = {},
      similarityThreshold = 0.95
    } = options;
    
    try {
      // Check for duplicate first
      const { data: duplicateCheck } = await this.supabase
        .rpc('check_duplicate_embedding', {
          p_content: content,
          p_household_id: householdId,
          p_entity_type: entityType,
          p_threshold: similarityThreshold
        });

      if (duplicateCheck && duplicateCheck[0]?.exists) {
        return { 
          id: duplicateCheck[0].embedding_id, 
          embedded: true, 
          duplicate: true,
          similarity: duplicateCheck[0].similarity 
        };
      }

      // Store in unified embeddings table
      const { data: embedding, error } = await this.supabase
        .from('embeddings')
        .insert({
          household_id: householdId,
          entity_type: entityType,
          entity_id: entityId,
          user_id: options.entityType === 'conversation' ? metadata.userId : null,
          content: content,
          metadata: metadata
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Try to generate embedding immediately if requested
      if (processImmediately && priority === 'high') {
        const vector = await generateEmbeddingWithFallback(content, {
          maxRetries: 3,
          priority: true
        });
        
        if (vector) {
          await this.supabase
            .from('embeddings')
            .update({ embedding: vector })
            .eq('id', embedding.id);
          
          return { id: embedding.id, embedded: true };
        }
      }
      
      // Queue for background processing
      await this.supabase.rpc('queue_embedding_generation', {
        p_table_name: entityType,
        p_record_id: embedding.id,
        p_content: content,
        p_household_id: householdId,
        p_metadata: { priority, ...metadata },
        p_priority: priority
      });
      
      return { id: embedding.id, embedded: false, queued: true };
      
    } catch (error) {
      console.error('Error storing embedding:', error);
      throw error;
    }
  }

  // Store conversation with intelligent embedding (backward compatible)
  async storeConversationWithEmbedding(
    householdId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    options: EmbeddingOptions = {}
  ) {
    return this.storeEmbedding(householdId, content, {
      ...options,
      entityType: 'conversation',
      metadata: {
        ...options.metadata,
        userId,
        message_role: role
      }
    });
  }

  // Check if similar content already has embedding
  async checkSimilarEmbeddingExists(
    content: string,
    householdId: string,
    threshold: number = 0.9,
    entityType?: string
  ): Promise<{ exists: boolean; embedding?: number[] }> {
    try {
      // First check for exact duplicate using the database function
      const { data: duplicateCheck } = await this.supabase
        .rpc('check_duplicate_embedding', {
          p_content: content,
          p_household_id: householdId,
          p_entity_type: entityType || 'conversation',
          p_threshold: threshold
        });

      if (duplicateCheck && duplicateCheck[0]?.exists) {
        // Get the actual embedding
        const { data: embedding } = await this.supabase
          .from('embeddings')
          .select('embedding')
          .eq('id', duplicateCheck[0].embedding_id)
          .single();
        
        return { 
          exists: true, 
          embedding: embedding?.embedding 
        };
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
            // Update unified embeddings table
            await this.supabase
              .from('embeddings')
              .update({ embedding })
              .eq('id', item.record_id);
            
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

  // Batch store embeddings for better performance
  async storeEmbeddingsBatch(embeddings: Array<{
    householdId: string;
    content: string;
    entityType: string;
    entityId?: string;
    userId?: string;
    metadata?: any;
  }>) {
    try {
      const formattedEmbeddings = embeddings.map(e => ({
        household_id: e.householdId,
        entity_type: e.entityType,
        entity_id: e.entityId,
        user_id: e.userId,
        content: e.content,
        metadata: e.metadata || {}
      }));

      const { data } = await this.supabase
        .rpc('store_embeddings_batch', {
          p_embeddings: formattedEmbeddings
        });

      return data;
    } catch (error) {
      console.error('Error storing batch embeddings:', error);
      throw error;
    }
  }

  // Get embedding stats for monitoring
  async getEmbeddingStats(householdId?: string) {
    try {
      // Get stats from unified embeddings table
      const { data: stats } = await this.supabase
        .from('embedding_statistics')
        .select('*');

      // Get household-specific stats if requested
      let householdStats = null;
      if (householdId) {
        const { data } = await this.supabase
          .from('embedding_coverage_by_household')
          .select('*')
          .eq('household_id', householdId);
        householdStats = data;
      }

      // Get queue stats
      const { data: queueStats } = await this.supabase
        .rpc('get_embedding_queue_stats');
      
      return {
        overall: stats || [],
        household: householdStats,
        queue: queueStats?.[0] || { unprocessed: 0, processed: 0, failed: 0 },
        summary: {
          total_embeddings: stats?.reduce((acc, s) => acc + s.total_count, 0) || 0,
          with_vectors: stats?.reduce((acc, s) => acc + s.with_embedding, 0) || 0,
          coverage_percentage: stats && stats.length > 0
            ? Math.round((stats.reduce((acc, s) => acc + s.with_embedding, 0) / 
                stats.reduce((acc, s) => acc + s.total_count, 0)) * 100)
            : 0
        }
      };
    } catch (error) {
      console.error('Error getting embedding stats:', error);
      return {
        overall: [],
        household: null,
        queue: { unprocessed: 0, processed: 0, failed: 0 },
        summary: { total_embeddings: 0, with_vectors: 0, coverage_percentage: 0 }
      };
    }
  }

  // Search similar embeddings across entity types
  async searchSimilarEmbeddings(
    householdId: string,
    queryEmbedding: number[],
    options: {
      entityTypes?: string[];
      limit?: number;
      threshold?: number;
    } = {}
  ) {
    const { 
      entityTypes = ['conversation', 'expense', 'household_context'],
      limit = 10,
      threshold = 0.7
    } = options;

    try {
      const { data } = await this.supabase
        .rpc('search_similar_embeddings', {
          p_household_id: householdId,
          p_query_embedding: queryEmbedding,
          p_entity_type: null, // null means search all types
          p_limit: limit,
          p_threshold: threshold
        });

      // Filter by entity types if specified
      const filtered = entityTypes.length > 0 
        ? data?.filter(item => entityTypes.includes(item.entity_type))
        : data;

      return filtered || [];
    } catch (error) {
      console.error('Error searching similar embeddings:', error);
      return [];
    }
  }
}

export const intelligentEmbeddingService = new IntelligentEmbeddingService();