const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDatabaseContextAsJson() {
  try {
    // A single RPC call to get all schema information
    const { data, error } = await supabase.rpc('get_database_schema_json');
    if (error) throw error;

    // Define the output file path
    const filePath = path.join( 'supabase_context.json');
    
    // Write the JSON data to a file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log(`Database context has been saved to ${filePath}`);

  } catch (error) {
    console.error('Error fetching database context:', error);
  }
}

getDatabaseContextAsJson();