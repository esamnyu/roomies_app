-- Check if reverse_ledger_entries function exists and its definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'reverse_ledger_entries'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');