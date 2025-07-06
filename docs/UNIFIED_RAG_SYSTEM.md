# Unified RAG System Documentation

## Overview

The Roomies app now uses a unified RAG (Retrieval-Augmented Generation) system that consolidates all vector embeddings into a single table and provides improved search capabilities.

## Key Improvements

### 1. Unified Embeddings Table
- **Before**: 3 separate tables (conversation_embeddings, expense_embeddings, household_context_embeddings)
- **After**: 1 unified `embeddings` table with entity_type field
- **Benefits**: 
  - 66% reduction in table complexity
  - Single optimized vector index
  - Easier maintenance and querying

### 2. Hybrid Search
- Combines vector similarity search with full-text search
- Automatic fallback when embedding generation fails
- Configurable weighting between vector and text results

### 3. Performance Monitoring
- Built-in performance tracking
- Query execution time monitoring
- Usage analytics and recommendations
- Visual dashboard for monitoring

## Migration Guide

### 1. Run the Migration
```bash
supabase migration up
```

This will:
- Create the unified `embeddings` table
- Migrate all existing embeddings
- Create new RPC functions
- Set up monitoring tables

### 2. Update API Endpoints

#### Old Endpoint
```typescript
// /api/ai-chat-rag-v2
```

#### New Endpoint
```typescript
// /api/ai-chat-rag-unified
```

The new endpoint provides:
- Better performance
- More detailed debug information
- Automatic performance tracking

### 3. Update Frontend Components

```typescript
// Update AIMateChatRAG component to use new endpoint
const response = await fetch('/api/ai-chat-rag-unified', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`
  },
  body: JSON.stringify({
    message: userMessage,
    householdId,
    conversationHistory,
    options: {
      maxContextTokens: 1000,
      useHybridSearch: true,
      includeDebug: showDebug
    }
  })
});
```

## New Features

### 1. Unified RAG Handler
```typescript
import { unifiedRAGHandler } from '@/lib/rag/unifiedRagHandler';

const ragHandler = unifiedRAGHandler(supabaseUrl, supabaseKey);

// Process query with options
const response = await ragHandler.processQuery(request, {
  maxContextTokens: 1000,
  useHybridSearch: true,
  entityTypes: ['conversation', 'expense'],
  similarityThreshold: 0.7,
  trackPerformance: true
});
```

### 2. Intelligent Embedding Service
```typescript
import { intelligentEmbeddingService } from '@/lib/services/intelligentEmbeddingService';

// Store any type of embedding
await intelligentEmbeddingService.storeEmbedding(
  householdId,
  content,
  {
    entityType: 'expense',
    entityId: expenseId,
    priority: 'high',
    processImmediately: true
  }
);

// Check for duplicates
const { exists, embedding } = await intelligentEmbeddingService
  .checkSimilarEmbeddingExists(content, householdId, 0.95);

// Get statistics
const stats = await intelligentEmbeddingService.getEmbeddingStats(householdId);
```

### 3. RAG Monitoring Dashboard
```typescript
import RAGMonitorDashboard from '@/components/RAGMonitorDashboard';

// Add to admin panel
<RAGMonitorDashboard householdId={householdId} />
```

## Database Functions

### Core Functions

#### `get_unified_rag_context`
Main function for retrieving context with hybrid search support.

```sql
SELECT * FROM get_unified_rag_context(
  p_household_id => 'uuid',
  p_user_id => 'uuid',
  p_query_embedding => vector,
  p_query_text => 'search text',
  p_entity_types => ARRAY['conversation', 'expense'],
  p_options => '{"limit": 10, "threshold": 0.7}'::jsonb
);
```

#### `search_similar_embeddings`
Simplified similarity search across entity types.

```sql
SELECT * FROM search_similar_embeddings(
  p_household_id => 'uuid',
  p_query_embedding => vector,
  p_entity_type => 'expense',
  p_limit => 5,
  p_threshold => 0.7
);
```

#### `check_duplicate_embedding`
Fast duplicate detection using content hashing.

```sql
SELECT * FROM check_duplicate_embedding(
  p_content => 'text content',
  p_household_id => 'uuid',
  p_entity_type => 'conversation',
  p_threshold => 0.95
);
```

### Backward Compatibility

The following functions are maintained for backward compatibility:
- `get_rag_context_with_vectors`
- `get_rag_context_with_similarity`

These now use the unified table under the hood.

## Performance Optimization Tips

1. **Use Batch Operations**
   ```typescript
   await intelligentEmbeddingService.storeEmbeddingsBatch([
     { householdId, content, entityType: 'expense', entityId },
     // ... more embeddings
   ]);
   ```

2. **Configure Similarity Thresholds**
   - Higher threshold (0.8-0.9): More precise results
   - Lower threshold (0.5-0.7): More recall, potentially less relevant

3. **Monitor Performance**
   ```typescript
   const insights = await ragHandler.getPerformanceInsights(householdId, 7);
   console.log(insights.recommendations);
   ```

4. **Process High-Priority Items First**
   ```typescript
   await intelligentEmbeddingService.processHighPriorityQueue(5);
   ```

## Troubleshooting

### Common Issues

1. **Embeddings not generating**
   - Check Gemini API key configuration
   - Monitor the embedding queue for errors
   - Use the RAG Monitor Dashboard

2. **Slow search performance**
   - Check if vector index exists: `idx_embeddings_vector`
   - Consider increasing the similarity threshold
   - Review performance insights for recommendations

3. **High token usage**
   - Adjust `maxContextTokens` in requests
   - Use more specific `entityTypes` filtering
   - Implement result pagination

### Monitoring Queries

```sql
-- Check embedding coverage
SELECT * FROM embedding_statistics;

-- View household-specific coverage
SELECT * FROM embedding_coverage_by_household 
WHERE household_id = 'your-household-id';

-- Check queue status
SELECT * FROM get_embedding_queue_stats();

-- View recent performance metrics
SELECT * FROM embedding_performance_metrics 
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

## Future Enhancements

1. **Multi-language Support**: Add language detection and language-specific embeddings
2. **Incremental Updates**: Update embeddings when content changes
3. **Custom Entity Types**: Easy addition of new content types (e.g., 'recipe', 'event')
4. **Embedding Versioning**: Track embedding model versions for future migrations
5. **Advanced Caching**: Implement Redis caching for frequently accessed embeddings