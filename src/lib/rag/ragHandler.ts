import { IntentClassifier } from './intentClassifier';
import { ContextBuilder } from './contextBuilder';
import { RAGRequest, RAGResponse, RAGContext } from './types';

export class RAGHandler {
  private intentClassifier: IntentClassifier;
  private contextBuilder: ContextBuilder;
  private maxContextTokens = 1000;
  
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.intentClassifier = new IntentClassifier();
    this.contextBuilder = new ContextBuilder(supabaseUrl, supabaseKey);
  }
  
  async processQuery(request: RAGRequest): Promise<RAGResponse> {
    // 1. Classify intent
    const intent = this.intentClassifier.classify(request.query);
    
    // 2. Build relevant contexts based on intent
    const contexts: RAGContext[] = [];
    let totalTokens = 0;
    const maxTokens = request.max_context_tokens || this.maxContextTokens;
    
    // Always add system context
    const systemContext = await this.contextBuilder.getSystemContext();
    contexts.push(systemContext);
    totalTokens += systemContext.tokens;
    
    // Add context based on primary intent
    switch (intent.primary_intent) {
      case 'expense_query':
        const expenseContext = await this.contextBuilder.buildExpenseContext(
          request.household_id,
          intent.entities
        );
        if (totalTokens + expenseContext.tokens <= maxTokens) {
          contexts.push(expenseContext);
          totalTokens += expenseContext.tokens;
        }
        break;
        
      case 'chore_query':
        const choreContext = await this.contextBuilder.buildChoreContext(
          request.household_id,
          intent.entities
        );
        if (totalTokens + choreContext.tokens <= maxTokens) {
          contexts.push(choreContext);
          totalTokens += choreContext.tokens;
        }
        break;
        
      case 'household_info':
        const infoContext = await this.contextBuilder.buildHouseholdInfoContext(
          request.household_id
        );
        if (totalTokens + infoContext.tokens <= maxTokens) {
          contexts.push(infoContext);
          totalTokens += infoContext.tokens;
        }
        break;
    }
    
    // Add supplementary contexts if space allows
    if (intent.confidence < 0.7 || intent.primary_intent === 'general_advice') {
      // Low confidence or general query - add multiple context types
      const supplementaryContexts = await Promise.all([
        this.contextBuilder.buildExpenseContext(request.household_id, intent.entities),
        this.contextBuilder.buildChoreContext(request.household_id, intent.entities),
        this.contextBuilder.buildHouseholdInfoContext(request.household_id)
      ]);
      
      for (const ctx of supplementaryContexts) {
        if (totalTokens + ctx.tokens <= maxTokens && !contexts.some(c => c.type === ctx.type)) {
          contexts.push(ctx);
          totalTokens += ctx.tokens;
        }
      }
    }
    
    return {
      contexts,
      total_tokens: totalTokens
    };
  }
  
  formatContextForPrompt(contexts: RAGContext[]): string {
    let formattedContext = "=== HOUSEHOLD CONTEXT ===\n\n";
    
    contexts.forEach(ctx => {
      switch (ctx.type) {
        case 'system':
          formattedContext += "SYSTEM INFO:\n" + ctx.content + "\n\n";
          break;
        case 'expense':
          formattedContext += "FINANCIAL DATA:\n" + ctx.content + "\n\n";
          break;
        case 'chore':
          formattedContext += "CHORE SCHEDULE:\n" + ctx.content + "\n\n";
          break;
        case 'info':
          formattedContext += "HOUSEHOLD INFORMATION:\n" + ctx.content + "\n\n";
          break;
      }
    });
    
    formattedContext += "=== END CONTEXT ===\n\n";
    return formattedContext;
  }
}