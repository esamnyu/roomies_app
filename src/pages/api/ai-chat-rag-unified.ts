import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { unifiedRAGHandler } from '@/lib/rag/unifiedRagHandler';
import { intelligentEmbeddingService } from '@/lib/services/intelligentEmbeddingService';
import { promptSecurity } from '@/lib/security/promptSecurity';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize unified RAG handler
const ragHandler = unifiedRAGHandler(
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

    const { 
      message, 
      householdId, 
      conversationHistory = [],
      options = {} 
    } = req.body;
    
    if (!message || !householdId) {
      return res.status(400).json({ error: 'Message and householdId are required' });
    }

    // Security check on user input
    const securityCheck = await promptSecurity.checkInput(message, user.id);
    if (!securityCheck.safe) {
      return res.status(400).json({ 
        error: securityCheck.reason || 'Invalid input',
        category: securityCheck.category 
      });
    }

    // Use sanitized input
    const sanitizedMessage = securityCheck.sanitizedInput || message;

    // Process query through unified RAG handler
    const ragResponse = await ragHandler.processQuery({
      query: sanitizedMessage,
      household_id: householdId,
      user_id: user.id,
      max_context_tokens: options.maxContextTokens || 1000
    }, {
      useHybridSearch: options.useHybridSearch !== false, // Default true
      similarityThreshold: options.similarityThreshold || 0.7,
      daysBack: options.daysBack || 30,
      includeMetadata: true,
      trackPerformance: true
    });

    // Format context for Gemini
    const contextPrompt = ragHandler.formatContextForPrompt(ragResponse.contexts);
    
    // Limit conversation history to prevent manipulation
    const safeHistory = conversationHistory.slice(-3).map((m: any) => ({
      role: m.role,
      content: m.content.substring(0, 200) // Limit each message length
    }));

    // Build the safe prompt using our security service
    const enhancedPrompt = promptSecurity.createSafePrompt(
      sanitizedMessage,
      contextPrompt,
      safeHistory
    );

    // Generate response with Gemini
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      }
    });

    // Add timeout for Gemini API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    let response: string;
    try {
      const result = await model.generateContent(enhancedPrompt);
      clearTimeout(timeoutId);
      response = result.response.text();

      // Validate and filter the response
      const validationResult = promptSecurity.validateResponse(response);
      if (!validationResult.valid || validationResult.filteredResponse) {
        response = validationResult.filteredResponse || 'I apologize, but I cannot provide that information.';
      }

      // Store conversation with intelligent embedding in parallel
      const storePromises = [
        intelligentEmbeddingService.storeEmbedding(
          householdId,
          sanitizedMessage,
          {
            entityType: 'conversation',
            priority: 'high',
            processImmediately: true,
            metadata: {
              userId: user.id,
              message_role: 'user'
            }
          }
        ),
        intelligentEmbeddingService.storeEmbedding(
          householdId,
          response,
          {
            entityType: 'conversation',
            priority: 'normal',
            processImmediately: false,
            metadata: {
              userId: user.id,
              message_role: 'assistant'
            }
          }
        )
      ];
      
      // Don't wait for storage to complete
      Promise.all(storePromises).catch(err => 
        console.error('Error storing conversation:', err)
      );

    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - Gemini API took too long to respond');
      }
      throw error;
    }

    // Prepare response with debug info if requested
    const responseData: any = { response };
    
    if (options.includeDebug) {
      responseData.debug = {
        context_tokens: ragResponse.total_tokens,
        performance: ragResponse.performanceMetrics,
        rag_contexts: ragResponse.contexts.map(ctx => ({
          type: ctx.type,
          tokens: ctx.tokens
        }))
      };
    }

    res.status(200).json(responseData);

  } catch (error) {
    console.error('AI Chat error:', error);
    
    // Provide more detailed error in development
    if (process.env.NODE_ENV === 'development') {
      res.status(500).json({ 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } else {
      res.status(500).json({ error: 'Failed to process request' });
    }
  }
}

// Export config for larger payloads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};