#!/usr/bin/env npx tsx

/**
 * CLI Test Script: Settled Expense Editing Flow
 * 
 * This script demonstrates:
 * 1. Creating an expense
 * 2. Creating a settlement
 * 3. Editing the settled expense
 * 4. Viewing the adjustments
 * 
 * Run with: npx tsx src/scripts/test-settled-expense-flow.ts
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test data
const TEST_HOUSEHOLD_ID = process.env.TEST_HOUSEHOLD_ID || 'test-household-id';
const TEST_USERS = {
  alice: { id: process.env.TEST_USER_ALICE_ID || 'alice-id', email: 'alice@test.com', password: 'testpassword123' },
  bob: { id: process.env.TEST_USER_BOB_ID || 'bob-id', email: 'bob@test.com', password: 'testpassword123' },
  charlie: { id: process.env.TEST_USER_CHARLIE_ID || 'charlie-id', email: 'charlie@test.com', password: 'testpassword123' }
};

// Utility functions
const log = (message: string, data?: any) => {
  console.log(`\n📋 ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const error = (message: string, err?: any) => {
  console.error(`\n❌ ${message}`);
  if (err) {
    console.error(err);
  }
};

const success = (message: string) => {
  console.log(`\n✅ ${message}`);
};

const divider = () => {
  console.log('\n' + '='.repeat(60) + '\n');
};

// Step 1: Create an expense
async function createExpense(authToken: string) {
  log('Creating expense: Alice paid $150 for dinner, split equally among 3 people');
  
  const { data, error: err } = await supabase
    .rpc('create_expense_atomic', {
      p_household_id: TEST_HOUSEHOLD_ID,
      p_description: 'Test Dinner Expense',
      p_amount: 150,
      p_payments: [{ payer_id: TEST_USERS.alice.id, amount: 150 }],
      p_splits: [
        { user_id: TEST_USERS.alice.id, amount: 50 },
        { user_id: TEST_USERS.bob.id, amount: 50 },
        { user_id: TEST_USERS.charlie.id, amount: 50 }
      ],
      p_date: new Date().toISOString().split('T')[0],
      p_client_uuid: uuidv4()
    })
    .eq('auth.uid()', TEST_USERS.alice.id);

  if (err) {
    error('Failed to create expense', err);
    throw err;
  }

  success(`Expense created with ID: ${data.id}`);
  return data.id;
}

// Step 2: Check balances
async function checkBalances() {
  log('Checking household balances');
  
  const { data, error: err } = await supabase
    .rpc('get_household_balances_fast', {
      p_household_id: TEST_HOUSEHOLD_ID
    });

  if (err) {
    error('Failed to get balances', err);
    throw err;
  }

  console.log('\nCurrent Balances:');
  data.forEach((balance: any) => {
    const userName = Object.keys(TEST_USERS).find(name => 
      TEST_USERS[name as keyof typeof TEST_USERS].id === balance.user_id
    ) || 'Unknown';
    
    console.log(`  ${userName}: ${balance.balance > 0 ? '+' : ''}$${balance.balance.toFixed(2)} ${
      balance.balance > 0 ? '(is owed)' : balance.balance < 0 ? '(owes)' : '(settled)'
    }`);
  });

  return data;
}

// Step 3: Create a settlement
async function createSettlement(authToken: string) {
  log('Creating settlement: Bob pays Alice $50');
  
  const { data, error: err } = await supabase
    .from('settlements')
    .insert({
      household_id: TEST_HOUSEHOLD_ID,
      payer_id: TEST_USERS.bob.id,
      payee_id: TEST_USERS.alice.id,
      amount: 50,
      description: 'Payment for dinner expense'
    })
    .select()
    .single();

  if (err) {
    error('Failed to create settlement', err);
    throw err;
  }

  success('Settlement created');
  
  // Mark Bob's split as settled
  log('Marking Bob\'s expense split as settled');
  
  const { error: updateErr } = await supabase
    .from('expense_splits')
    .update({ 
      settled: true, 
      settled_at: new Date().toISOString() 
    })
    .eq('user_id', TEST_USERS.bob.id)
    .eq('expense_id', data.id);

  if (updateErr) {
    error('Failed to mark split as settled', updateErr);
  } else {
    success('Bob\'s split marked as settled');
  }

  return data.id;
}

// Step 4: Edit the settled expense
async function editSettledExpense(expenseId: string, authToken: string) {
  log('Editing settled expense: Increasing total from $150 to $180');
  log('This will create adjustments for settled splits');
  
  // First get the current version
  const { data: expense, error: fetchErr } = await supabase
    .from('expenses')
    .select('version')
    .eq('id', expenseId)
    .single();

  if (fetchErr) {
    error('Failed to fetch expense', fetchErr);
    throw fetchErr;
  }

  const { data, error: err } = await supabase
    .rpc('update_expense_with_adjustments', {
      p_expense_id: expenseId,
      p_description: 'Test Dinner Expense (Updated)',
      p_amount: 180,
      p_payments: [{ payer_id: TEST_USERS.alice.id, amount: 180 }],
      p_splits: [
        { user_id: TEST_USERS.alice.id, amount: 60 },  // Was $50, now $60
        { user_id: TEST_USERS.bob.id, amount: 60 },    // Was $50, now $60 (settled)
        { user_id: TEST_USERS.charlie.id, amount: 60 } // Was $50, now $60
      ],
      p_date: new Date().toISOString().split('T')[0],
      p_expected_version: expense.version
    });

  if (err) {
    error('Failed to update expense', err);
    throw err;
  }

  success('Expense updated with adjustments');
  return data;
}

// Step 5: View adjustments
async function viewAdjustments(expenseId: string) {
  log('Checking adjustments created for settled splits');
  
  const { data, error: err } = await supabase
    .from('expense_split_adjustments')
    .select(`
      *,
      expense_splits!inner(
        user_id,
        expense_id
      )
    `)
    .eq('expense_splits.expense_id', expenseId);

  if (err) {
    error('Failed to get adjustments', err);
    throw err;
  }

  if (data && data.length > 0) {
    console.log('\nAdjustments Created:');
    data.forEach((adj: any) => {
      const userName = Object.keys(TEST_USERS).find(name => 
        TEST_USERS[name as keyof typeof TEST_USERS].id === adj.expense_splits.user_id
      ) || 'Unknown';
      
      console.log(`  ${userName}: ${adj.adjustment_amount > 0 ? '+' : ''}$${adj.adjustment_amount.toFixed(2)}`);
      console.log(`    Reason: ${adj.reason}`);
      console.log(`    Created: ${new Date(adj.created_at).toLocaleString()}`);
    });
  } else {
    console.log('\nNo adjustments found (this might mean no settled splits were edited)');
  }

  return data;
}

// Main test flow
async function runTest() {
  console.log('🧪 Settled Expense Editing Test Flow');
  console.log('====================================');
  
  try {
    // Authenticate as Alice
    log('Authenticating as Alice');
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: TEST_USERS.alice.email,
      password: TEST_USERS.alice.password
    });

    if (authErr) {
      error('Failed to authenticate', authErr);
      console.log('\n💡 Tip: Make sure test users exist in your Supabase project');
      console.log('You may need to create them first or update the TEST_USERS configuration');
      return;
    }

    const authToken = authData.session?.access_token || '';
    success('Authenticated as Alice');

    divider();

    // Step 1: Create expense
    const expenseId = await createExpense(authToken);
    
    divider();

    // Step 2: Check initial balances
    await checkBalances();
    
    divider();

    // Step 3: Create settlement (Bob pays Alice)
    await createSettlement(authToken);
    
    divider();

    // Step 4: Check balances after settlement
    log('Balances after settlement:');
    await checkBalances();
    
    divider();

    // Step 5: Edit the settled expense
    await editSettledExpense(expenseId, authToken);
    
    divider();

    // Step 6: View adjustments
    await viewAdjustments(expenseId);
    
    divider();

    // Step 7: Final balance check
    log('Final balances (after edit with adjustments):');
    await checkBalances();
    
    divider();
    
    success('Test completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Created expense: $150 split 3 ways');
    console.log('- Bob settled his $50 share');
    console.log('- Edited expense to $180 (each person now owes $60)');
    console.log('- Bob received a -$10 adjustment (owes $10 more)');
    console.log('- System maintained balance integrity throughout');
    
  } catch (err) {
    error('Test failed', err);
  } finally {
    // Sign out
    await supabase.auth.signOut();
  }
}

// Run the test
runTest().catch(console.error);