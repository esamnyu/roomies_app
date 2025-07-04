-- Check what get_household_balances_fast function does
SELECT pg_get_functiondef(oid)
FROM pg_proc 
WHERE proname = 'get_household_balances_fast'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');