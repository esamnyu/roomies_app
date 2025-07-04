-- Check the constraints on ledger_entries table
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'ledger_entries'::regclass
AND contype = 'c';