const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDatabaseContext() {
  try {
    console.log('Fetching database context...');
    
    const context = {
      tables: {},
      timestamp: new Date().toISOString()
    };

    // List of tables to fetch
    const tables = [
      'households',
      'household_members',
      'profiles',
      'expenses',
      'expense_splits',
      'household_chores',
      'chore_assignments',
      'messages',
      'notifications',
      'house_rules',
      'recurring_expenses'
    ];

    // Fetch sample data and count for each table
    for (const table of tables) {
      console.log(`Fetching ${table}...`);
      
      // Get count
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      // Get sample data (first 5 rows)
      const { data: sampleData, error: dataError } = await supabase
        .from(table)
        .select('*')
        .limit(5);
      
      context.tables[table] = {
        count: count || 0,
        sampleData: sampleData || [],
        error: countError || dataError || null
      };
    }

    // Define the output file path
    const filePath = path.join('supabase_context_simple.json');
    
    // Write the JSON data to a file
    fs.writeFileSync(filePath, JSON.stringify(context, null, 2));

    console.log(`\nDatabase context has been saved to ${filePath}`);
    console.log('\nSummary:');
    for (const [table, info] of Object.entries(context.tables)) {
      console.log(`- ${table}: ${info.count} rows`);
    }

  } catch (error) {
    console.error('Error fetching database context:', error);
  }
}

getDatabaseContext();