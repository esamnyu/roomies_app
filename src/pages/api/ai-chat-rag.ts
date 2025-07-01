import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { RAGHandler } from '@/lib/rag/ragHandler';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ragHandler = new RAGHandler(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { message, householdId } = req.body;
    if (!message || !householdId) {
      return res.status(400).json({ error: 'Message and householdId are required' });
    }

    // Get user's profile to get correct ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Verify user belongs to household
    const { data: member } = await supabase
      .from('household_members')
      .select('user_id')
      .eq('user_id', profile.id)
      .eq('household_id', householdId)
      .single();

    if (!member) {
      return res.status(403).json({ error: 'User is not a member of this household' });
    }

    // Process query through RAG pipeline
    const ragResponse = await ragHandler.processQuery({
      query: message,
      household_id: householdId,
      user_id: user.id,
      max_context_tokens: 800 // Leave room for prompt and response
    });

    // Format context for Gemini
    const contextPrompt = ragHandler.formatContextForPrompt(ragResponse.contexts);
    
    // Build the enhanced prompt
    const enhancedPrompt = `${contextPrompt}

You are an AI assistant for a co-living household. Use the context above to answer questions accurately. 
If the information needed is not in the context, say so clearly.

User question: ${message}

Provide a helpful, accurate response based on the household context provided.`;

    // Generate response with Gemini
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: 'You are a helpful household assistant. Always be friendly and concise. Use the provided context to give accurate, specific answers about the household.'
    });

    const result = await model.generateContent(enhancedPrompt);
    const response = result.response.text();

    // Log token usage for monitoring
    console.log(`RAG Query processed: ${ragResponse.total_tokens} context tokens used`);

    res.status(200).json({ 
      response,
      debug: {
        context_tokens: ragResponse.total_tokens,
        context_types: ragResponse.contexts.map(c => c.type)
      }
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}