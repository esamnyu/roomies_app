// src/lib/api/auth/middleware.ts
import { supabase } from '@/lib/supabase';
import { AuthorizationError, AuthenticationError, withErrorHandling } from '@/lib/errors';

export async function requireAuth() {
  return withErrorHandling(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new AuthenticationError('Authentication required');
    }
    return user;
  }, 'requireAuth');
}

export async function requireHouseholdMember(householdId: string, userId?: string) {
  return withErrorHandling(async () => {
    const user = userId || (await requireAuth()).id;
    
    const { data, error } = await supabase
      .from('household_members')
      .select('id, role')
      .eq('household_id', householdId)
      .eq('user_id', user)
      .single();
      
    if (error || !data) {
      throw new AuthorizationError('Not a member of this household');
    }
    
    return { userId: user, memberRole: data.role, memberId: data.id };
  }, 'requireHouseholdMember');
}

export async function requireHouseholdAdmin(householdId: string) {
  return withErrorHandling(async () => {
    const { userId, memberRole } = await requireHouseholdMember(householdId);
    
    if (memberRole !== 'admin') {
      throw new AuthorizationError('Admin privileges required');
    }
    
    return { userId, isAdmin: true };
  }, 'requireHouseholdAdmin');
}

// Check if user can modify an expense
export async function requireExpenseAccess(expenseId: string, userId?: string) {
  return withErrorHandling(async () => {
    const user = userId || (await requireAuth()).id;
    
    const { data: expense, error } = await supabase
      .from('expenses')
      .select('household_id, paid_by')
      .eq('id', expenseId)
      .single();
      
    if (error || !expense) {
      throw new AuthorizationError('Expense not found');
    }
    
    // Check if user is a member of the household
    await requireHouseholdMember(expense.household_id, user);
    
    return { 
      canEdit: expense.paid_by === user,
      householdId: expense.household_id 
    };
  }, 'requireExpenseAccess');
}