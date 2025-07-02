const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getComprehensiveDatabaseContext() {
  try {
    console.log('Fetching comprehensive database context...');
    
    const context = {
      tables: {},
      relationships: [],
      timestamp: new Date().toISOString()
    };

    // Extended list of tables (including those that might exist)
    const tables = [
      // Core tables
      'households',
      'household_members',
      'profiles',
      
      // Expense related
      'expenses',
      'expense_splits',
      'expense_split_adjustments',
      'expense_payments',
      'recurring_expenses',
      'settlements',
      'ledger_balances',
      
      // Chore related
      'household_chores',
      'chore_assignments',
      'chore_swaps',
      
      // Communication
      'messages',
      'notifications',
      
      // Rules and settings
      'house_rules',
      
      // AI/RAG related
      'conversation_embeddings',
      'expense_embeddings',
      
      // Any other tables
      'tasks',
      'task_assignments'
    ];

    // Fetch data for each table
    for (const table of tables) {
      console.log(`Checking ${table}...`);
      
      try {
        // Get count
        const { count, error: countError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (countError && countError.code === '42P01') {
          // Table doesn't exist
          console.log(`  - Table '${table}' does not exist`);
          continue;
        }
        
        // Get sample data (first 3 rows)
        const { data: sampleData, error: dataError } = await supabase
          .from(table)
          .select('*')
          .limit(3);
        
        // Get one row to understand structure
        const { data: structureData } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        const structure = structureData && structureData[0] 
          ? Object.keys(structureData[0]).reduce((acc, key) => {
              acc[key] = typeof structureData[0][key];
              return acc;
            }, {})
          : {};
        
        context.tables[table] = {
          exists: true,
          count: count || 0,
          structure: structure,
          sampleData: sampleData || [],
          error: countError || dataError || null
        };
        
        console.log(`  ✓ ${table}: ${count || 0} rows`);
      } catch (error) {
        console.log(`  ✗ ${table}: ${error.message}`);
      }
    }

    // Add some known relationships
    context.relationships = [
      { from: 'household_members', to: 'households', via: 'household_id' },
      { from: 'household_members', to: 'profiles', via: 'user_id' },
      { from: 'expenses', to: 'households', via: 'household_id' },
      { from: 'expenses', to: 'profiles', via: 'paid_by' },
      { from: 'expense_splits', to: 'expenses', via: 'expense_id' },
      { from: 'expense_splits', to: 'profiles', via: 'user_id' },
      { from: 'household_chores', to: 'households', via: 'household_id' },
      { from: 'chore_assignments', to: 'household_chores', via: 'chore_id' },
      { from: 'chore_assignments', to: 'profiles', via: 'assigned_to' },
      { from: 'messages', to: 'households', via: 'household_id' },
      { from: 'messages', to: 'profiles', via: 'user_id' },
      { from: 'notifications', to: 'profiles', via: 'user_id' }
    ];

    // Define the output file path
    const filePath = path.join('supabase_context_comprehensive.json');
    
    // Write the JSON data to a file
    fs.writeFileSync(filePath, JSON.stringify(context, null, 2));

    console.log(`\nComprehensive database context has been saved to ${filePath}`);
    
    // Summary
    console.log('\nSummary of existing tables:');
    const existingTables = Object.entries(context.tables)
      .filter(([_, info]) => info.exists)
      .sort(([a], [b]) => a.localeCompare(b));
    
    for (const [table, info] of existingTables) {
      console.log(`- ${table}: ${info.count} rows`);
    }

  } catch (error) {
    console.error('Error fetching comprehensive database context:', error);
  }
}

getComprehensiveDatabaseContext();