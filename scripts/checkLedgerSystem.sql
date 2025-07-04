-- Check if ledger tables exist and have data
SELECT 
    'ledger_entries' as table_name,
    COUNT(*) as row_count
FROM ledger_entries
WHERE household_id IS NOT NULL

UNION ALL

SELECT 
    'ledger_balances' as table_name,
    COUNT(*) as row_count
FROM ledger_balances
WHERE household_id IS NOT NULL

UNION ALL

-- Check if functions exist
SELECT 
    'functions' as table_name,
    COUNT(*) as row_count
FROM information_schema.routines
WHERE routine_name IN ('create_expense_ledger_entries', 'reverse_ledger_entries')
AND routine_schema = 'public';