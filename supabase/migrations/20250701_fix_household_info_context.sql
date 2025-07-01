-- Fix get_household_info_context function by removing reference to non-existent chore_reset_day column

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