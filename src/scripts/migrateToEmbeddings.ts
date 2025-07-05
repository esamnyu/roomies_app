import { createClient } from '@supabase/supabase-js';
import { geminiEmbeddingService } from '../lib/services/geminiEmbeddingService';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrateExistingData() {
  console.log('🚀 Starting migration to embeddings...\n');

  let stats = {
    expenses: { total: 0, processed: 0, failed: 0 },
    conversations: { total: 0, processed: 0, failed: 0 },
    rules: { total: 0, processed: 0, failed: 0 }
  };

  try {
    // 1. Migrate existing expenses
    console.log('📦 Processing expenses...');
    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('id, description, household_id')
      .order('created_at', { ascending: false })
      .limit(100); // Start with recent 100

    if (expenseError) throw expenseError;
    
    stats.expenses.total = expenses?.length || 0;
    
    for (const expense of expenses || []) {
      try {
        // Check if already has embedding
        const { data: existing } = await supabase
          .from('expense_embeddings')
          .select('embedding')
          .eq('expense_id', expense.id)
          .single();
        
        if (!existing?.embedding) {
          // Queue for embedding
          await supabase.from('embedding_queue').insert({
            table_name: 'expenses',
            record_id: expense.id,
            content: expense.description,
            household_id: expense.household_id
          });
          stats.expenses.processed++;
        }
      } catch (err) {
        stats.expenses.failed++;
        console.error(`Failed to queue expense ${expense.id}:`, err);
      }
    }

    // 2. Migrate recent conversations
    console.log('\n💬 Processing conversations...');
    const { data: conversations, error: convError } = await supabase
      .from('conversation_embeddings')
      .select('id, message_content, household_id')
      .is('embedding', null)
      .order('created_at', { ascending: false })
      .limit(50); // Recent 50 conversations

    if (convError) throw convError;
    
    stats.conversations.total = conversations?.length || 0;
    
    for (const conv of conversations || []) {
      try {
        await supabase.from('embedding_queue').insert({
          table_name: 'conversations',
          record_id: conv.id,
          content: conv.message_content,
          household_id: conv.household_id
        });
        stats.conversations.processed++;
      } catch (err) {
        stats.conversations.failed++;
        console.error(`Failed to queue conversation ${conv.id}:`, err);
      }
    }

    // 3. Migrate household rules
    console.log('\n📋 Processing household rules...');
    const { data: households, error: householdError } = await supabase
      .from('households')
      .select('id, rules_document')
      .not('rules_document', 'is', null);

    if (householdError) throw householdError;
    
    stats.rules.total = households?.length || 0;
    
    for (const household of households || []) {
      try {
        // Check if already has embedding
        const { data: existing } = await supabase
          .from('household_context_embeddings')
          .select('id')
          .eq('household_id', household.id)
          .eq('context_type', 'rules')
          .single();
        
        if (!existing) {
          await supabase.from('embedding_queue').insert({
            table_name: 'household_rules',
            record_id: household.id,
            content: household.rules_document,
            household_id: household.id
          });
          stats.rules.processed++;
        }
      } catch (err) {
        stats.rules.failed++;
        console.error(`Failed to queue rules for household ${household.id}:`, err);
      }
    }

    // Display results
    console.log('\n✅ Migration Complete!\n');
    console.log('📊 Statistics:');
    console.log(`Expenses: ${stats.expenses.processed}/${stats.expenses.total} queued (${stats.expenses.failed} failed)`);
    console.log(`Conversations: ${stats.conversations.processed}/${stats.conversations.total} queued (${stats.conversations.failed} failed)`);
    console.log(`Rules: ${stats.rules.processed}/${stats.rules.total} queued (${stats.rules.failed} failed)`);
    
    // Check queue status
    const { data: queueStats } = await supabase.rpc('get_embedding_queue_stats');
    if (queueStats?.[0]) {
      console.log(`\n📬 Queue Status: ${queueStats[0].unprocessed} items waiting to be processed`);
    }

    console.log('\n📝 Next steps:');
    console.log('1. Run the process-embedding-queue endpoint to generate embeddings');
    console.log('2. Set up a cron job to process the queue regularly');
    console.log('3. Monitor the embedding generation progress');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  }
}

// Add command to process a small batch immediately
async function processSmallBatch() {
  console.log('\n🔄 Processing a small batch of embeddings...');
  
  try {
    const { data: items } = await supabase
      .from('embedding_queue')
      .select('*')
      .eq('processed', false)
      .is('error', null)
      .limit(5);

    if (!items || items.length === 0) {
      console.log('No items to process');
      return;
    }

    for (const item of items) {
      try {
        console.log(`Processing: ${item.table_name} - ${item.content.substring(0, 50)}...`);
        
        const embedding = await geminiEmbeddingService.generateEmbedding(item.content);
        
        // Store embedding based on type
        if (item.table_name === 'conversations') {
          await supabase
            .from('conversation_embeddings')
            .update({ embedding })
            .eq('id', item.record_id);
        } else if (item.table_name === 'expenses') {
          const { data: existing } = await supabase
            .from('expense_embeddings')
            .select('id')
            .eq('expense_id', item.record_id)
            .single();
          
          if (existing) {
            await supabase
              .from('expense_embeddings')
              .update({ embedding })
              .eq('expense_id', item.record_id);
          } else {
            await supabase.from('expense_embeddings').insert({
              expense_id: item.record_id,
              household_id: item.household_id,
              description: item.content,
              embedding
            });
          }
        }
        
        // Mark as processed
        await supabase
          .from('embedding_queue')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('id', item.id);
          
        console.log('✅ Processed successfully');
      } catch (err) {
        console.error('❌ Failed:', err);
        await supabase
          .from('embedding_queue')
          .update({ error: err instanceof Error ? err.message : 'Unknown error' })
          .eq('id', item.id);
      }
    }
  } catch (error) {
    console.error('Batch processing failed:', error);
  }
}

// Run migration
migrateExistingData().then(async () => {
  console.log('\nWould you like to process a small batch now? (This will help test the system)');
  await processSmallBatch();
  process.exit(0);
});