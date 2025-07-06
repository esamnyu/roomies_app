# Expense Management Migration Guide

## Overview

We've consolidated all expense operations into a unified system that handles creation, editing, deletion, and duplication of expenses. This guide will help you migrate from the old fragmented system to the new unified approach.

## Key Components

### 1. UnifiedExpenseForm
A single form component that handles all expense operations:
- Create new expenses (single/multi-payer)
- Edit existing expenses
- Delete expenses (with proper ledger handling)
- Duplicate expenses
- Create recurring expenses

### 2. ExpenseModal
A wrapper component that provides modal functionality around UnifiedExpenseForm.

### 3. useExpenseOperations Hook
Handles all expense operations with proper error handling and cache invalidation.

## Migration Steps

### Step 1: Replace Old Modals

Replace imports of deprecated components:

```typescript
// Old
import { AddExpenseModal } from '@/components/modals/AddExpenseModal';
import { EditExpenseModal } from '@/components/modals/EditExpenseModal';

// New
import { ExpenseModal } from '@/components/expenses';
```

### Step 2: Update Component Usage

Replace old modal implementations:

```typescript
// Old - Add Expense
{showAddExpense && (
  <AddExpenseModal
    householdId={householdId}
    members={members}
    onClose={() => setShowAddExpense(false)}
    onExpenseAdded={() => {
      setShowAddExpense(false);
      refreshData();
    }}
  />
)}

// New - Add Expense
{showAddExpense && (
  <ExpenseModal
    isOpen={showAddExpense}
    onClose={() => setShowAddExpense(false)}
    householdId={householdId}
    onSuccess={() => refreshData()}
  />
)}

// Old - Edit Expense
{editingExpense && (
  <EditExpenseModal
    expense={editingExpense}
    members={members}
    onClose={() => setEditingExpense(null)}
    onExpenseUpdated={() => {
      setEditingExpense(null);
      refreshData();
    }}
  />
)}

// New - Edit Expense
{editingExpense && (
  <ExpenseModal
    isOpen={!!editingExpense}
    onClose={() => setEditingExpense(null)}
    expense={editingExpense}
    householdId={householdId}
    mode="edit"
    onSuccess={() => refreshData()}
  />
)}
```

### Step 3: Use UnifiedExpenseForm Directly (Alternative)

For custom implementations or non-modal usage:

```typescript
import { UnifiedExpenseForm, useExpenseOperations } from '@/components/expenses';

const MyComponent = () => {
  const { householdId } = useHousehold();
  const {
    createExpense,
    updateExpense,
    deleteExpense,
    isCreating,
    isUpdating,
    isDeleting,
    error
  } = useExpenseOperations(householdId);

  const handleSubmit = async (data) => {
    if (mode === 'edit' && expense) {
      updateExpense({ expenseId: expense.id, data });
    } else {
      createExpense(data);
    }
  };

  return (
    <UnifiedExpenseForm
      expense={expense}
      onSubmit={handleSubmit}
      onDelete={deleteExpense}
      onCancel={() => {/* handle cancel */}}
      householdId={householdId}
      mode={mode}
    />
  );
};
```

### Step 4: Handle Expense Deletion

The new system properly handles both settled and unsettled expenses:

```typescript
// In ExpenseCard or any component showing expense actions
<Button
  onClick={() => {
    if (confirm('Are you sure you want to delete this expense?')) {
      deleteExpense(expense.id);
    }
  }}
>
  Delete
</Button>
```

## Features of the New System

### 1. Unified Form Fields
- Description
- Amount
- Date
- Category
- Payers (single or multiple)
- Split mode (equal, custom, percentage)
- Recurring expense options

### 2. Smart Validations
- Ensures split amounts equal total
- Ensures payer amounts equal total
- Validates all required fields
- Shows real-time validation feedback

### 3. Proper Ledger Handling
- **Unsettled expenses**: Deletes expense and removes ledger entries
- **Settled expenses**: Creates reversal entries to maintain ledger integrity
- All operations update the ledger balance cache

### 4. Multi-Payer Support
Built-in support for expenses paid by multiple people.

### 5. Responsive Design
- Modal on desktop
- Full-screen on mobile
- Optimized for touch interactions

## API Changes

### Delete Expense
The new delete function properly handles ledger updates:

```typescript
import { deleteExpense } from '@/lib/api/expenses';

// Usage
try {
  const result = await deleteExpense(expenseId);
  if (result.success) {
    // Handle success
    // Check result.message to see if it was reversed
  }
} catch (error) {
  // Handle error
  console.error(error.message);
}
```

## Database Migration

Run the following migration to add the necessary database function:

```bash
supabase migration run
```

This adds:
- `delete_expense_with_ledger` function
- `is_reversed` and `reversed_at` columns to expenses table
- Proper indexes for performance

## Best Practices

1. **Always use the unified system** - Don't create new expense forms
2. **Handle loading states** - Use the provided loading flags
3. **Show proper feedback** - Inform users when expenses are reversed vs deleted
4. **Test thoroughly** - Especially deletion of settled expenses
5. **Cache invalidation** - The hooks handle this automatically

## Troubleshooting

### "Cannot delete expense" error
- Check if the user has permission
- Verify the expense exists
- Check the database function is created

### Ledger balance issues
- Ensure the update_ledger_balance function exists
- Check that ledger_balances table is properly initialized

### Form validation errors
- Verify all members are loaded before showing form
- Check that split calculations are correct
- Ensure date format is YYYY-MM-DD

## Support

For issues or questions:
1. Check the error messages - they're now more descriptive
2. Review the database migration logs
3. Check browser console for detailed errors
4. Verify all components are using the new system