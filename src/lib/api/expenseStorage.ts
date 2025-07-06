import { supabase } from '@/lib/supabase';
import { intelligentEmbeddingService } from '@/lib/services/intelligentEmbeddingService';

// Store expense description for similarity search using unified embeddings
export async function storeExpenseForSearch(
  expenseId: string,
  householdId: string,
  description: string,
  metadata?: Record<string, any>
) {
  try {
    // Use the intelligent embedding service which handles the unified table
    await intelligentEmbeddingService.storeEmbedding(
      householdId,
      description,
      {
        entityType: 'expense',
        entityId: expenseId,
        priority: 'normal',
        processImmediately: false,
        metadata: metadata || {}
      }
    );
  } catch (error) {
    console.error('Error storing expense for search:', error);
  }
}

// Batch store existing expenses in unified embeddings table
export async function indexExistingExpenses(householdId: string) {
  try {
    // Get expenses that aren't already indexed in unified embeddings
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id, description, amount, date, paid_by')
      .eq('household_id', householdId);

    if (!expenses || expenses.length === 0) return;

    // Check which expenses are already indexed
    const { data: existing } = await supabase
      .from('embeddings')
      .select('entity_id')
      .eq('household_id', householdId)
      .eq('entity_type', 'expense');

    const existingIds = new Set(existing?.map(e => e.entity_id) || []);
    const toIndex = expenses.filter(e => !existingIds.has(e.id));

    // Store new expenses
    for (const expense of toIndex) {
      await storeExpenseForSearch(
        expense.id,
        householdId,
        expense.description,
        {
          amount: expense.amount,
          date: expense.date,
          paid_by: expense.paid_by
        }
      );
    }

    console.log(`Indexed ${toIndex.length} new expenses for household ${householdId}`);
  } catch (error) {
    console.error('Error indexing expenses:', error);
  }
}