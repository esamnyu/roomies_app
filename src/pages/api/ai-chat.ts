// src/pages/api/ai-chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

let GoogleGenerativeAI: any;
try {
  GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
} catch (error) {
  console.error('Failed to import GoogleGenerativeAI:', error);
}

const API_KEY = process.env.GOOGLE_API_KEY;

// Input validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1).max(1000).trim(),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({
      text: z.string()
    }))
  })).optional()
});

// Rate limiting: Store request counts per user
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // 20 requests per hour per user
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = requestCounts.get(userId);
  
  if (!userRequests || now > userRequests.resetTime) {
    // Reset the counter
    requestCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userRequests.count >= RATE_LIMIT) {
    return false;
  }
  
  userRequests.count++;
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('AI Chat API called');
  
  try {
    // Authenticate the user
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    
    // Create a Supabase client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Verify the user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please wait before making more requests.',
        retryAfter: 3600 // seconds until rate limit resets
      });
    }

    // Validate request body
    const validationResult = chatRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const { message, history } = validationResult.data;

    if (!API_KEY) {
      console.error('API Key is missing');
      return res.status(500).json({
        error: 'AI service not configured. Please check your environment variables.'
      });
    }

    if (!GoogleGenerativeAI) {
      return res.status(500).json({
        error: 'Google Generative AI library not loaded'
      });
    }

    console.log('Initializing Gemini AI...');
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `You are 'AI Mate', a helpful assistant for roommates using the Roomies app. 
        Provide advice strictly related to shared living, roommate etiquette, conflict resolution, 
        managing shared expenses, and organizing chores. 
        If asked unrelated questions, politely decline.
        Keep responses under 200 words.`
    });

    const chat = model.startChat({
      history: history || [],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const responseText = response.text();
    
    console.log('Response generated successfully');
    
    return res.status(200).json({
      response: responseText,
      history: [...(history || []),
        { role: 'user', parts: [{ text: message }] },
        { role: 'model', parts: [{ text: responseText }] }
      ]
    });
    
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    
    if (error.message?.includes('API key')) {
      return res.status(500).json({
        error: 'Invalid API key. Please check your Gemini API key.'
      });
    }
    
    return res.status(500).json({
      error: `Failed to process message: ${error.message}`
    });
  }
}