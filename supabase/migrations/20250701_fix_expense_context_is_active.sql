-- Fix get_expense_context function by removing the is_active check on expenses table
-- The expenses table doesn't have an is_active column

CREATE OR REPLACE FUNCTION public.get_expense_context(p_household_id uuid, p_user_id uuid, p_limit integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'recent_expenses', (
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', expense_data.id,
                        'description', expense_data.description,
                        'amount', expense_data.amount,
                        'date', expense_data.date,
                        'paid_by', expense_data.paid_by_name,
                        'splits', expense_data.splits
                    ) ORDER BY expense_data.date DESC
                ),
                '[]'::jsonb
            )
            FROM (
                SELECT 
                    e.id,
                    e.description,
                    e.amount,
                    e.date,
                    p.name as paid_by_name,
                    COALESCE(
                        jsonb_agg(
                            jsonb_build_object(
                                'member', sp.name,
                                'amount', es.amount
                            )
                        ) FILTER (WHERE es.id IS NOT NULL),
                        '[]'::jsonb
                    ) as splits
                FROM expenses e
                JOIN profiles p ON e.paid_by = p.id
                LEFT JOIN expense_splits es ON e.id = es.expense_id
                LEFT JOIN profiles sp ON es.user_id = sp.id
                WHERE e.household_id = p_household_id
                -- Removed: AND e.is_active = true (column doesn't exist)
                GROUP BY e.id, e.description, e.amount, e.date, p.name
                ORDER BY e.date DESC
                LIMIT p_limit
            ) expense_data
        ),
        'balances', (
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'from', b.debtor_name,
                        'to', b.creditor_name,
                        'amount', b.amount,
                        'direction', 'owes'
                    )
                ),
                '[]'::jsonb
            )
            FROM get_household_balances(p_household_id) b
        ),
        'user_balance', (
            SELECT COALESCE(balance, 0)
            FROM ledger_balances
            WHERE household_id = p_household_id
              AND user_id = p_user_id
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$function$;