import { IntentClassification } from './types';

export class IntentClassifier {
  private expenseKeywords = ['owe', 'paid', 'expense', 'rent', 'bill', 'grocery', 'utilities', 'settle', 'split'];
  private choreKeywords = ['chore', 'clean', 'trash', 'dishes', 'vacuum', 'kitchen', 'bathroom', 'schedule'];
  private infoKeywords = ['wifi', 'password', 'address', 'rule', 'contact', 'emergency', 'preference'];
  
  classify(query: string): IntentClassification {
    const normalizedQuery = query.toLowerCase();
    const words = normalizedQuery.split(/\s+/);
    
    // Count keyword matches
    const expenseScore = this.calculateScore(words, this.expenseKeywords);
    const choreScore = this.calculateScore(words, this.choreKeywords);
    const infoScore = this.calculateScore(words, this.infoKeywords);
    
    // Extract entities
    const entities = {
      person_names: this.extractPersonNames(query),
      time_references: this.extractTimeReferences(normalizedQuery),
      expense_types: this.extractExpenseTypes(words),
      chore_types: this.extractChoreTypes(words)
    };
    
    // Determine primary intent
    const scores = {
      expense_query: expenseScore,
      chore_query: choreScore,
      household_info: infoScore,
      general_advice: 0.1 // Default fallback
    };
    
    const primary_intent = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)[0][0] as IntentClassification['primary_intent'];
    
    return {
      primary_intent,
      entities,
      confidence: Math.max(...Object.values(scores))
    };
  }
  
  private calculateScore(words: string[], keywords: string[]): number {
    const matches = words.filter(word => 
      keywords.some(keyword => word.includes(keyword))
    ).length;
    
    return Math.min(matches / words.length, 1);
  }
  
  private extractPersonNames(query: string): string[] {
    // Simple regex for capitalized words (can be enhanced with NER)
    const names = query.match(/\b[A-Z][a-z]+\b/g) || [];
    return [...new Set(names)];
  }
  
  private extractTimeReferences(query: string): string[] {
    const patterns = [
      /\b(today|yesterday|tomorrow|last\s+\w+|next\s+\w+)\b/gi,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g
    ];
    
    const matches: string[] = [];
    patterns.forEach(pattern => {
      const found = query.match(pattern);
      if (found) matches.push(...found);
    });
    
    return matches;
  }
  
  private extractExpenseTypes(words: string[]): string[] {
    const types = ['rent', 'groceries', 'utilities', 'internet', 'gas', 'electric'];
    return words.filter(word => types.includes(word));
  }
  
  private extractChoreTypes(words: string[]): string[] {
    const types = ['dishes', 'trash', 'vacuum', 'bathroom', 'kitchen', 'laundry'];
    return words.filter(word => types.includes(word));
  }
}