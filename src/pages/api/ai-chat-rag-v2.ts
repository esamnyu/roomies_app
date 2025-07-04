import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { IntentClassifier } from '@/lib/rag/intentClassifier';
import { geminiEmbeddingService, generateEmbeddingWithFallback } from '@/lib/services/geminiEmbeddingService';
import { intelligentEmbeddingService } from '@/lib/services/intelligentEmbeddingService';
import { promptSecurity } from '@/lib/security/promptSecurity';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const intentClassifier = new IntentClassifier();

function formatContextForPrompt(context: any): string {
  let formattedContext = "=== HOUSEHOLD CONTEXT ===\n\n";
  
  // System context
  if (context.system) {
    formattedContext += `SYSTEM INFO:
Current Date: ${context.system.current_date}
Day: ${context.system.day_of_week}
Time: ${context.system.time}\n\n`;
  }
  
  // Expense context
  if (context.expense) {
    formattedContext += "FINANCIAL DATA:\n";
    
    if (context.expense.recent_expenses?.length > 0) {
      formattedContext += "Recent expenses:\n";
      context.expense.recent_expenses.forEach((exp: any) => {
        formattedContext += `- ${exp.description}: $${exp.amount} paid by ${exp.paid_by} on ${exp.date}\n`;
        if (exp.splits?.length > 0) {
          formattedContext += `  Split: ${exp.splits.map((s: any) => `${s.member}: $${s.amount}`).join(', ')}\n`;
        }
      });
    }
    
    if (context.expense.balances?.length > 0) {
      formattedContext += "\nCurrent balances:\n";
      context.expense.balances.forEach((b: any) => {
        if (b.direction === 'owes') {
          formattedContext += `- ${b.from} owes ${b.to}: $${b.amount}\n`;
        }
      });
    }
    
    if (context.expense.user_balance !== 0) {
      formattedContext += `\nYour balance: $${Math.abs(context.expense.user_balance)} ${context.expense.user_balance > 0 ? '(you are owed)' : '(you owe)'}\n`;
    }
    formattedContext += "\n";
  }
  
  // Chore context
  if (context.chore) {
    formattedContext += "CHORE SCHEDULE:\n";
    
    if (context.chore.user_chores?.length > 0) {
      formattedContext += "Your chores:\n";
      context.chore.user_chores.forEach((chore: any) => {
        formattedContext += `- ${chore.date}: ${chore.chore} (${chore.status})\n`;
      });
    }
    
    if (context.chore.all_assignments?.length > 0) {
      formattedContext += "\nAll assignments this week:\n";
      const groupedByDate = context.chore.all_assignments.reduce((acc: any, chore: any) => {
        if (!acc[chore.date]) acc[chore.date] = [];
        acc[chore.date].push(chore);
        return acc;
      }, {});
      
      Object.entries(groupedByDate).forEach(([date, chores]: [string, any]) => {
        formattedContext += `${date}:\n`;
        chores.forEach((chore: any) => {
          formattedContext += `  - ${chore.chore}: ${chore.assigned_to} (${chore.status})\n`;
        });
      });
    }
    
    if (context.chore.settings) {
      formattedContext += `\nChores reset: ${context.chore.settings.reset_day} at ${context.chore.settings.reset_time || 'midnight'}\n`;
    }
    formattedContext += "\n";
  }
  
  // Household info context
  if (context.info) {
    formattedContext += "HOUSEHOLD INFORMATION:\n";
    
    if (context.info.household) {
      const h = context.info.household;
      formattedContext += `Name: ${h.name}\n`;
      formattedContext += `Join code: ${h.join_code}\n`;
      if (h.rules) {
        formattedContext += `Rules: ${h.rules}\n`;
      }
    }
    
    if (context.info.members?.length > 0) {
      formattedContext += "\nMembers:\n";
      context.info.members.forEach((m: any) => {
        formattedContext += `- ${m.name} (${m.role})${m.is_current_user ? ' [YOU]' : ''}\n`;
      });
    }
    formattedContext += "\n";
  }
  
  // Vector search results - Similar conversations
  if (context.similar_conversations?.length > 0) {
    formattedContext += "SIMILAR PAST CONVERSATIONS:\n";
    context.similar_conversations.forEach((conv: any) => {
      formattedContext += `- ${conv.message_role}: "${conv.message_content}" (${Math.round(conv.similarity * 100)}% similar)\n`;
    });
    formattedContext += "\n";
  }
  
  // Vector search results - Similar expenses
  if (context.similar_expenses?.length > 0) {
    formattedContext += "SIMILAR EXPENSES:\n";
    context.similar_expenses.forEach((exp: any) => {
      formattedContext += `- ${exp.description}: $${exp.amount} (${Math.round(exp.similarity * 100)}% similar)\n`;
    });
    formattedContext += "\n";
  }
  
  formattedContext += "=== END CONTEXT ===\n";
  return formattedContext;
}

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

    const { message, householdId, conversationHistory = [] } = req.body;
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

    // Classify intent
    const intent = intentClassifier.classify(sanitizedMessage);
    const intentType = intent.primary_intent === 'expense_query' ? 'expense' :
                      intent.primary_intent === 'chore_query' ? 'chore' :
                      intent.primary_intent === 'household_info' ? 'info' : 'all';

    // Try to get context with embeddings first, fallback to text similarity
    let context;
    let contextError;
    let useVectorSearch = false;
    
    try {
      // First, check if we have a similar query with embedding already
      const { exists, embedding: cachedEmbedding } = await intelligentEmbeddingService
        .checkSimilarEmbeddingExists(sanitizedMessage, householdId, 0.95);
      
      let queryEmbedding = cachedEmbedding;
      
      if (!queryEmbedding) {
        // Generate embedding with intelligent fallback
        queryEmbedding = await generateEmbeddingWithFallback(sanitizedMessage, {
          maxRetries: 2,
          priority: true
        });
      }
      
      if (queryEmbedding) {
        // Get context with vector search
        const vectorResult = await supabase
          .rpc('get_rag_context_with_vectors', {
            p_household_id: householdId,
            p_user_id: user.id,
            p_intent: intentType,
            p_options: {
              expense_limit: 10,
              days_ahead: 7,
              vector_limit: 5,
              vector_threshold: 0.7
            },
            p_query_embedding: queryEmbedding
          });
        
        context = vectorResult.data;
        contextError = vectorResult.error;
        useVectorSearch = !contextError;
      }
      
    } catch (embeddingError) {
      console.warn('Embedding generation failed, falling back to text search:', embeddingError);
    }
    
    // Fallback to text similarity if vector search fails
    if (!useVectorSearch) {
      const textResult = await supabase
        .rpc('get_rag_context_with_similarity', {
          p_household_id: householdId,
          p_user_id: user.id,
          p_intent: intentType,
          p_options: {
            expense_limit: 10,
            days_ahead: 7
          },
          p_query: sanitizedMessage
        });
      
      context = textResult.data;
      contextError = textResult.error;
    }

    if (contextError) {
      console.error('Context retrieval error:', contextError);
      return res.status(403).json({ error: contextError.message });
    }

    // Format context for Gemini
    const contextPrompt = formatContextForPrompt(context);
    
    // Calculate approximate token usage
    const contextTokens = Math.ceil(contextPrompt.split(/\s+/).length * 1.3);

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

      // Store conversation with intelligent embedding
      Promise.all([
        intelligentEmbeddingService.storeConversationWithEmbedding(
          householdId,
          user.id,
          'user',
          sanitizedMessage,
          { priority: 'high', processImmediately: true }
        ),
        intelligentEmbeddingService.storeConversationWithEmbedding(
          householdId,
          user.id,
          'assistant',
          response,
          { priority: 'normal', processImmediately: false }
        )
      ]).catch(err => console.error('Error storing conversation:', err));
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - Gemini API took too long to respond');
      }
      throw error;
    }

    res.status(200).json({ 
      response,
      debug: {
        context_tokens: contextTokens,
        intent: intentType,
        confidence: intent.confidence,
        vector_search_used: useVectorSearch
      }
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}