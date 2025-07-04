-- Check the definition of update_expense_with_adjustments function
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'update_expense_with_adjustments'
AND pg_get_function_arguments(oid) = 'p_expense_id uuid, p_description text, p_amount numeric, p_paid_by uuid, p_date date, p_splits jsonb, p_version integer DEFAULT NULL::integer';