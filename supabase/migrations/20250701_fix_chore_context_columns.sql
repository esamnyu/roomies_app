-- Fix get_chore_context and get_household_info_context functions by removing references to non-existent columns
-- The households table doesn't have chore_reset_day, chore_reset_time, or chore_auto_assign columns

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