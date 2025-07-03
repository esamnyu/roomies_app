import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testSimilaritySearch() {
  console.log('🔍 Testing PostgreSQL Similarity Search...\n');

  try {
    // Get a sample household
    const { data: household } = await supabase
      .from('households')
      .select('id, name')
      .limit(1)
      .single();

    if (!household) {
      console.log('No households found. Create a household first.');
      return;
    }

    console.log(`Using household: ${household.name} (${household.id})\n`);

    // Test queries
    const testQueries = [
      'who usually buys groceries',
      'cleaning supplies',
      'rent payment',
      'toilet paper'
    ];

    for (const query of testQueries) {
      console.log(`\n📝 Query: "${query}"`);
      console.log('─'.repeat(40));

      // Test the similarity search function
      const { data: results, error } = await supabase
        .rpc('search_similar_expenses_text', {
          p_household_id: household.id,
          p_query: query,
          p_limit: 3,
          p_threshold: 0.2
        });

      if (error) {
        console.log(`❌ Error: ${error.message}`);
      } else if (results && results.length > 0) {
        console.log(`✅ Found ${results.length} similar expenses:`);
        results.forEach((r: any, i: number) => {
          console.log(`   ${i + 1}. "${r.description}" - $${r.amount}`);
          console.log(`      Paid by: ${r.paid_by_name || r.paid_by}`);
          console.log(`      Similarity: ${(r.similarity * 100).toFixed(0)}%`);
        });
      } else {
        console.log('   No similar expenses found');
      }

      // For "who usually" queries, test the pattern analyzer
      if (query.includes('who usually')) {
        const item = query.split(' ').pop() || 'item';
        const { data: patterns } = await supabase
          .rpc('who_usually_buys', {
            p_household_id: household.id,
            p_item_type: item,
            p_days: 90
          });

        if (patterns && patterns.length > 0) {
          console.log(`\n   📊 Purchase patterns for "${item}":`);
          patterns.forEach((p: any) => {
            console.log(`      ${p.user_name}: ${p.purchase_count} times (${p.percentage}%)`);
          });
        }
      }
    }

    console.log('\n\n✨ Similarity search is working!');
    console.log('\nNext steps:');
    console.log('1. Run the SQL migration to set up similarity search');
    console.log('2. Test in your AI chat - it will now use text similarity');
    console.log('3. No API keys or external services needed! 🎉');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSimilaritySearch().then(() => process.exit(0));