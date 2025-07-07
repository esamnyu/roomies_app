import { IntentClassifier } from './intentClassifier';
import { ContextBuilder } from './contextBuilder';
import { RAGRequest, RAGResponse, RAGContext } from './types';
import { intelligentEmbeddingService } from '../services/intelligentEmbeddingService';
import { generateEmbeddingWithFallback } from '../services/geminiEmbeddingService';
import { createClient } from '@supabase/supabase-js';

export interface UnifiedRAGOptions {
  maxContextTokens?: number;
  useHybridSearch?: boolean;
  entityTypes?: string[];
  similarityThreshold?: number;
  daysBack?: number;
  includeMetadata?: boolean;
  trackPerformance?: boolean;
}

export class UnifiedRAGHandler {
  private intentClassifier: IntentClassifier;
  private contextBuilder: ContextBuilder;
  private supabase: any;
  private defaultOptions: UnifiedRAGOptions = {
    maxContextTokens: 1000,
    useHybridSearch: true,
    similarityThreshold: 0.7,
    daysBack: 30,
    includeMetadata: true,
    trackPerformance: true
  };
  
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.intentClassifier = new IntentClassifier();
    this.contextBuilder = new ContextBuilder(supabaseUrl, supabaseKey);
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  async processQuery(
    request: RAGRequest, 
    options: UnifiedRAGOptions = {}
  ): Promise<RAGResponse & { performanceMetrics?: any }> {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // 1. Classify intent
    const intent = this.intentClassifier.classify(request.query);
    
    // 2. Map intent to entity types for focused search
    const entityTypes = this.getEntityTypesForIntent(intent.primary_intent);
    
    // 3. Generate query embedding
    let queryEmbedding: number[] | null = null;
    let embeddingError = false;
    
    try {
      // Check for cached similar embedding first
      const { exists, embedding: cachedEmbedding } = await intelligentEmbeddingService
        .checkSimilarEmbeddingExists(request.query, request.household_id, 0.95);
      
      if (exists && cachedEmbedding) {
        queryEmbedding = cachedEmbedding;
      } else {
        // Generate new embedding
        const newEmbedding = await generateEmbeddingWithFallback(request.query, {
          maxRetries: 2,
          priority: true
        });
        if (newEmbedding) {
          queryEmbedding = newEmbedding;
        }
      }
    } catch (error) {
      console.warn('Failed to generate embedding, will use text search only:', error);
      embeddingError = true;
    }
    
    // 4. Perform unified context retrieval
    const { data: ragContext, error: contextError } = await this.supabase
      .rpc('get_unified_rag_context', {
        p_household_id: request.household_id,
        p_user_id: request.user_id,
        p_query_embedding: queryEmbedding,
        p_query_text: mergedOptions.useHybridSearch ? request.query : null,
        p_entity_types: entityTypes,
        p_options: {
          limit: Math.ceil(mergedOptions.maxContextTokens! / 50), // Estimate ~50 tokens per result
          threshold: mergedOptions.similarityThreshold,
          use_hybrid: mergedOptions.useHybridSearch,
          days_back: mergedOptions.daysBack
        }
      });
    
    if (contextError) {
      throw new Error(`RAG context retrieval failed: ${contextError.message}`);
    }
    
    // 5. Build structured contexts
    const contexts = await this.buildStructuredContexts(
      ragContext,
      request,
      intent,
      mergedOptions
    );
    
    // 6. Calculate total tokens
    const totalTokens = contexts.reduce((sum, ctx) => sum + ctx.tokens, 0);
    
    // 7. Track performance if enabled
    const executionTime = Date.now() - startTime;
    if (mergedOptions.trackPerformance) {
      this.trackPerformance({
        queryType: intent.primary_intent,
        entityTypes,
        usedVector: !!queryEmbedding,
        usedText: mergedOptions.useHybridSearch!,
        resultCount: ragContext.results?.length || 0,
        executionTimeMs: executionTime,
        userId: request.user_id,
        householdId: request.household_id
      });
    }
    
    const response: RAGResponse & { performanceMetrics?: any } = {
      contexts,
      total_tokens: totalTokens
    };
    
    if (mergedOptions.includeMetadata) {
      response.performanceMetrics = {
        executionTimeMs: executionTime,
        usedVectorSearch: !!queryEmbedding,
        usedTextSearch: mergedOptions.useHybridSearch,
        embeddingGenerationFailed: embeddingError,
        resultCount: ragContext.results?.length || 0,
        intent: intent.primary_intent,
        confidence: intent.confidence,
        searchMetadata: ragContext.search_metadata
      };
    }
    
    return response;
  }
  
  private getEntityTypesForIntent(intent: string): string[] {
    switch (intent) {
      case 'expense_query':
        return ['expense', 'conversation'];
      case 'chore_query':
        return ['chore', 'household_context', 'conversation'];
      case 'household_info':
        return ['household_context', 'conversation'];
      case 'general_advice':
      default:
        return ['conversation', 'expense', 'household_context'];
    }
  }
  
  private async buildStructuredContexts(
    ragContext: any,
    request: RAGRequest,
    intent: any,
    options: UnifiedRAGOptions
  ): Promise<RAGContext[]> {
    const contexts: RAGContext[] = [];
    let tokenBudget = options.maxContextTokens!;
    
    // Always add system context
    const systemContext = await this.contextBuilder.getSystemContext();
    contexts.push(systemContext);
    tokenBudget -= systemContext.tokens;
    
    // Add RAG results as context
    if (ragContext.results && ragContext.results.length > 0) {
      const ragResultsContext: RAGContext = {
        type: 'search_results',
        content: this.formatRAGResults(ragContext.results),
        tokens: Math.min(tokenBudget * 0.5, ragContext.results.length * 50) // Use up to 50% of budget
      };
      contexts.push(ragResultsContext);
      tokenBudget -= ragResultsContext.tokens;
    }
    
    // Add specific context based on intent if budget allows
    if (tokenBudget > 100) {
      switch (intent.primary_intent) {
        case 'expense_query':
          const expenseContext = await this.contextBuilder.buildExpenseContext(
            request.household_id,
            intent.entities
          );
          if (expenseContext.tokens <= tokenBudget) {
            contexts.push(expenseContext);
            tokenBudget -= expenseContext.tokens;
          }
          break;
          
        case 'chore_query':
          const choreContext = await this.contextBuilder.buildChoreContext(
            request.household_id,
            intent.entities
          );
          if (choreContext.tokens <= tokenBudget) {
            contexts.push(choreContext);
            tokenBudget -= choreContext.tokens;
          }
          break;
          
        case 'household_info':
          const infoContext = await this.contextBuilder.buildHouseholdInfoContext(
            request.household_id
          );
          if (infoContext.tokens <= tokenBudget) {
            contexts.push(infoContext);
            tokenBudget -= infoContext.tokens;
          }
          break;
      }
    }
    
    return contexts;
  }
  
  private formatRAGResults(results: any[]): string {
    let formatted = "=== RELEVANT CONTEXT FROM HISTORY ===\n\n";
    
    // Group by entity type
    const grouped = results.reduce((acc, result) => {
      if (!acc[result.entity_type]) acc[result.entity_type] = [];
      acc[result.entity_type].push(result);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Format each group
    Object.entries(grouped).forEach(([type, items]) => {
      formatted += `${type.toUpperCase().replace('_', ' ')}:\n`;
      items.forEach((item, idx) => {
        const score = item.score || item.similarity || item.relevance;
        formatted += `${idx + 1}. ${item.content}`;
        if (score) {
          formatted += ` (${Math.round(score * 100)}% match)`;
        }
        formatted += '\n';
        
        // Add metadata if relevant
        if (item.metadata && Object.keys(item.metadata).length > 0) {
          const relevantMeta = this.extractRelevantMetadata(item.metadata, type);
          if (relevantMeta) {
            formatted += `   ${relevantMeta}\n`;
          }
        }
      });
      formatted += '\n';
    });
    
    return formatted;
  }
  
  private extractRelevantMetadata(metadata: any, entityType: string): string | null {
    switch (entityType) {
      case 'expense':
        if (metadata.amount || metadata.date) {
          return `Amount: $${metadata.amount}, Date: ${metadata.date}`;
        }
        break;
      case 'conversation':
        if (metadata.message_role) {
          return `Role: ${metadata.message_role}`;
        }
        break;
      case 'household_context':
        if (metadata.context_type) {
          return `Type: ${metadata.context_type}`;
        }
        break;
    }
    return null;
  }
  
  formatContextForPrompt(contexts: RAGContext[]): string {
    let formattedContext = "=== HOUSEHOLD ASSISTANT CONTEXT ===\n\n";
    
    contexts.forEach(ctx => {
      switch (ctx.type) {
        case 'system':
          formattedContext += "SYSTEM INFO:\n" + ctx.content + "\n\n";
          break;
        case 'search_results':
          formattedContext += ctx.content + "\n";
          break;
        case 'expense':
          formattedContext += "CURRENT FINANCIAL DATA:\n" + ctx.content + "\n\n";
          break;
        case 'chore':
          formattedContext += "CURRENT CHORE SCHEDULE:\n" + ctx.content + "\n\n";
          break;
        case 'info':
          formattedContext += "HOUSEHOLD INFORMATION:\n" + ctx.content + "\n\n";
          break;
      }
    });
    
    formattedContext += "=== END CONTEXT ===\n\n";
    formattedContext += "Based on the above context, please provide a helpful response to the user's query.\n";
    
    return formattedContext;
  }
  
  private async trackPerformance(metrics: any) {
    try {
      await this.supabase
        .from('embedding_performance_metrics')
        .insert({
          query_type: metrics.queryType,
          entity_types: metrics.entityTypes,
          used_vector: metrics.usedVector,
          used_text: metrics.usedText,
          result_count: metrics.resultCount,
          execution_time_ms: metrics.executionTimeMs,
          user_id: metrics.userId,
          household_id: metrics.householdId
        });
    } catch (error) {
      console.error('Failed to track performance metrics:', error);
    }
  }
  
  // Get performance insights
  async getPerformanceInsights(householdId?: string, days: number = 7) {
    const query = this.supabase
      .from('embedding_performance_metrics')
      .select('*')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
    
    if (householdId) {
      query.eq('household_id', householdId);
    }
    
    const { data } = await query;
    
    if (!data || data.length === 0) {
      return { message: 'No performance data available' };
    }
    
    // Calculate insights
    const avgExecutionTime = data.reduce((sum, m) => sum + m.execution_time_ms, 0) / data.length;
    const vectorUsageRate = (data.filter(m => m.used_vector).length / data.length) * 100;
    const avgResultCount = data.reduce((sum, m) => sum + m.result_count, 0) / data.length;
    
    const queryTypeBreakdown = data.reduce((acc, m) => {
      acc[m.query_type] = (acc[m.query_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalQueries: data.length,
      avgExecutionTimeMs: Math.round(avgExecutionTime),
      vectorUsageRate: Math.round(vectorUsageRate),
      avgResultCount: Math.round(avgResultCount),
      queryTypeBreakdown,
      recommendations: this.generateRecommendations(avgExecutionTime, vectorUsageRate, avgResultCount)
    };
  }
  
  private generateRecommendations(avgTime: number, vectorRate: number, avgResults: number): string[] {
    const recommendations: string[] = [];
    
    if (avgTime > 500) {
      recommendations.push('Consider optimizing embedding generation or using more caching');
    }
    
    if (vectorRate < 50) {
      recommendations.push('Low vector search usage - check if embedding generation is failing');
    }
    
    if (avgResults < 2) {
      recommendations.push('Low result count - consider lowering similarity threshold or expanding search');
    }
    
    if (avgResults > 8) {
      recommendations.push('High result count - consider increasing similarity threshold for more relevant results');
    }
    
    return recommendations;
  }
}

export const unifiedRAGHandler = (url: string, key: string) => new UnifiedRAGHandler(url, key);