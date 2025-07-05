export interface RAGContext {
  type: 'expense' | 'chore' | 'info' | 'rule' | 'system';
  content: string;
  metadata: {
    household_id: string;
    relevance_score?: number;
    timestamp?: string;
    entity_ids?: string[];
  };
  tokens: number;
}

export interface IntentClassification {
  primary_intent: 'expense_query' | 'chore_query' | 'household_info' | 'general_advice';
  entities: {
    person_names?: string[];
    time_references?: string[];
    expense_types?: string[];
    chore_types?: string[];
  };
  confidence: number;
  metadata?: {
    isOffTopic: boolean;
    isSafeGeneral: boolean;
    topicRelevance: number;
  };
}

export interface RAGRequest {
  query: string;
  household_id: string;
  user_id: string;
  max_context_tokens?: number;
}

export interface RAGResponse {
  contexts: RAGContext[];
  total_tokens: number;
  query_embedding?: number[];
}