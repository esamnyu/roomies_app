import { IntentClassification } from './types';

export class IntentClassifier {
  private expenseKeywords = ['owe', 'paid', 'expense', 'rent', 'bill', 'grocery', 'utilities', 'settle', 'split', 'balance', 'payment'];
  private choreKeywords = ['chore', 'clean', 'trash', 'dishes', 'vacuum', 'kitchen', 'bathroom', 'schedule', 'task', 'turn'];
  private infoKeywords = ['wifi', 'password', 'address', 'rule', 'contact', 'emergency', 'preference', 'member', 'household'];
  
  // Safety check keywords
  private safetyKeywords = {
    greeting: ['hello', 'hi', 'hey', 'good morning', 'good evening'],
    help: ['help', 'what can you do', 'features', 'how to'],
    thanks: ['thank', 'thanks', 'appreciate']
  };
  
  // Off-topic indicators
  private offTopicIndicators = [
    'weather', 'news', 'stock', 'crypto', 'politics', 'religion',
    'game', 'movie', 'music', 'recipe', 'travel', 'vacation'
  ];
  
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
    
    // Check for off-topic content
    const isOffTopic = this.checkOffTopic(words);
    
    // Check for safe general queries
    const isSafeGeneral = this.checkSafeGeneral(normalizedQuery);
    
    // Determine primary intent
    const scores = {
      expense_query: expenseScore,
      chore_query: choreScore,
      household_info: infoScore,
      general_advice: isSafeGeneral ? 0.5 : 0.1
    };
    
    // If off-topic, reduce confidence significantly
    if (isOffTopic && !isSafeGeneral) {
      Object.keys(scores).forEach(key => {
        scores[key as keyof typeof scores] *= 0.1;
      });
    }
    
    const primary_intent = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)[0][0] as IntentClassification['primary_intent'];
    
    return {
      primary_intent,
      entities,
      confidence: Math.max(...Object.values(scores)),
      metadata: {
        isOffTopic,
        isSafeGeneral,
        topicRelevance: this.calculateTopicRelevance(words)
      }
    };
  }
  
  private checkOffTopic(words: string[]): boolean {
    const offTopicCount = words.filter(word => 
      this.offTopicIndicators.some(indicator => word.includes(indicator))
    ).length;
    
    return offTopicCount >= 2 || (offTopicCount >= 1 && words.length <= 3);
  }
  
  private checkSafeGeneral(query: string): boolean {
    // Check if it's a greeting, help request, or thanks
    for (const [category, keywords] of Object.entries(this.safetyKeywords)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        return true;
      }
    }
    return false;
  }
  
  private calculateTopicRelevance(words: string[]): number {
    const allHouseholdKeywords = [
      ...this.expenseKeywords,
      ...this.choreKeywords,
      ...this.infoKeywords
    ];
    
    const relevantWords = words.filter(word => 
      allHouseholdKeywords.some(keyword => 
        word.includes(keyword) || keyword.includes(word)
      )
    );
    
    return relevantWords.length / Math.max(words.length, 1);
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