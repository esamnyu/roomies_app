// Core type definitions for the Roomies application

// User and Profile types
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

export interface Profile {
  profile_id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

// Household types
export interface Household {
  household_id: string;
  household_name: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  join_code?: string;
  currency?: string;
  timezone?: string;
}

export interface HouseholdMember {
  household_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profiles?: Profile;
}

// Expense types
export interface Expense {
  expense_id: string;
  household_id: string;
  paid_by: string;
  amount: number;
  description: string;
  expense_date: string;
  created_at: string;
  updated_at?: string;
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  category?: string;
  receipt_url?: string;
  notes?: string;
  is_settled: boolean;
  settled_at?: string;
  profiles?: Profile;
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  end_date?: string;
  day_of_week?: number;
  day_of_month?: number;
}

export interface ExpenseSplit {
  split_id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  is_settled: boolean;
  settled_at?: string;
  created_at: string;
  profiles?: Profile;
}

// Settlement types
export interface Settlement {
  settlement_id: string;
  household_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  notes?: string;
  created_at: string;
  created_by: string;
  from_profile?: Profile;
  to_profile?: Profile;
}

// Ledger types
export interface LedgerEntry {
  entry_id: string;
  user_id: string;
  amount: number;
  entry_type: 'debit' | 'credit';
  transaction_type: 'expense' | 'settlement' | 'reversal';
  description: string;
  created_at: string;
  reference_id: string;
  reference_table: 'expenses' | 'settlements';
  metadata: LedgerMetadata;
}

export interface LedgerMetadata {
  expense_id?: string;
  settlement_id?: string;
  paid_by?: string;
  split_with?: string[];
  reversal_reason?: string;
  original_entry_id?: string;
  notes?: string;
}

export interface BalanceWithHistory {
  currentBalance: number;
  entries: LedgerEntry[];
}

// Chore types
export interface Chore {
  chore_id: string;
  household_id: string;
  chore_name: string;
  description?: string;
  frequency: ChoreFrequency;
  assigned_to?: string;
  due_date?: string;
  is_completed: boolean;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
  created_by: string;
  recurring_pattern?: RecurringPattern;
  profiles?: Profile;
}

export type ChoreFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface RecurringPattern {
  type: ChoreFrequency;
  interval?: number;
  days_of_week?: number[];
  day_of_month?: number;
  end_date?: string;
}

export interface ChoreCompletion {
  completion_id: string;
  chore_id: string;
  completed_by: string;
  completed_at: string;
  notes?: string;
  profiles?: Profile;
}

// Notification types
export interface Notification {
  notification_id: string;
  household_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  action_url?: string;
  metadata?: NotificationMetadata;
}

export type NotificationType = 
  | 'expense_added'
  | 'expense_settled'
  | 'settlement_received'
  | 'chore_assigned'
  | 'chore_overdue'
  | 'member_joined'
  | 'member_left'
  | 'system';

export interface NotificationMetadata {
  expense_id?: string;
  settlement_id?: string;
  chore_id?: string;
  user_id?: string;
  amount?: number;
  [key: string]: string | number | boolean | undefined;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'error' | 'system';
  content: string;
  timestamp: Date;
  metadata?: ChatMetadata;
}

export interface ChatMetadata {
  error?: string;
  context?: string;
  sources?: string[];
  confidence?: number;
}

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  context: ChatContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatContext {
  householdId?: string;
  userId?: string;
  topics?: string[];
  preferences?: Record<string, string>;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Form types
export interface ExpenseFormData {
  amount: string;
  description: string;
  paid_by: string;
  expense_date: string;
  split_with: string[];
  split_type: 'equal' | 'custom' | 'percentage';
  custom_splits?: Record<string, number>;
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  category?: string;
  notes?: string;
}

export interface ChoreFormData {
  chore_name: string;
  description?: string;
  assigned_to?: string;
  due_date?: string;
  frequency: ChoreFrequency;
  recurring_pattern?: RecurringPattern;
}

export interface SettlementFormData {
  from_user_id: string;
  to_user_id: string;
  amount: string;
  notes?: string;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type Nullable<T> = T | null;

export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : never;

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'>;
        Update: Partial<Profile>;
      };
      households: {
        Row: Household;
        Insert: Omit<Household, 'household_id' | 'created_at'>;
        Update: Partial<Household>;
      };
      household_members: {
        Row: HouseholdMember;
        Insert: Omit<HouseholdMember, 'joined_at'>;
        Update: Partial<HouseholdMember>;
      };
      expenses: {
        Row: Expense;
        Insert: Omit<Expense, 'expense_id' | 'created_at'>;
        Update: Partial<Expense>;
      };
      expense_splits: {
        Row: ExpenseSplit;
        Insert: Omit<ExpenseSplit, 'split_id' | 'created_at'>;
        Update: Partial<ExpenseSplit>;
      };
      settlements: {
        Row: Settlement;
        Insert: Omit<Settlement, 'settlement_id' | 'created_at'>;
        Update: Partial<Settlement>;
      };
      ledger_entries: {
        Row: LedgerEntry;
        Insert: Omit<LedgerEntry, 'entry_id' | 'created_at'>;
        Update: Partial<LedgerEntry>;
      };
      chores: {
        Row: Chore;
        Insert: Omit<Chore, 'chore_id' | 'created_at'>;
        Update: Partial<Chore>;
      };
      chore_completions: {
        Row: ChoreCompletion;
        Insert: Omit<ChoreCompletion, 'completion_id'>;
        Update: Partial<ChoreCompletion>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'notification_id' | 'created_at'>;
        Update: Partial<Notification>;
      };
    };
  };
}