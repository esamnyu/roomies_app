// src/lib/types.ts

export interface Profile {
  id: string;
  name: string;
  avatar_url?: string | null; // This line has been updated
  created_at: string;
  updated_at: string;
  email?: string;
  vacation_start_date?: string | null;
  vacation_end_date?: string | null;
}

export interface HouseRule {
  id: string;
  category: string;
  content: string;
  templateId?: string;
}

export interface Household {
  id:string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  core_chores?: string[];
  chore_frequency?: 'Daily' | 'Weekly' | 'Bi-weekly' | 'Monthly';
  chore_framework?: 'Split' | 'One person army';
  join_code?: string | null;
  last_chore_rotation_date?: string | null;
  next_chore_rotation_date?: string | null;
  chore_current_assignee_index?: number;
  rules?: HouseRule[];
  rules_last_updated?: string | null;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profiles?: Profile;
  households?: Household;
  chore_rotation_order?: number;
}

export interface Expense {
  id: string
  household_id: string
  description: string
  amount: number
  paid_by: string
  date: string
  created_at: string
  updated_at: string
  version?: number
  profiles?: Profile
  expense_splits?: ExpenseSplit[]
}

// --- NEW: This interface was missing ---
export interface ExpenseSplitAdjustment {
  id: string;
  expense_split_id: string;
  adjustment_amount: number;
  reason: string | null;
  created_at: string;
  created_by: string;
  profiles?: Profile; // For the creator of the adjustment
}

// --- MODIFIED: Added adjustments array ---
export interface ExpenseSplit {
  id: string
  expense_id: string
  user_id: string
  amount: number
  settled: boolean
  settled_at?: string
  profiles?: Profile
  expense_split_adjustments?: ExpenseSplitAdjustment[]; // This is the new property
}

// --- NEW: This interface was missing and caused the error ---
export interface UpdateExpensePayload {
  description: string;
  amount: number;
  splits: Array<{ user_id: string; amount: number }>;
  paid_by: string;
  date: string;
}

export interface Task {
  id: string
  household_id: string
  title: string
  assigned_to?: string
  completed: boolean
  completed_at?: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Settlement {
  id: string
  household_id: string
  payer_id: string
  payee_id: string
  amount: number
  description?: string
  created_at: string
  payer_profile?: Profile
  payee_profile?: Profile
}

// Added the missing SettlementSuggestion interface
export interface SettlementSuggestion {
    from: string;
    to: string;
    amount: number;
    fromProfile?: Profile | null;
    toProfile?: Profile | null;
}

export interface RecurringExpense {
  id: string
  household_id: string
  description: string
  amount: number
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  day_of_month?: number
  day_of_week?: number
  next_due_date: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string;
  user_id: string;
  household_id: string | null;
  type: 'expense_added' | 'payment_reminder' | 'task_assigned' | 'task_completed' | 'settlement_recorded' | 'recurring_expense_added' | 'member_joined' | 'member_left' | 'household_invitation' | 'message_sent' | 'chore_assigned' | 'chore_reminder' | 'chore_completed' | 'chore_missed' | 'chore_snoozed' | 'chores_swapped' | 'chore_delegated' | 'chores_assigned';
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string
  household_id: string
  user_id: string
  content: string
  edited: boolean
  deleted: boolean
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface MessageWithProfileRPC {
  id: string
  household_id: string
  user_id: string
  content: string
  edited: boolean
  deleted: boolean
  created_at: string
  updated_at: string
  profile: Profile;
}

export interface HouseholdChore {
  id: string;
  household_id: string;
  name: string;
  description?: string | null;
  is_core_chore: boolean;
  default_order?: number | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ChoreAssignment {
  id: string;
  household_chore_id: string;
  household_id: string;
  assigned_user_id: string;
  cycle_start_date: string;
  due_date: string;
  status: 'pending' | 'completed' | 'missed' | 'skipped';
  completed_at?: string | null;
  completed_by_user_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  chore_definition?: HouseholdChore;
  assigned_profile?: Profile | null;
}

export interface ChoreRotationPeriod {
  period_label: string;
  assignments: Array<{
    chore_name: string;
    assigned_member_name: string | 'Placeholder';
    chore_id: string;
    assigned_user_id: string | null;
  }>;
}

export interface CreateHouseholdParams {
  name: string;
  member_count: number;
  core_chores?: string[];
  chore_frequency?: string;
  chore_framework?: string;
}
