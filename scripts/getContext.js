const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDatabaseContextAsJson() {
  try {
    const context = {
      tables: {},
      timestamp: new Date().toISOString()
    };

    // Query to get all tables and their columns
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.log('Falling back to direct table queries...');
      // Fallback: Try to get some known tables
      const knownTables = ['households', 'users', 'members', 'chores', 'household_rules', 'expenses'];
      
      for (const tableName of knownTables) {
        try {
          // Get a sample row to understand the structure
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (!error && data) {
            context.tables[tableName] = {
              sampleRow: data[0] || {},
              columns: data[0] ? Object.keys(data[0]) : []
            };
          }
        } catch (e) {
          console.log(`Table ${tableName} not found or accessible`);
        }
      }
    } else if (tablesData) {
      // For each table, get column information
      for (const table of tablesData) {
        const tableName = table.table_name;
        
        try {
          // Get a sample row to understand the structure
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (!error && data) {
            context.tables[tableName] = {
              sampleRow: data[0] || {},
              columns: data[0] ? Object.keys(data[0]) : []
            };
          }
        } catch (e) {
          console.log(`Could not access table ${tableName}`);
        }
      }
    }

    // Define the output file path
    const filePath = path.join('supabase_context.json');
    
    // Write the JSON data to a file
    fs.writeFileSync(filePath, JSON.stringify(context, null, 2));

    console.log(`Database context has been saved to ${filePath}`);
    console.log(`Found ${Object.keys(context.tables).length} tables`);

  } catch (error) {
    console.error('Error fetching database context:', error);
  }
}

getDatabaseContextAsJson();