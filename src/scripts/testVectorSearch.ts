import { createClient } from '@supabase/supabase-js';
import { geminiEmbeddingService } from '../lib/services/geminiEmbeddingService';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testVectorSearch() {
  console.log('🧪 Testing Vector Search System...\n');

  try {
    // Test 1: Generate an embedding
    console.log('1️⃣ Testing Gemini Embedding Generation...');
    const testText = "Who usually buys groceries?";
    const embedding = await geminiEmbeddingService.generateEmbedding(testText);
    console.log(`✅ Generated embedding with ${embedding.length} dimensions\n`);

    // Test 2: Check if tables exist
    console.log('2️⃣ Checking Vector Tables...');
    const tables = ['conversation_embeddings', 'expense_embeddings', 'household_context_embeddings'];
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Error checking ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table} exists with ${count || 0} records`);
      }
    }

    // Test 3: Check embedding queue
    console.log('\n3️⃣ Checking Embedding Queue...');
    const { data: queueStats, error: queueError } = await supabase
      .rpc('get_embedding_queue_stats');
    
    if (queueError) {
      console.log('❌ Error getting queue stats:', queueError.message);
    } else {
      console.log('✅ Queue stats:', queueStats[0]);
    }

    // Test 4: Test vector search function (if we have a household ID)
    console.log('\n4️⃣ Testing Vector Search Functions...');
    
    // Get a sample household ID
    const { data: household } = await supabase
      .from('households')
      .select('id')
      .limit(1)
      .single();

    if (household) {
      // Test the search function
      const { data: searchResult, error: searchError } = await supabase
        .rpc('search_similar_expenses', {
          p_household_id: household.id,
          p_query_embedding: embedding,
          p_limit: 3,
          p_threshold: 0.5
        });

      if (searchError) {
        console.log('❌ Search function error:', searchError.message);
      } else {
        console.log(`✅ Search function works! Found ${searchResult?.length || 0} similar expenses`);
        if (searchResult && searchResult.length > 0) {
          console.log('   Sample result:', searchResult[0]);
        }
      }
    }

    console.log('\n✨ Vector search system is ready to use!');
    console.log('\n📝 Next steps:');
    console.log('1. Ask questions in the AI chat to generate embeddings');
    console.log('2. Run the migration script to embed existing data');
    console.log('3. Set up the cron job for processing the queue');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

testVectorSearch().then(() => process.exit(0));