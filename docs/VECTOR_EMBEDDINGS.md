# Vector Embeddings Implementation for AI Assistant

This document describes the vector embedding system that powers semantic search in the Roomies AI assistant.

## Overview

The vector embedding system enhances the AI assistant by:
- Converting text into 768-dimensional vectors using Google's Gemini embedding model
- Enabling semantic search to find related conversations, expenses, and household context
- Providing better context retrieval based on meaning rather than just keywords

## Architecture

### Components

1. **Embedding Service** (`src/lib/services/geminiEmbeddingService.ts`)
   - Generates embeddings using Gemini's `embedding-001` model
   - Supports single and batch embedding generation
   - Includes cosine similarity calculation

2. **Embedding Queue** (`embedding_queue` table)
   - Asynchronously processes text for embedding generation
   - Prevents API rate limiting and timeouts
   - Tracks processing status and errors

3. **Vector Storage Tables**
   - `conversation_embeddings`: Stores AI chat conversations with vectors
   - `expense_embeddings`: Stores expense descriptions with vectors
   - `household_context_embeddings`: Stores household rules and context with vectors

4. **Processing Pipeline** (`src/pages/api/process-embedding-queue.ts`)
   - Processes queued items in batches
   - Handles timeouts and errors gracefully
   - Logs performance metrics

5. **Monitoring System** (`src/lib/services/embeddingMonitor.ts`)
   - Tracks embedding generation performance
   - Provides health metrics and recommendations
   - Logs detailed statistics for analysis

## Setup Instructions

### 1. Run Database Migrations

```bash
# Apply the vector column migration
supabase db push --file supabase/migrations/20240107_add_vector_columns.sql

# Apply the logging table migration
supabase db push --file supabase/migrations/20240107_add_embedding_logs_table.sql
```

### 2. Set Environment Variables

Ensure your `.env.local` has:
```
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_cron_secret_for_processing
```

### 3. Process Existing Data

```bash
# Run the migration script to queue existing data
npx tsx src/scripts/migrateToEmbeddings.ts
```

### 4. Set Up Processing

#### Option A: Manual Processing
```bash
# Process embeddings manually
curl -X POST http://localhost:3000/api/process-embedding-queue \
  -H "x-cron-secret: your_cron_secret"
```

#### Option B: Cron Job (Recommended)
Set up a cron job to run every 5 minutes:
```cron
*/5 * * * * curl -X POST https://your-app.com/api/process-embedding-queue -H "x-cron-secret: your_cron_secret"
```

## Testing

### 1. Test Vector Implementation
```bash
npx tsx src/scripts/testVectorImplementation.ts
```

### 2. Test Vector Search
```bash
npx tsx src/scripts/testVectorSearch.ts
```

### 3. Check System Health
```bash
# Get embedding system health
curl http://localhost:3000/api/embedding-health \
  -H "Authorization: Bearer your_auth_token"
```

## Usage in AI Chat

The AI chat automatically:
1. Generates embeddings for user queries
2. Uses vector search to find similar past conversations and expenses
3. Falls back to text search if vector search fails
4. Logs whether vector search was used in the debug response

## Monitoring

### Health Endpoint
`GET /api/embedding-health?timeRange=hour|day|week`

Returns:
- Queue health status
- Processing metrics
- Error patterns
- Recommendations

### Metrics Dashboard
`GET /api/embedding-stats`

Returns:
- Total embeddings by type
- Queue statistics
- Processing backlog

## Performance Considerations

1. **Batch Processing**: Process up to 3 embeddings concurrently
2. **Timeouts**: 15-second timeout per embedding generation
3. **Rate Limiting**: Gemini API has rate limits - monitor for 429 errors
4. **Index Management**: Uses IVFFlat indexes with 100 lists for efficient search

## Troubleshooting

### Common Issues

1. **"column embedding does not exist"**
   - Run the vector column migration

2. **High failure rate in processing**
   - Check Gemini API quota
   - Verify API key is valid
   - Look for specific error patterns in logs

3. **Slow vector search**
   - Rebuild indexes: `REINDEX INDEX conversation_embeddings_embedding_idx;`
   - Consider adjusting the number of lists in IVFFlat indexes

### Debug Commands

```sql
-- Check queue status
SELECT * FROM get_embedding_queue_stats();

-- View recent failures
SELECT * FROM embedding_queue 
WHERE error IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;

-- Check embedding dimensions
SELECT id, vector_dims(embedding) as dims 
FROM conversation_embeddings 
WHERE embedding IS NOT NULL 
LIMIT 5;
```

## Future Improvements

1. **Hybrid Search**: Combine vector and text search with weighted scoring
2. **Fine-tuning**: Train custom embeddings on household-specific data
3. **Caching**: Cache frequently accessed embeddings
4. **Multi-language**: Support embeddings in multiple languages
5. **Real-time Processing**: Process embeddings synchronously for critical paths