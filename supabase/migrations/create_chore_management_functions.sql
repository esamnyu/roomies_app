-- Chore Management Functions for Snooze, Swap, and Delegate features

-- 1. SNOOZE CHORE FUNCTION
-- Allows postponing a chore to a later date
CREATE OR REPLACE FUNCTION public.snooze_chore_assignment(
    p_assignment_id uuid,
    p_new_due_date date,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_current_assignment RECORD;
    v_user_id uuid;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Get current assignment details
    SELECT ca.*, hm.user_id as member_user_id
    INTO v_current_assignment
    FROM chore_assignments ca
    JOIN household_members hm ON hm.household_id = ca.household_id
    WHERE ca.id = p_assignment_id
    AND hm.user_id = v_user_id;
    
    -- Check if user has permission (either assigned to them or is admin)
    IF v_current_assignment.id IS NULL THEN
        RAISE EXCEPTION 'Assignment not found or no permission';
    END IF;
    
    IF v_current_assignment.assigned_user_id != v_user_id::text THEN
        -- Check if user is admin
        SELECT COUNT(*) INTO v_current_assignment
        FROM household_members
        WHERE household_id = v_current_assignment.household_id
        AND user_id = v_user_id
        AND role = 'admin';
        
        IF v_current_assignment.count = 0 THEN
            RAISE EXCEPTION 'Only the assigned user or admin can snooze this chore';
        END IF;
    END IF;
    
    -- Validate new date is in the future
    IF p_new_due_date <= CURRENT_DATE THEN
        RAISE EXCEPTION 'New due date must be in the future';
    END IF;
    
    -- Update the assignment
    UPDATE chore_assignments
    SET 
        due_date = p_new_due_date,
        notes = COALESCE(notes || E'\n', '') || 
                format('Snoozed from %s to %s%s', 
                       v_current_assignment.due_date::text, 
                       p_new_due_date::text,
                       CASE WHEN p_reason IS NOT NULL THEN ' - ' || p_reason ELSE '' END),
        updated_at = NOW()
    WHERE id = p_assignment_id;
    
    -- Create notification
    PERFORM create_household_notification(
        v_current_assignment.household_id,
        'chore_snoozed',
        'Chore Rescheduled',
        format('"%s" has been postponed to %s', 
               (SELECT name FROM household_chores WHERE id = v_current_assignment.household_chore_id),
               p_new_due_date::text),
        jsonb_build_object(
            'assignment_id', p_assignment_id,
            'old_date', v_current_assignment.due_date,
            'new_date', p_new_due_date,
            'reason', p_reason
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'assignment_id', p_assignment_id,
        'new_due_date', p_new_due_date,
        'message', 'Chore successfully snoozed'
    );
END;
$function$;

-- 2. SWAP CHORES FUNCTION
-- Allows two users to swap their chore assignments
CREATE OR REPLACE FUNCTION public.swap_chore_assignments(
    p_assignment1_id uuid,
    p_assignment2_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_assignment1 RECORD;
    v_assignment2 RECORD;
    v_user_id uuid;
    v_temp_user_id text;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Get both assignments
    SELECT * INTO v_assignment1 FROM chore_assignments WHERE id = p_assignment1_id;
    SELECT * INTO v_assignment2 FROM chore_assignments WHERE id = p_assignment2_id;
    
    -- Validate assignments exist
    IF v_assignment1.id IS NULL OR v_assignment2.id IS NULL THEN
        RAISE EXCEPTION 'One or both assignments not found';
    END IF;
    
    -- Validate both are from same household
    IF v_assignment1.household_id != v_assignment2.household_id THEN
        RAISE EXCEPTION 'Assignments must be from the same household';
    END IF;
    
    -- Validate both are pending
    IF v_assignment1.status != 'pending' OR v_assignment2.status != 'pending' THEN
        RAISE EXCEPTION 'Can only swap pending assignments';
    END IF;
    
    -- Check user permission (must be one of the assigned users or admin)
    IF v_user_id::text NOT IN (v_assignment1.assigned_user_id, v_assignment2.assigned_user_id) THEN
        -- Check if admin
        SELECT COUNT(*) INTO v_assignment1
        FROM household_members
        WHERE household_id = v_assignment1.household_id
        AND user_id = v_user_id
        AND role = 'admin';
        
        IF v_assignment1.count = 0 THEN
            RAISE EXCEPTION 'Only assigned users or admin can swap chores';
        END IF;
    END IF;
    
    -- Perform the swap
    v_temp_user_id := v_assignment1.assigned_user_id;
    
    UPDATE chore_assignments
    SET 
        assigned_user_id = v_assignment2.assigned_user_id,
        notes = COALESCE(notes || E'\n', '') || 
                format('Swapped with user on %s%s', 
                       NOW()::date::text,
                       CASE WHEN p_reason IS NOT NULL THEN ' - ' || p_reason ELSE '' END),
        updated_at = NOW()
    WHERE id = p_assignment1_id;
    
    UPDATE chore_assignments
    SET 
        assigned_user_id = v_temp_user_id,
        notes = COALESCE(notes || E'\n', '') || 
                format('Swapped with user on %s%s', 
                       NOW()::date::text,
                       CASE WHEN p_reason IS NOT NULL THEN ' - ' || p_reason ELSE '' END),
        updated_at = NOW()
    WHERE id = p_assignment2_id;
    
    -- Create notifications
    PERFORM create_household_notification(
        v_assignment1.household_id,
        'chores_swapped',
        'Chores Swapped',
        format('Chore assignments have been swapped between users'),
        jsonb_build_object(
            'assignment1_id', p_assignment1_id,
            'assignment2_id', p_assignment2_id,
            'reason', p_reason
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'assignment1_id', p_assignment1_id,
        'assignment2_id', p_assignment2_id,
        'message', 'Chores successfully swapped'
    );
END;
$function$;

-- 3. DELEGATE CHORE FUNCTION
-- Allows reassigning a chore to another household member
CREATE OR REPLACE FUNCTION public.delegate_chore_assignment(
    p_assignment_id uuid,
    p_new_assignee_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_assignment RECORD;
    v_user_id uuid;
    v_is_admin boolean;
    v_new_assignee_name text;
    v_chore_name text;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Get assignment details
    SELECT ca.*, hc.name as chore_name
    INTO v_assignment
    FROM chore_assignments ca
    JOIN household_chores hc ON hc.id = ca.household_chore_id
    WHERE ca.id = p_assignment_id;
    
    -- Validate assignment exists
    IF v_assignment.id IS NULL THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;
    
    -- Check if assignment is pending
    IF v_assignment.status != 'pending' THEN
        RAISE EXCEPTION 'Can only delegate pending assignments';
    END IF;
    
    -- Check user permission
    SELECT role = 'admin' INTO v_is_admin
    FROM household_members
    WHERE household_id = v_assignment.household_id
    AND user_id = v_user_id;
    
    IF NOT v_is_admin AND v_assignment.assigned_user_id != v_user_id::text THEN
        RAISE EXCEPTION 'Only the assigned user or admin can delegate this chore';
    END IF;
    
    -- Validate new assignee is member of household
    SELECT p.name INTO v_new_assignee_name
    FROM household_members hm
    JOIN profiles p ON p.id = hm.user_id
    WHERE hm.household_id = v_assignment.household_id
    AND hm.user_id = p_new_assignee_id;
    
    IF v_new_assignee_name IS NULL THEN
        RAISE EXCEPTION 'New assignee must be a member of the household';
    END IF;
    
    -- Update the assignment
    UPDATE chore_assignments
    SET 
        assigned_user_id = p_new_assignee_id::text,
        notes = COALESCE(notes || E'\n', '') || 
                format('Delegated to %s on %s%s', 
                       v_new_assignee_name,
                       NOW()::date::text,
                       CASE WHEN p_reason IS NOT NULL THEN ' - ' || p_reason ELSE '' END),
        updated_at = NOW()
    WHERE id = p_assignment_id;
    
    -- Notify the new assignee
    INSERT INTO notifications (user_id, household_id, type, title, message, data)
    VALUES (
        p_new_assignee_id,
        v_assignment.household_id,
        'chore_delegated',
        'New Chore Assigned',
        format('You have been assigned: %s (due %s)', 
               v_assignment.chore_name,
               v_assignment.due_date::text),
        jsonb_build_object(
            'assignment_id', p_assignment_id,
            'chore_name', v_assignment.chore_name,
            'due_date', v_assignment.due_date,
            'delegated_by', v_user_id,
            'reason', p_reason
        )
    );
    
    -- Notify household about the delegation
    PERFORM create_household_notification(
        v_assignment.household_id,
        'chore_delegated',
        'Chore Reassigned',
        format('"%s" has been reassigned to %s', 
               v_assignment.chore_name,
               v_new_assignee_name),
        jsonb_build_object(
            'assignment_id', p_assignment_id,
            'new_assignee_id', p_new_assignee_id,
            'reason', p_reason
        ),
        p_new_assignee_id -- Exclude the new assignee as they get a specific notification
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'assignment_id', p_assignment_id,
        'new_assignee_id', p_new_assignee_id,
        'new_assignee_name', v_new_assignee_name,
        'message', 'Chore successfully delegated'
    );
END;
$function$;

-- 4. GET AVAILABLE SWAP OPTIONS
-- Returns chores that can be swapped with a given assignment
CREATE OR REPLACE FUNCTION public.get_available_swap_options(
    p_assignment_id uuid
)
RETURNS TABLE(
    assignment_id uuid,
    chore_name text,
    assigned_user_id text,
    assigned_user_name text,
    due_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_assignment RECORD;
    v_user_id uuid;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Get current assignment
    SELECT * INTO v_assignment
    FROM chore_assignments
    WHERE id = p_assignment_id;
    
    -- Return available swaps (same household, pending, different user, within reasonable date range)
    RETURN QUERY
    SELECT 
        ca.id as assignment_id,
        hc.name as chore_name,
        ca.assigned_user_id,
        p.name as assigned_user_name,
        ca.due_date
    FROM chore_assignments ca
    JOIN household_chores hc ON hc.id = ca.household_chore_id
    JOIN profiles p ON p.id = ca.assigned_user_id::uuid
    WHERE ca.household_id = v_assignment.household_id
    AND ca.id != p_assignment_id
    AND ca.status = 'pending'
    AND ca.assigned_user_id != v_assignment.assigned_user_id
    AND ca.due_date BETWEEN v_assignment.due_date - INTERVAL '7 days' 
                        AND v_assignment.due_date + INTERVAL '7 days'
    ORDER BY ca.due_date;
END;
$function$;

-- 5. ASSIGN CHORES TO NEW MEMBER
-- When a new member joins, assign them to placeholder chores
CREATE OR REPLACE FUNCTION public.assign_placeholder_chores_to_member(
    p_household_id uuid,
    p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_assignments_updated integer;
    v_member_count integer;
    v_placeholder_count integer;
BEGIN
    -- Count current members
    SELECT COUNT(*) INTO v_member_count
    FROM household_members
    WHERE household_id = p_household_id;
    
    -- Count placeholder assignments (null or empty assigned_user_id)
    SELECT COUNT(*) INTO v_placeholder_count
    FROM chore_assignments
    WHERE household_id = p_household_id
    AND status = 'pending'
    AND (assigned_user_id IS NULL OR assigned_user_id = '');
    
    -- If there are placeholders, assign them using round-robin
    IF v_placeholder_count > 0 THEN
        -- Update placeholder assignments
        WITH numbered_placeholders AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY due_date, id) as rn
            FROM chore_assignments
            WHERE household_id = p_household_id
            AND status = 'pending'
            AND (assigned_user_id IS NULL OR assigned_user_id = '')
        ),
        member_position AS (
            SELECT COUNT(*) as position
            FROM household_members
            WHERE household_id = p_household_id
            AND joined_at < (SELECT joined_at FROM household_members 
                           WHERE household_id = p_household_id AND user_id = p_user_id)
        )
        UPDATE chore_assignments ca
        SET 
            assigned_user_id = p_user_id::text,
            notes = COALESCE(notes || E'\n', '') || 
                   format('Auto-assigned to new member on %s', NOW()::date::text),
            updated_at = NOW()
        FROM numbered_placeholders np, member_position mp
        WHERE ca.id = np.id
        AND (np.rn - 1) % v_member_count = mp.position;
        
        GET DIAGNOSTICS v_assignments_updated = ROW_COUNT;
    ELSE
        v_assignments_updated := 0;
    END IF;
    
    -- Create notification for the new member
    IF v_assignments_updated > 0 THEN
        INSERT INTO notifications (user_id, household_id, type, title, message, data)
        VALUES (
            p_user_id,
            p_household_id,
            'chores_assigned',
            'Chores Assigned',
            format('You have been assigned %s chore(s)', v_assignments_updated),
            jsonb_build_object(
                'count', v_assignments_updated
            )
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'assignments_updated', v_assignments_updated,
        'message', format('%s chores assigned to new member', v_assignments_updated)
    );
END;
$function$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chore_assignments_household_status 
ON chore_assignments(household_id, status);

CREATE INDEX IF NOT EXISTS idx_chore_assignments_assigned_user 
ON chore_assignments(assigned_user_id);

CREATE INDEX IF NOT EXISTS idx_chore_assignments_due_date 
ON chore_assignments(due_date);