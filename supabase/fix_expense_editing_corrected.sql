-- Fix for expense editing issues (CORRECTED VERSION)
-- This script updates the update_expense_with_adjustments function to handle settled expenses properly

-- First, let's check if the function exists and see its current definition
DO $$
BEGIN
    -- Check if the function throws an error for settled expenses
    IF EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'update_expense_with_adjustments'
    ) THEN
        RAISE NOTICE 'Function update_expense_with_adjustments exists';
    ELSE
        RAISE NOTICE 'Function update_expense_with_adjustments does not exist';
    END IF;
END $$;

-- Create or replace the function to handle settled expenses properly
CREATE OR REPLACE FUNCTION update_expense_with_adjustments(
    p_expense_id UUID,
    p_description TEXT,
    p_amount DECIMAL,
    p_payments JSONB,
    p_splits JSONB,
    p_date DATE,
    p_expected_version INT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_expense RECORD;
    v_has_settled_splits BOOLEAN;
    v_adjustment_data JSONB;
    v_result JSONB;
    v_split_record RECORD;
    v_user_id UUID;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    -- Lock the expense for update
    SELECT * INTO v_expense
    FROM expenses
    WHERE id = p_expense_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expense not found';
    END IF;
    
    -- Check version for concurrent update protection
    IF p_expected_version IS NOT NULL AND v_expense.version != p_expected_version THEN
        RAISE EXCEPTION 'Expense was modified by another user';
    END IF;
    
    -- Check if any splits are settled
    SELECT EXISTS (
        SELECT 1 
        FROM expense_splits 
        WHERE expense_id = p_expense_id 
        AND settled = true
    ) INTO v_has_settled_splits;
    
    -- If there are settled splits, we need to create adjustments
    -- But we should NOT block the update
    IF v_has_settled_splits THEN
        -- Store the old splits before we delete them
        CREATE TEMP TABLE temp_old_splits ON COMMIT DROP AS
        SELECT id, user_id, amount, settled
        FROM expense_splits
        WHERE expense_id = p_expense_id;
        
        -- Calculate adjustments for settled splits
        WITH old_splits AS (
            SELECT id, user_id, amount, settled
            FROM temp_old_splits
        ),
        new_splits AS (
            SELECT 
                (split->>'user_id')::UUID as user_id,
                (split->>'amount')::DECIMAL as amount
            FROM jsonb_array_elements(p_splits) as split
        ),
        adjustments AS (
            SELECT 
                o.id as old_split_id,
                COALESCE(o.user_id, n.user_id) as user_id,
                COALESCE(n.amount, 0) - COALESCE(o.amount, 0) as adjustment_amount,
                COALESCE(o.settled, false) as was_settled
            FROM old_splits o
            FULL OUTER JOIN new_splits n ON o.user_id = n.user_id
            WHERE COALESCE(o.settled, false) = true
        )
        SELECT jsonb_agg(
            jsonb_build_object(
                'old_split_id', old_split_id,
                'user_id', user_id,
                'adjustment_amount', adjustment_amount
            )
        ) INTO v_adjustment_data
        FROM adjustments
        WHERE adjustment_amount != 0;
        
        -- Log that we're creating adjustments
        RAISE NOTICE 'Creating adjustments for settled splits: %', v_adjustment_data;
    END IF;
    
    -- Update the expense
    UPDATE expenses
    SET 
        description = p_description,
        amount = p_amount,
        paid_by = (p_payments->0->>'payer_id')::UUID,
        date = p_date,
        version = version + 1,
        updated_at = NOW()
    WHERE id = p_expense_id;
    
    -- Delete old splits
    DELETE FROM expense_splits WHERE expense_id = p_expense_id;
    
    -- Insert new splits
    INSERT INTO expense_splits (expense_id, user_id, amount, settled, settled_at)
    SELECT 
        p_expense_id,
        (split->>'user_id')::UUID,
        (split->>'amount')::DECIMAL,
        false, -- New splits are always unsettled
        NULL
    FROM jsonb_array_elements(p_splits) as split;
    
    -- If we have adjustments, create adjustment records
    -- Note: Using the correct column names for the existing table
    IF v_adjustment_data IS NOT NULL AND EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'expense_split_adjustments'
    ) THEN
        -- Get the new split IDs for the users who had adjustments
        FOR v_split_record IN 
            SELECT 
                es.id as split_id,
                (adjustment->>'user_id')::UUID as user_id,
                (adjustment->>'adjustment_amount')::DECIMAL as adjustment_amount
            FROM jsonb_array_elements(v_adjustment_data) as adjustment
            JOIN expense_splits es ON es.user_id = (adjustment->>'user_id')::UUID
            WHERE es.expense_id = p_expense_id
        LOOP
            INSERT INTO expense_split_adjustments (
                expense_split_id,
                adjustment_amount,
                reason,
                created_at,
                created_by
            ) VALUES (
                v_split_record.split_id,
                v_split_record.adjustment_amount,
                'Edit of settled expense',
                NOW(),
                v_user_id
            );
        END LOOP;
        
        -- Update ledger balances if they exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ledger_balances') THEN
            INSERT INTO ledger_balances (household_id, user_id, balance)
            SELECT 
                v_expense.household_id,
                (adjustment->>'user_id')::UUID,
                (adjustment->>'adjustment_amount')::DECIMAL
            FROM jsonb_array_elements(v_adjustment_data) as adjustment
            ON CONFLICT (household_id, user_id) DO UPDATE
            SET balance = ledger_balances.balance + EXCLUDED.balance;
        END IF;
    END IF;
    
    -- Return the updated expense with all related data
    SELECT jsonb_build_object(
        'id', e.id,
        'description', e.description,
        'amount', e.amount,
        'paid_by', e.paid_by,
        'date', e.date,
        'version', e.version,
        'splits', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'user_id', es.user_id,
                    'amount', es.amount,
                    'settled', es.settled
                )
            )
            FROM expense_splits es
            WHERE es.expense_id = e.id
        ),
        'adjustments', v_adjustment_data,
        'has_settled_adjustments', v_has_settled_splits
    ) INTO v_result
    FROM expenses e
    WHERE e.id = p_expense_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_expense_with_adjustments TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION update_expense_with_adjustments IS 
'Updates an expense with automatic adjustment tracking for settled splits. 
This function allows editing of settled expenses by creating adjustment records 
to maintain balance integrity. Uses the existing expense_split_adjustments table structure.';

-- Verify the expense_split_adjustments table exists with correct structure
-- (This just checks, doesn't create - assuming it already exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'expense_split_adjustments'
    ) THEN
        RAISE NOTICE 'expense_split_adjustments table exists';
        
        -- Check if it has the expected columns
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'expense_split_adjustments' 
            AND column_name = 'expense_split_id'
        ) THEN
            RAISE NOTICE 'Table has correct expense_split_id column';
        ELSE
            RAISE WARNING 'Table is missing expense_split_id column';
        END IF;
    ELSE
        RAISE WARNING 'expense_split_adjustments table does not exist';
    END IF;
END $$;