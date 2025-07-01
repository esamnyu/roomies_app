-- Fix all RAG-related database functions that reference non-existent columns
-- This migration combines all the fixes needed for the AI chat to work properly

-- 1. Fix get_expense_context function by removing the is_active check on expenses table
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

-- 2. Fix get_chore_context function by removing references to non-existent columns
CREATE OR REPLACE FUNCTION public.get_chore_context(p_household_id uuid, p_user_id uuid, p_days_ahead integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
      v_context jsonb;
      v_assignments jsonb;
      v_user_chores jsonb;
      v_chore_settings jsonb;
  BEGIN
      -- Verify user is member of household
      IF NOT EXISTS (
          SELECT 1 FROM household_members
          WHERE household_id = p_household_id
          AND user_id = p_user_id
      ) THEN
          RAISE EXCEPTION 'User is not a member of this household';
      END IF;

      -- Get week's chore assignments
      SELECT jsonb_agg(
          jsonb_build_object(
              'date', ca.due_date,
              'chore', hc.name,
              'assigned_to', p.name,
              'status', ca.status,
              'is_user', (ca.assigned_user_id = p_user_id::text)
          ) ORDER BY ca.due_date
      ) INTO v_assignments
      FROM chore_assignments ca
      JOIN household_chores hc ON ca.household_chore_id = hc.id
      JOIN profiles p ON ca.assigned_user_id = p.id::text
      WHERE ca.household_id = p_household_id
      AND ca.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * p_days_ahead;

      -- Get user's specific chores
      SELECT jsonb_agg(
          jsonb_build_object(
              'date', ca.due_date,
              'chore', hc.name,
              'status', ca.status
          ) ORDER BY ca.due_date
      ) INTO v_user_chores
      FROM chore_assignments ca
      JOIN household_chores hc ON ca.household_chore_id = hc.id
      WHERE ca.household_id = p_household_id
      AND ca.assigned_user_id = p_user_id::text
      AND ca.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * p_days_ahead;

      -- For now, return empty settings since the columns don't exist
      -- In the future, these could be added to the households table or a separate settings table
      v_chore_settings := jsonb_build_object(
          'reset_day', null,
          'reset_time', null,
          'auto_assign', null
      );

      -- Build context
      v_context := jsonb_build_object(
          'all_assignments', COALESCE(v_assignments, '[]'::jsonb),
          'user_chores', COALESCE(v_user_chores, '[]'::jsonb),
          'settings', v_chore_settings,
          'current_date', CURRENT_DATE,
          'timestamp', now()
      );

      RETURN v_context;
  END;
$function$;

-- 3. Fix get_household_info_context function by removing reference to non-existent chore_reset_day column
CREATE OR REPLACE FUNCTION public.get_household_info_context(p_household_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
      v_context jsonb;
      v_household jsonb;
      v_members jsonb;
      v_rules text;
  BEGIN
      -- Verify user is member of household
      IF NOT EXISTS (
          SELECT 1 FROM household_members
          WHERE household_id = p_household_id
          AND user_id = p_user_id
      ) THEN
          RAISE EXCEPTION 'User is not a member of this household';
      END IF;

      -- Get household info (removed chore_reset_day which doesn't exist)
      SELECT jsonb_build_object(
          'name', h.name,
          'join_code', h.join_code,
          'created_at', h.created_at,
          'rules', h.rules
      ) INTO v_household
      FROM households h
      WHERE h.id = p_household_id;

      -- Get members
      SELECT jsonb_agg(
          jsonb_build_object(
              'name', p.name,
              'role', hm.role,
              'joined_at', hm.joined_at,
              'is_current_user', (p.id = p_user_id)
          ) ORDER BY hm.joined_at
      ) INTO v_members
      FROM household_members hm
      JOIN profiles p ON hm.user_id = p.id
      WHERE hm.household_id = p_household_id;

      -- Build context
      v_context := jsonb_build_object(
          'household', v_household,
          'members', COALESCE(v_members, '[]'::jsonb),
          'member_count', (SELECT COUNT(*) FROM household_members WHERE household_id = p_household_id),
          'timestamp', now()
      );

      RETURN v_context;
  END;
  $function$;