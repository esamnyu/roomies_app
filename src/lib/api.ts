// Add these types to your existing api.ts file
import { ReactNode } from 'react' // Assuming ReactNode might be used elsewhere or was part of your original setup
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
  memberCount: ReactNode // Keep if used, otherwise can be removed if not part of Household actual data model
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
  id: string
  user_id: string
  household_id: string | null
  type: 'expense_added' | 'payment_reminder' | 'task_assigned' | 'task_completed' | 'settlement_recorded' | 'recurring_expense_added' | 'member_joined' | 'member_left'
  title: string
  message: string
  data: any
  is_read: boolean
  read_at: string | null
  created_at: string
  updated_at: string
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

// OPTIMIZED: Single query with proper joins
export const getUserHouseholds = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get all households with member count in a single query
  const { data, error } = await supabase
    .rpc('get_user_households_with_counts', {
      p_user_id: user.id
    })

  if (error) throw error
  return data || []
}

// OPTIMIZED: Get all household data in one call
export const getHouseholdData = async (householdId: string) => {
  const { data, error } = await supabase
    .rpc('get_household_data', {
      p_household_id: householdId
    })

  if (error) throw error
  return data
}

export const getHouseholdMembers = async (householdId: string) => {
  const { data, error } = await supabase
    .from('household_members')
    .select(`
      *,
      profiles (*),
      households (*)
    `)
    .eq('household_id', householdId)

  if (error) throw error
  return data || []
}

// Expense functions
// Updated createExpense function to include isRecurring flag
export const createExpense = async (
  householdId: string,
  description: string,
  amount: number,
  date?: string,
  isRecurring: boolean = false // Added isRecurring flag
) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Add (Recurring) to description if it's from a recurring expense
  const finalDescription = isRecurring ? `${description} (Recurring)` : description

  // Use the database function to create expense with splits
  const { data, error } = await supabase
    .rpc('create_expense_with_splits', {
      p_household_id: householdId,
      p_description: finalDescription, // Use finalDescription
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
    title,
    completed: false
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

// Settlement functions
export const createSettlement = async (
  householdId: string,
  payeeId: string,
  amount: number,
  description?: string
) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('settlements')
    .insert({
      household_id: householdId,
      payer_id: user.id,
      payee_id: payeeId,
      amount,
      description: description || `Payment from ${user.id} to ${payeeId}`
    })
    .select(`
      *,
      payer_profile:payer_id (
        id,
        name,
        avatar_url
      ),
      payee_profile:payee_id (
        id,
        name,
        avatar_url
      )
    `)
    .single()

  if (error) throw error
  return data
}

export const getHouseholdSettlements = async (householdId: string) => {
  const { data, error } = await supabase
    .from('settlements')
    .select(`
      *,
      payer_profile:payer_id (
        id,
        name,
        avatar_url
      ),
      payee_profile:payee_id (
        id,
        name,
        avatar_url
      )
    `)
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data || []
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

// Recurring Expense functions
// Create a recurring expense
export const createRecurringExpense = async (
  householdId: string,
  description: string,
  amount: number,
  frequency: RecurringExpense['frequency'],
  startDate: Date,
  dayOfMonth?: number,
  dayOfWeek?: number
) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const nextDueDate = calculateNextDueDate(startDate, frequency, dayOfMonth, dayOfWeek)

  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({
      household_id: householdId,
      description,
      amount,
      frequency,
      day_of_month: dayOfMonth,
      day_of_week: dayOfWeek,
      next_due_date: nextDueDate,
      created_by: user.id,
      is_active: true // Assuming new recurring expenses are active by default
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Get household recurring expenses
export const getHouseholdRecurringExpenses = async (householdId: string) => {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .order('next_due_date', { ascending: true })

  if (error) throw error
  return data || []
}

// Process due recurring expenses
export const processDueRecurringExpenses = async (householdId: string) => {
  const today = new Date().toISOString().split('T')[0]

  const { data: dueExpenses, error: fetchError } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .lte('next_due_date', today)

  if (fetchError) {
    console.error('Error fetching due recurring expenses:', fetchError)
    throw fetchError
  }

  if (!dueExpenses) {
    console.log('No due recurring expenses to process.');
    return;
  }

  for (const recurring of dueExpenses) {
    try {
      // Create the expense, flagging it as recurring
      await createExpense(
        recurring.household_id,
        recurring.description,
        recurring.amount,
        recurring.next_due_date,
        true // Mark as recurring
      )

      // Update next due date
      const nextDate = calculateNextDueDate(
        new Date(recurring.next_due_date),
        recurring.frequency,
        recurring.day_of_month,
        recurring.day_of_week
      )

      const { error: updateError } = await supabase
        .from('recurring_expenses')
        .update({ next_due_date: nextDate })
        .eq('id', recurring.id)

      if (updateError) {
        console.error(`Error updating next due date for recurring expense ${recurring.id}:`, updateError)
        // Decide if you want to throw here or continue processing others
      }
    } catch (processError) {
        console.error(`Error processing recurring expense ${recurring.id}:`, processError)
        // Decide if you want to throw here or continue processing others
    }
  }
}

// Notification functions
// Get user's notifications
export const getNotifications = async (limit = 50, onlyUnread = false) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (onlyUnread) {
    query = query.eq('is_read', false)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get unread notification count
export const getUnreadNotificationCount = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .rpc('get_unread_notification_count', {
      p_user_id: user.id
    })

  if (error) throw error
  return data || 0
}

// Mark notifications as read
export const markNotificationsRead = async (notificationIds: string[]) => {
  const { error } = await supabase
    .rpc('mark_notifications_read', {
      p_notification_ids: notificationIds
    })

  if (error) throw error
}

// Mark all notifications as read
export const markAllNotificationsRead = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) throw error
}

// Create a manual notification (for custom notifications)
export const createNotification = async (
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  householdId?: string,
  data?: any
) => {
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      household_id: householdId,
      type,
      title,
      message,
      data: data || {}
    })
    .select()
    .single()

  if (error) throw error
  return notification
}

// Subscribe to real-time notifications
export const subscribeToNotifications = (
  userId: string,
  onNotification: (notification: Notification) => void
) => {
  const subscription = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        onNotification(payload.new as Notification)
      }
    )
    .subscribe()

  return subscription
}

// Send a payment reminder to specific user
export const sendPaymentReminder = async (
  householdId: string,
  debtorId: string,
  amount: number
) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: creditorProfile } = await getProfile(user.id) // Make sure getProfile returns { data, error }

  if (!creditorProfile) throw new Error('Creditor profile not found') // Add error handling

  return createNotification(
    debtorId,
    'payment_reminder',
    'Payment Reminder',
    `${creditorProfile.name} has sent you a reminder: You owe $${amount.toFixed(2)}`,
    householdId,
    {
      amount,
      creditor_id: user.id,
      manual_reminder: true
    }
  )
}


// Helper function to calculate next due date
const calculateNextDueDate = (
  currentDate: Date,
  frequency: RecurringExpense['frequency'],
  dayOfMonth?: number,
  dayOfWeek?: number // Note: dayOfWeek is not currently used in this logic but is kept for potential future use
): string => {
  const date = new Date(currentDate)

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'biweekly':
      date.setDate(date.getDate() + 14)
      break
    case 'monthly':
      // Move to the next month
      date.setMonth(date.getMonth() + 1)
      if (dayOfMonth) {
        // If dayOfMonth is specified, try to set it.
        // Cap at the actual number of days in the new month.
        const lastDayOfNewMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(dayOfMonth, lastDayOfNewMonth));
      } else {
        // If dayOfMonth is not specified, it will keep the current day of the month,
        // or roll over if the next month is shorter (e.g. Jan 31 -> Feb 28/29)
        // This behavior might need adjustment based on desired logic if dayOfMonth is often omitted.
      }
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      // Similar logic for dayOfMonth could be applied here if needed
      if (dayOfMonth) {
        const lastDayOfNewMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(dayOfMonth, lastDayOfNewMonth));
      }
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      // Similar logic for dayOfMonth could be applied here if needed
      if (dayOfMonth) {
         const lastDayOfNewMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(dayOfMonth, lastDayOfNewMonth));
      }
      break
  }

  return date.toISOString().split('T')[0]
}


// Balance calculation helper - now includes settlements
export const calculateBalances = (
  expenses: Expense[],
  members: HouseholdMember[],
  settlements?: Settlement[]
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

  // Apply settlements if provided
  if (settlements) {
    settlements.forEach(settlement => {
      // Payer's balance decreases (they paid money)
      const payerBalance = balanceMap.get(settlement.payer_id) || 0
      balanceMap.set(settlement.payer_id, payerBalance - settlement.amount)

      // Payee's balance increases (they received money)
      const payeeBalance = balanceMap.get(settlement.payee_id) || 0
      balanceMap.set(settlement.payee_id, payeeBalance + settlement.amount)
    })
  }

  // Convert to array with profile information
  return Array.from(balanceMap.entries()).map(([userId, balance]) => {
    const member = members.find(m => m.user_id === userId)
    // Ensure profile exists before trying to access it, provide a fallback or handle error
    if (!member?.profiles) {
        console.warn(`Profile not found for user ID: ${userId} in calculateBalances. This might indicate an issue with data consistency or household membership.`);
        // Depending on requirements, you might return a default profile, skip this user, or throw an error.
        // For now, returning a partial object or skipping might be safer than a runtime error.
        // This example will skip users without profiles to prevent errors, adjust as needed.
        return null;
    }
    return {
      userId,
      balance: Math.round(balance * 100) / 100, // Round to 2 decimal places
      profile: member.profiles
    }
  }).filter(Boolean) as { userId: string; balance: number; profile: Profile }[]; // Filter out nulls and assert type
}

// Smart settlement suggestions
export const getSettlementSuggestions = (
  balances: ReturnType<typeof calculateBalances>
): { from: string; to: string; amount: number; fromProfile: Profile; toProfile: Profile }[] => {
  const suggestions: { from: string; to: string; amount: number; fromProfile: Profile; toProfile: Profile }[] = []

  // Create separate arrays for those who owe and those who are owed
  const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance) // Sort by most negative
  const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance) // Sort by most positive

  // Create settlement suggestions to minimize transactions
  const tempDebtors = [...debtors]
  const tempCreditors = [...creditors]

  while (tempDebtors.length > 0 && tempCreditors.length > 0) {
    const debtor = tempDebtors[0]
    const creditor = tempCreditors[0]

    // Ensure profiles exist before trying to create a suggestion
    if (!debtor.profile || !creditor.profile) {
        console.warn('Skipping settlement suggestion due to missing profile information.');
        if (!debtor.profile) tempDebtors.shift(); // Remove debtor if profile is missing
        if (!creditor.profile) tempCreditors.shift(); // Remove creditor if profile is missing
        continue;
    }

    const debtAmount = Math.abs(debtor.balance)
    const creditAmount = creditor.balance
    const settlementAmount = Math.min(debtAmount, creditAmount)

    suggestions.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: Math.round(settlementAmount * 100) / 100,
      fromProfile: debtor.profile,
      toProfile: creditor.profile
    })

    // Update balances
    debtor.balance += settlementAmount
    creditor.balance -= settlementAmount

    // Remove settled parties or parties with negligible balance
    if (Math.abs(debtor.balance) < 0.01) tempDebtors.shift()
    if (creditor.balance < 0.01) tempCreditors.shift()
  }

  return suggestions
}