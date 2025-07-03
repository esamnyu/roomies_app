-- Verify Bill Splitting Migration Success

-- 1. Check new tables exist
SELECT 
    'ledger_balances' as table_name,
    COUNT(*) as row_count
FROM ledger_balances
UNION ALL
SELECT 
    'expense_payments' as table_name,
    COUNT(*) as row_count
FROM expense_payments
UNION ALL
SELECT 
    'expense_idempotency' as table_name,
    COUNT(*) as row_count
FROM expense_idempotency;

-- 2. Check new functions exist
SELECT 
    proname as function_name,
    pronargs as arg_count
FROM pg_proc 
WHERE proname IN (
    'create_expense_atomic',
    'process_recurring_expenses_robust',
    'update_expense_with_adjustments',
    'get_household_balances_fast',
    'update_ledger_balance'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- 3. Check indexes were created
SELECT 
    indexname,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_ledger_balances_household_user',
    'idx_ledger_balances_user_balance',
    'idx_expenses_household_date',
    'idx_expense_splits_expense_user',
    'idx_expense_splits_user_unsettled',
    'idx_recurring_expenses_active_due',
    'idx_expense_idempotency_created'
)
ORDER BY indexname;

-- 4. Test the new fast balance function (replace with actual household_id)
-- SELECT * FROM get_household_balances_fast('your-household-id-here');

-- 5. Check if version column was added to expenses
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'expenses'
AND column_name = 'version';