// Script to generate embeddings for existing expenses
// Run with: npx tsx src/scripts/migrateExistingData.ts

import { createClient } from '@supabase/supabase-js';
import { geminiEmbeddingService } from '../lib/services/geminiEmbeddingService';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function migrateExpenses() {
  console.log('Starting expense embedding migration...');
  
  let processedCount = 0;
  let errorCount = 0;
  let offset = 0;
  const batchSize = 50;

  while (true) {
    // Get batch of expenses
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('id, household_id, description')
      .range(offset, offset + batchSize - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
      break;
    }

    if (!expenses || expenses.length === 0) {
      console.log('No more expenses to process');
      break;
    }

    console.log(`Processing batch of ${expenses.length} expenses...`);

    // Process in smaller sub-batches to avoid rate limits
    const subBatchSize = 5;
    for (let i = 0; i < expenses.length; i += subBatchSize) {
      const subBatch = expenses.slice(i, i + subBatchSize);
      
      try {
        // Generate embeddings
        const descriptions = subBatch.map(e => e.description);
        const embeddings = await geminiEmbeddingService.generateBatchEmbeddings(descriptions);
        
        // Store embeddings
        const embeddingRecords = subBatch.map((expense, idx) => ({
          expense_id: expense.id,
          household_id: expense.household_id,
          description: expense.description,
          embedding: embeddings[idx]
        }));
        
        const { error: insertError } = await supabase
          .from('expense_embeddings')
          .insert(embeddingRecords);
        
        if (insertError) {
          console.error('Error inserting embeddings:', insertError);
          errorCount += subBatch.length;
        } else {
          processedCount += subBatch.length;
          console.log(`Processed ${processedCount} expenses so far...`);
        }
        
        // Rate limit: wait 1 second between sub-batches
        await sleep(1000);
        
      } catch (error) {
        console.error('Error processing sub-batch:', error);
        errorCount += subBatch.length;
      }
    }

    offset += batchSize;
  }

  console.log('\nMigration completed!');
  console.log(`Total processed: ${processedCount}`);
  console.log(`Total errors: ${errorCount}`);
}

async function migrateHouseholdRules() {
  console.log('\nStarting household rules migration...');
  
  const { data: households, error } = await supabase
    .from('households')
    .select('id, rules')
    .not('rules', 'is', null);

  if (error) {
    console.error('Error fetching households:', error);
    return;
  }

  console.log(`Found ${households?.length || 0} households with rules`);

  for (const household of households || []) {
    try {
      const rulesText = Array.isArray(household.rules) 
        ? household.rules.map((r: any) => r.content).join(' ')
        : household.rules;
      
      const embedding = await geminiEmbeddingService.generateEmbedding(rulesText);
      
      await supabase.from('household_context_embeddings').insert({
        household_id: household.id,
        context_type: 'rules',
        content: rulesText,
        embedding: embedding
      });
      
      console.log(`Processed rules for household ${household.id}`);
      await sleep(1000); // Rate limit
      
    } catch (error) {
      console.error(`Error processing household ${household.id}:`, error);
    }
  }
}

async function main() {
  console.log('Starting data migration...\n');
  
  // Migrate expenses
  await migrateExpenses();
  
  // Migrate household rules
  await migrateHouseholdRules();
  
  console.log('\nAll migrations completed!');
  process.exit(0);
}

main().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});