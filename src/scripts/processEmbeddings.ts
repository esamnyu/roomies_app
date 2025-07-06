import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function processEmbeddings() {
  console.log('🚀 Processing embeddings...\n');

  try {
    // For testing, we'll use the service role key directly
    // In production, you'd get a user token from your auth flow
    const response = await fetch('http://localhost:3000/api/process-embedding-queue', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Processing complete!');
      console.log(`   Processed: ${result.processed}`);
      console.log(`   Failed: ${result.failed}`);
      if (result.details?.processed?.length > 0) {
        console.log(`   Items processed: ${result.details.processed.join(', ')}`);
      }
    } else {
      console.error('❌ Processing failed:', result.error);
    }

    // Check queue status
    const { data: queueStats } = await supabase.rpc('get_embedding_queue_stats');
    if (queueStats?.[0]) {
      console.log('\n📊 Queue Status:');
      console.log(`   Remaining unprocessed: ${queueStats[0].unprocessed}`);
      console.log(`   Total processed: ${queueStats[0].processed}`);
      console.log(`   Failed: ${queueStats[0].failed}`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// For manual processing via CLI
if (require.main === module) {
  console.log('Note: Using service role key for authentication');
  console.log('In production, use a proper user authentication token\n');
  
  processEmbeddings().then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  });
}

export { processEmbeddings };