import { supabase } from '@/lib/supabase';

// Store expense description for similarity search
export async function storeExpenseForSearch(
  expenseId: string,
  householdId: string,
  description: string
) {
  try {
    await supabase.from('expense_embeddings').insert({
      expense_id: expenseId,
      household_id: householdId,
      description: description
    });
  } catch (error) {
    console.error('Error storing expense for search:', error);
  }
}

// Batch store existing expenses
export async function indexExistingExpenses(householdId: string) {
  try {
    // Get expenses that aren't already indexed
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id, description')
      .eq('household_id', householdId)
      .not('id', 'in', 
        supabase
          .from('expense_embeddings')
          .select('expense_id')
          .eq('household_id', householdId)
      );

    if (expenses && expenses.length > 0) {
      const records = expenses.map(e => ({
        expense_id: e.id,
        household_id: householdId,
        description: e.description
      }));

      await supabase.from('expense_embeddings').insert(records);
    }
  } catch (error) {
    console.error('Error indexing expenses:', error);
  }
}