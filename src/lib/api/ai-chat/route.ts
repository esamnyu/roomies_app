// app/api/ai-chat/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from 'next/server';

// Server-side only - no NEXT_PUBLIC prefix
const API_KEY = process.env.GOOGLE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const { message, history } = await request.json();
    
    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

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
    
    return NextResponse.json({ 
      response: response.text(),
      history: [...(history || []), 
        { role: 'user', parts: [{ text: message }] },
        { role: 'model', parts: [{ text: response.text() }] }
      ]
    });
    
  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}