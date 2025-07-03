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
    let user = userId;
    if (!user) {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error || !authUser) {
        throw new AuthenticationError('Authentication required');
      }
      user = authUser.id;
    }
    
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new AuthenticationError('Authentication required');
    }
    
    const { data, error } = await supabase
      .from('household_members')
      .select('id, role')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .single();
      
    if (error || !data) {
      throw new AuthorizationError('Not a member of this household');
    }
    
    if (data.role !== 'admin') {
      throw new AuthorizationError('Admin privileges required');
    }
    
    return { userId: user.id, isAdmin: true };
  }, 'requireHouseholdAdmin');
}

// Check if user can modify an expense
export async function requireExpenseAccess(expenseId: string, userId?: string) {
  return withErrorHandling(async () => {
    let user = userId;
    if (!user) {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error || !authUser) {
        throw new AuthenticationError('Authentication required');
      }
      user = authUser.id;
    }
    
    const { data: expense, error } = await supabase
      .from('expenses')
      .select('household_id, paid_by')
      .eq('id', expenseId)
      .single();
      
    if (error || !expense) {
      throw new AuthorizationError('Expense not found');
    }
    
    // Check if user is a member of the household and get their role
    const memberInfo = await requireHouseholdMember(expense.household_id, user);
    
    // Allow edit if user is the payer OR if user is an admin
    const canEdit = expense.paid_by === user || memberInfo.memberRole === 'admin';
    
    return { 
      canEdit,
      householdId: expense.household_id,
      isAdmin: memberInfo.memberRole === 'admin'
    };
  }, 'requireExpenseAccess');
}