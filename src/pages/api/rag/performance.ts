import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { unifiedRAGHandler } from '@/lib/rag/unifiedRagHandler';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ragHandler = unifiedRAGHandler(
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
    const { householdId, days = 7 } = req.body;

    // Get performance insights
    const insights = await ragHandler.getPerformanceInsights(householdId, days);

    res.status(200).json(insights);
  } catch (error) {
    console.error('Error fetching performance insights:', error);
    res.status(500).json({ error: 'Failed to fetch performance insights' });
  }
}