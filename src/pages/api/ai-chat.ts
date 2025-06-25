// src/pages/api/ai-chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';

let GoogleGenerativeAI: any;
try {
  GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
} catch (error) {
  console.error('Failed to import GoogleGenerativeAI:', error);
}

const API_KEY = process.env.GOOGLE_API_KEY;

// Add a simple GET handler for testing
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Test with GET first
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'AI Chat API is running',
      hasApiKey: !!API_KEY,
      hasGoogleAI: !!GoogleGenerativeAI
    });
  }

  // Only allow POST requests for actual chat
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('AI Chat API called');
  
  try {
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

    const { message, history } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
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