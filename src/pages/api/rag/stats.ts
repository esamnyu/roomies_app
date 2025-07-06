import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { intelligentEmbeddingService } from '@/lib/services/intelligentEmbeddingService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const { householdId } = req.body;

    // Get embedding statistics
    const stats = await intelligentEmbeddingService.getEmbeddingStats(householdId);

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching RAG stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}