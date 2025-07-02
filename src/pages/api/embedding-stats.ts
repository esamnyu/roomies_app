import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authorization
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // Get embedding statistics
    const stats = await Promise.all([
      supabase.from('conversation_embeddings').select('id', { count: 'exact', head: true }),
      supabase.from('expense_embeddings').select('id', { count: 'exact', head: true }),
      supabase.from('household_context_embeddings').select('id', { count: 'exact', head: true }),
      supabase.rpc('get_embedding_queue_stats')
    ]);

    const [conversations, expenses, contexts, queueStats] = stats;

    res.status(200).json({
      embeddings: {
        conversations: conversations.count || 0,
        expenses: expenses.count || 0,
        contexts: contexts.count || 0
      },
      queue: queueStats.data?.[0] || {
        total_queued: 0,
        unprocessed: 0,
        processed: 0,
        failed: 0
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}