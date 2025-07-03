import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { IntentClassifier } from '@/lib/rag/intentClassifier';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const intentClassifier = new IntentClassifier();

async function storeConversation(
  householdId: string,
  userId: string,
  userMessage: string,
  assistantResponse: string
) {
  try {
    // Store conversations for similarity search (no embeddings needed)
    await supabase.rpc('store_conversation', {
      p_household_id: householdId,
      p_user_id: userId,
      p_message_role: 'user',
      p_message_content: userMessage
    });

    await supabase.rpc('store_conversation', {
      p_household_id: householdId,
      p_user_id: userId,
      p_message_role: 'assistant',
      p_message_content: assistantResponse
    });
  } catch (error) {
    console.error('Error storing conversation:', error);
    // Don't fail the request if storage fails
  }
}

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

    // Classify intent
    const intent = intentClassifier.classify(message);
    const intentType = intent.primary_intent === 'expense_query' ? 'expense' :
                      intent.primary_intent === 'chore_query' ? 'chore' :
                      intent.primary_intent === 'household_info' ? 'info' : 'all';

    // Get context with text similarity search (no embeddings needed!)
    const { data: context, error: contextError } = await supabase
      .rpc('get_rag_context_with_similarity', {
        p_household_id: householdId,
        p_user_id: user.id,
        p_intent: intentType,
        p_options: {
          expense_limit: 10,
          days_ahead: 7
        },
        p_query: message  // Just pass the text query
      });

    if (contextError) {
      console.error('Context retrieval error:', contextError);
      return res.status(403).json({ error: contextError.message });
    }

    // Format context for Gemini
    const contextPrompt = formatContextForPrompt(context);
    
    // Calculate approximate token usage
    const contextTokens = Math.ceil(contextPrompt.split(/\s+/).length * 1.3);

    // Build the enhanced prompt
    const enhancedPrompt = `${contextPrompt}

You are an AI assistant for a co-living household. Use the context above to answer questions accurately. 
If the information needed is not in the context, say so clearly.
Be specific with names, amounts, and dates when available.

User question: ${message}

${conversationHistory.length > 0 ? `Previous conversation:
${conversationHistory.slice(-4).map((m: any) => `${m.role}: ${m.content}`).join('\n')}

` : ''}Provide a helpful, accurate response based on the household context provided.`;

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

      // Store conversation asynchronously (don't wait for completion)
      storeConversation(householdId, user.id, message, response);
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
        confidence: intent.confidence
      }
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}