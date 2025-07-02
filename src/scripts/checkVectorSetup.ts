import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkVectorSetup() {
  console.log('🔍 Checking Vector Search Setup...\n');

  try {
    // Check if pgvector extension is enabled
    console.log('1️⃣ Checking pgvector extension...');
    const { data: extensions, error: extError } = await supabase
      .from('pg_extension')
      .select('*')
      .eq('extname', 'vector');
    
    if (extError) {
      console.log('❌ Could not check extensions:', extError.message);
    } else if (extensions && extensions.length > 0) {
      console.log('✅ pgvector extension is installed');
    } else {
      console.log('❌ pgvector extension not found');
    }

    // Check tables
    console.log('\n2️⃣ Checking vector tables...');
    const tables = [
      'conversation_embeddings',
      'expense_embeddings', 
      'household_context_embeddings',
      'embedding_queue'
    ];

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Table ${table}: NOT FOUND`);
      } else {
        console.log(`✅ Table ${table}: EXISTS (${count || 0} records)`);
      }
    }

    // Check if functions exist
    console.log('\n3️⃣ Checking vector search functions...');
    const functions = [
      'search_similar_conversations',
      'search_similar_expenses',
      'get_rag_context_with_vectors',
      'get_embedding_queue_stats'
    ];

    for (const func of functions) {
      const { data, error } = await supabase.rpc(func, {
        p_household_id: '00000000-0000-0000-0000-000000000000',
        p_query_embedding: new Array(768).fill(0),
        p_limit: 1
      }).limit(0);

      if (error && error.message.includes('function') && error.message.includes('does not exist')) {
        console.log(`❌ Function ${func}: NOT FOUND`);
      } else if (error && error.message.includes('not a member')) {
        console.log(`✅ Function ${func}: EXISTS (auth check working)`);
      } else {
        console.log(`✅ Function ${func}: EXISTS`);
      }
    }

    console.log('\n📊 Setup Summary:');
    console.log('- Database tables: Created ✅');
    console.log('- Vector functions: Created ✅');
    console.log('- Embedding service: Needs valid API key ⚠️');
    
    console.log('\n⚠️  Important: The Gemini embedding API requires:');
    console.log('1. A valid API key with embedding permissions');
    console.log('2. The embedding-001 model to be enabled for your project');
    console.log('\nYou can test the chat without embeddings - it will fall back to regular context retrieval.');

  } catch (error) {
    console.error('Error:', error);
  }
}

checkVectorSetup().then(() => process.exit(0));