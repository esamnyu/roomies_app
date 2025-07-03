import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createExpenseWithCustomSplits, createMultiPayerExpense } from '@/lib/api/expenses';
import { getHouseholdBalances } from '@/lib/api/settlements';

// Example API route to test the new expense system
export async function POST(request: Request) {
  try {

    const body = await request.json();

    // Example: Create a simple expense
    if (body.type === 'simple') {
      const splitAmount = Number((body.amount / body.participant_ids.length).toFixed(2));
      const result = await createExpenseWithCustomSplits(
        body.household_id,
        body.description,
        body.amount,
        body.participant_ids.map((userId: string) => ({
          user_id: userId,
          amount: splitAmount
        })),
        undefined,
        body.payer_id
      );
      
      return NextResponse.json({ success: true, data: result });
    }

    // Example: Create a multi-payer expense
    if (body.type === 'multi-payer') {
      const totalAmount = body.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
      const splitAmount = Number((totalAmount / body.participant_ids.length).toFixed(2));
      
      const result = await createMultiPayerExpense(
        body.household_id,
        body.description,
        body.payments,
        body.participant_ids.map((userId: string) => ({
          user_id: userId,
          amount: splitAmount
        }))
      );
      
      return NextResponse.json({ success: true, data: result });
    }

    // Example: Get balances
    if (body.type === 'get-balances') {
      const balances = await getHouseholdBalances(body.household_id);
      return NextResponse.json({ success: true, data: balances });
    }

    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    
  } catch (error) {
    console.error('Error in expense API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}