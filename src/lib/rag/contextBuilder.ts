import { createClient } from '@supabase/supabase-js';
import { RAGContext, IntentClassification } from './types';
// import { Database } from '@/lib/types/supabase';

export class ContextBuilder {
  private supabase;
  
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  async buildExpenseContext(householdId: string, entities: IntentClassification['entities']): Promise<RAGContext> {
    const { data: recentExpenses } = await this.supabase
      .from('expenses')
      .select(`
        id,
        description,
        amount,
        date,
        paid_by,
        expense_splits (
          user_id,
          amount,
          profiles (name)
        ),
        profiles!paid_by (name)
      `)
      .eq('household_id', householdId)
      .order('date', { ascending: false })
      .limit(10);
    
    const { data: balances } = await this.supabase
      .rpc('get_household_balances_fast', { p_household_id: householdId });
    
    let content = "Recent expenses:\n";
    recentExpenses?.forEach(expense => {
      content += `- ${expense.description}: $${expense.amount} paid by ${(expense as any).profiles?.name} on ${expense.date}\n`;
      if (expense.expense_splits?.length) {
        content += `  Split: ${expense.expense_splits.map((s: any) => `${s.profiles?.name}: $${s.amount}`).join(', ')}\n`;
      }
    });
    
    if (balances?.length) {
      content += "\nCurrent balances:\n";
      balances.forEach((b: any) => {
        const userName = b.profile?.name || 'Unknown';
        if (b.balance > 0) {
          content += `- ${userName} is owed: $${b.balance}\n`;
        } else if (b.balance < 0) {
          content += `- ${userName} owes: $${Math.abs(b.balance)}\n`;
        }
      });
    }
    
    return {
      type: 'expense',
      content,
      metadata: {
        household_id: householdId,
        timestamp: new Date().toISOString()
      },
      tokens: Math.ceil(content.split(' ').length * 1.3) // Rough token estimate
    };
  }
  
  async buildChoreContext(householdId: string, entities: IntentClassification['entities']): Promise<RAGContext> {
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const { data: assignments } = await this.supabase
      .from('chore_assignments')
      .select(`
        *,
        household_chores (name, description),
        profiles (name)
      `)
      .eq('household_id', householdId)
      .gte('date', weekStart.toISOString())
      .lt('date', weekEnd.toISOString())
      .order('date');
    
    let content = "This week's chore schedule:\n";
    const groupedByDate = assignments?.reduce((acc, assignment) => {
      const date = new Date(assignment.date).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(assignment);
      return acc;
    }, {} as Record<string, typeof assignments>);
    
    Object.entries(groupedByDate || {}).forEach(([date, chores]) => {
      content += `\n${date}:\n`;
      (chores as any[]).forEach((chore: any) => {
        content += `- ${chore.household_chores?.name}: ${chore.profiles?.name} (${chore.status})\n`;
      });
    });
    
    return {
      type: 'chore',
      content,
      metadata: {
        household_id: householdId,
        timestamp: new Date().toISOString()
      },
      tokens: Math.ceil(content.split(' ').length * 1.3)
    };
  }
  
  async buildHouseholdInfoContext(householdId: string): Promise<RAGContext> {
    const { data: household } = await this.supabase
      .from('households')
      .select(`
        *,
        household_members (
          role,
          profiles (name, id)
        )
      `)
      .eq('id', householdId)
      .single();
    
    let content = `Household: ${household?.name}\n`;
    content += `Join code: ${household?.join_code}\n\n`;
    
    if (household?.rules) {
      content += `House rules:\n${household.rules}\n\n`;
    }
    
    content += "Members:\n";
    household?.household_members?.forEach((member: any) => {
      content += `- ${member.profiles?.name} (${member.role})\n`;
    });
    
    // Add any custom household info from metadata
    if (household?.chore_reset_day) {
      content += `\nChores reset every: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][household.chore_reset_day]}\n`;
    }
    
    return {
      type: 'info',
      content,
      metadata: {
        household_id: householdId,
        timestamp: new Date().toISOString()
      },
      tokens: Math.ceil(content.split(' ').length * 1.3)
    };
  }
  
  async getSystemContext(): Promise<RAGContext> {
    const now = new Date();
    const content = `Current date/time: ${now.toLocaleString()}\nDay of week: ${now.toLocaleDateString('en-US', { weekday: 'long' })}`;
    
    return {
      type: 'system',
      content,
      metadata: {
        household_id: 'system',
        timestamp: now.toISOString()
      },
      tokens: 20
    };
  }
}