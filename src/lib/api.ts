import { ReactNode } from 'react'
import { supabase } from './supabase'

// Types
export interface Profile {
  id: string
  name: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Household {
  memberCount: ReactNode
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface HouseholdMember {
  id: string
  household_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  profiles?: Profile
  households?: Household
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
  profiles?: Profile
  expense_splits?: ExpenseSplit[]
}

export interface ExpenseSplit {
  id: string
  expense_id: string
  user_id: string
  amount: number
  settled: boolean
  settled_at?: string
  profiles?: Profile
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

// Auth functions
export const signUp = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

// Profile functions
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  return { data, error }
}

// Household functions
export const createHousehold = async (name: string) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Create household
  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({ name, created_by: user.id })
    .select()
    .single()

  if (householdError) throw householdError

  // Add creator as admin member
  const { error: memberError } = await supabase
    .from('household_members')
    .insert({
      household_id: household.id,
      user_id: user.id,
      role: 'admin'
    })

  if (memberError) throw memberError

  return household
}

export const getUserHouseholds = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('household_members')
    .select(`
      *,
      households (*)
    `)
    .eq('user_id', user.id)

  if (error) throw error
  
  // Get member counts for each household
  const householdsWithCounts = await Promise.all(
    (data || []).map(async (item) => {
      const { count } = await supabase
        .from('household_members')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', item.household_id)
      
      return {
        ...item.households,
        memberCount: count || 0
      }
    })
  )
  
  return householdsWithCounts
}

export const getHouseholdMembers = async (householdId: string) => {
  const { data, error } = await supabase
    .from('household_members')
    .select(`
      *,
      profiles (*)
    `)
    .eq('household_id', householdId)

  if (error) throw error
  return data || []
}

// Expense functions
export const createExpense = async (
  householdId: string,
  description: string,
  amount: number,
  date?: string
) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Use the database function to create expense with splits
  const { data, error } = await supabase
    .rpc('create_expense_with_splits', {
      p_household_id: householdId,
      p_description: description,
      p_amount: amount,
      p_paid_by: user.id,
      p_date: date || new Date().toISOString().split('T')[0]
    })

  if (error) throw error
  return data
}

export const getHouseholdExpenses = async (householdId: string) => {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      profiles:paid_by (
        id,
        name,
        avatar_url
      ),
      expense_splits (
        *,
        profiles:user_id (
          id,
          name,
          avatar_url
        )
      )
    `)
    .eq('household_id', householdId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const markExpenseSettled = async (expenseId: string, userId: string) => {
  const { data, error } = await supabase
    .from('expense_splits')
    .update({ 
      settled: true,
      settled_at: new Date().toISOString()
    })
    .eq('expense_id', expenseId)
    .eq('user_id', userId)

  if (error) throw error
  return data
}

// Task functions
export const createTask = async (
  householdId: string,
  title: string,
  assignedTo?: string
) => {
  const taskData: any = {
    household_id: householdId,
    title
  }
  
  if (assignedTo) {
    taskData.assigned_to = assignedTo
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select(`
      *,
      profiles:assigned_to (
        id,
        name,
        avatar_url
      )
    `)
    .single()

  if (error) throw error
  return data
}

export const getHouseholdTasks = async (householdId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      profiles:assigned_to (
        id,
        name,
        avatar_url
      )
    `)
    .eq('household_id', householdId)
    .order('completed', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const updateTask = async (taskId: string, updates: Partial<Task>) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select(`
      *,
      profiles:assigned_to (
        id,
        name,
        avatar_url
      )
    `)
    .single()

  if (error) throw error
  return data
}

export const completeTask = async (taskId: string) => {
  return updateTask(taskId, { 
    completed: true,
    completed_at: new Date().toISOString()
  })
}

// Invitation functions
export const inviteToHousehold = async (householdId: string, email: string) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      household_id: householdId,
      invited_by: user.id,
      email
    })
    .select()
    .single()

  if (error) throw error
  
  // TODO: Send invitation email using Supabase Edge Functions or external service
  
  return data
}

// Balance calculation helper
export const calculateBalances = (
  expenses: Expense[],
  members: HouseholdMember[]
): { userId: string; balance: number; profile: Profile }[] => {
  const balanceMap = new Map<string, number>()
  
  // Initialize all members with 0 balance
  members.forEach(member => {
    balanceMap.set(member.user_id, 0)
  })

  // Calculate balances based on expenses and splits
  expenses.forEach(expense => {
    // Add what the payer is owed
    const payerBalance = balanceMap.get(expense.paid_by) || 0
    balanceMap.set(expense.paid_by, payerBalance + expense.amount)

    // Subtract what each person owes
    expense.expense_splits?.forEach(split => {
      if (!split.settled) {
        const currentBalance = balanceMap.get(split.user_id) || 0
        balanceMap.set(split.user_id, currentBalance - split.amount)
      }
    })
  })

  // Convert to array with profile information
  return Array.from(balanceMap.entries()).map(([userId, balance]) => {
    const member = members.find(m => m.user_id === userId)
    return {
      userId,
      balance,
      profile: member?.profiles!
    }
  })
}