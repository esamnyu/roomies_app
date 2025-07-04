# Unified Ledger System Migration Guide

## Overview

This guide explains how to migrate your expense tracking system to use a unified ledger architecture. This is the single most impactful improvement you can make to your settlement/bill splitting system.

## What is the Unified Ledger System?

Instead of maintaining separate tables and complex logic for tracking balances, settlements, and adjustments, the ledger system uses a single `ledger_entries` table that records every financial transaction as an immutable entry. This approach:

- **Eliminates race conditions** through append-only design
- **Provides complete audit trail** of all transactions
- **Simplifies balance calculations** to a single query
- **Makes the system more transparent** to users

## Architecture Benefits

### Before (Current System)
- Separate `ledger_balances` table that needs constant updates
- Complex `expense_split_adjustments` for tracking changes
- Separate settlement logic
- Risk of balance drift and race conditions

### After (Ledger System)
- Single source of truth: `ledger_entries` table
- Immutable entries (append-only)
- Balance = sum of all entries for a user
- Complete transaction history

## Implementation Steps

### 1. Database Migration

Run the migrations in order:
```bash
# Create the ledger infrastructure
supabase migration up 20240704_create_ledger_system.sql

# Update RPC functions to use ledger
supabase migration up 20240704_update_rpcs_for_ledger.sql
```

### 2. Update Frontend Components

The system includes new components:
- `TransactionHistory.tsx` - Shows all ledger entries
- `BalanceReconciliation.tsx` - Explains how balances are calculated
- Updated `BalanceSummaryCard.tsx` - Includes reconciliation button

### 3. Update API Calls

No changes needed to existing API calls! The RPC functions maintain the same interface but now use the ledger system internally.

### 4. Add New Features

You can now add:
```typescript
// Show transaction history
import { TransactionHistory } from '@/components/TransactionHistory';

<TransactionHistory 
  householdId={household.id} 
  userId={user.id} 
/>

// Get balance history
import { getBalanceHistory } from '@/lib/api/ledger';

const history = await getBalanceHistory(householdId, userId);
```

## How It Works

### Creating an Expense
When an expense is created:
1. Expense record is created
2. Credit entry added for payer (they're owed money)
3. Debit entries added for participants (they owe money)
4. Balances automatically updated

### Updating an Expense
When an expense is updated:
1. Reversal entries created for original amounts
2. New entries created for updated amounts
3. Complete audit trail maintained

### Creating a Settlement
When a settlement is created:
1. Settlement record is created
2. Credit entry for payer (reducing their debt)
3. Debit entry for payee (reducing what they're owed)

## Migration Checklist

- [ ] Back up your database
- [ ] Run migration scripts
- [ ] Test expense creation
- [ ] Test expense updates
- [ ] Test settlements
- [ ] Verify balance calculations match
- [ ] Deploy frontend updates
- [ ] Monitor for any issues

## Rollback Plan

If needed, the old system remains intact. You can rollback by:
1. Switching RPC functions back to use `ledger_balances`
2. The ledger entries can be kept for historical data

## Future Enhancements

With the ledger system in place, you can easily add:
- Time-travel queries (balances at any point in time)
- Detailed analytics and reports
- Export functionality
- Budget tracking
- Multi-currency support

## Performance Considerations

The ledger system is designed for scale:
- Indexes on all query patterns
- Materialized view for current balances (optional)
- O(1) balance lookups via latest entry
- Efficient pagination for history

## Conclusion

This unified ledger system provides a rock-solid foundation for your expense tracking. It eliminates the most common bugs (race conditions, balance drift) while providing transparency to users about how their balances are calculated.