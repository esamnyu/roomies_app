const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDatabaseContextAsJson() {
  try {
    // Query to get function signatures
    const { data: functionsData, error: functionsError } = await supabase
      .rpc('get_function_signatures', {});
    
    if (functionsError) {
      console.log('RPC function not available, trying direct query...');
      
      // Try a simpler approach - list available RPC functions
      const { data, error } = await supabase.rpc('get_functions_list', {});
      
      if (error) {
        console.log('No RPC functions available for schema inspection');
        // Save what we can
        const context = {
          error: 'Could not fetch complete database schema',
          message: 'The create_expense_atomic function likely has multiple overloaded versions',
          timestamp: new Date().toISOString()
        };
        
        const filePath = path.join('supabase_context.json');
        fs.writeFileSync(filePath, JSON.stringify(context, null, 2));
        console.log(`Limited context saved to ${filePath}`);
        return;
      }
    }

    const context = {
      functions: functionsData || [],
      timestamp: new Date().toISOString()
    };

    // Define the output file path
    const filePath = path.join('supabase_context.json');
    
    // Write the JSON data to a file
    fs.writeFileSync(filePath, JSON.stringify(context, null, 2));

    console.log(`Database context has been saved to ${filePath}`);

  } catch (error) {
    console.error('Error fetching database context:', error);
  }
}

getDatabaseContextAsJson();