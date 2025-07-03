-- Fix for expense editing issues
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
BEGIN
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
        -- Calculate adjustments for settled splits
        WITH old_splits AS (
            SELECT user_id, amount, settled
            FROM expense_splits
            WHERE expense_id = p_expense_id
        ),
        new_splits AS (
            SELECT 
                (split->>'user_id')::UUID as user_id,
                (split->>'amount')::DECIMAL as amount
            FROM jsonb_array_elements(p_splits) as split
        ),
        adjustments AS (
            SELECT 
                COALESCE(o.user_id, n.user_id) as user_id,
                COALESCE(n.amount, 0) - COALESCE(o.amount, 0) as adjustment_amount,
                COALESCE(o.settled, false) as was_settled
            FROM old_splits o
            FULL OUTER JOIN new_splits n ON o.user_id = n.user_id
            WHERE COALESCE(o.settled, false) = true
        )
        SELECT jsonb_agg(
            jsonb_build_object(
                'user_id', user_id,
                'amount', adjustment_amount
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
    IF v_adjustment_data IS NOT NULL THEN
        INSERT INTO expense_split_adjustments (
            expense_id,
            user_id,
            amount,
            reason,
            created_at
        )
        SELECT 
            p_expense_id,
            (adjustment->>'user_id')::UUID,
            (adjustment->>'amount')::DECIMAL,
            'Edit of settled expense',
            NOW()
        FROM jsonb_array_elements(v_adjustment_data) as adjustment;
        
        -- Update ledger balances if they exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ledger_balances') THEN
            INSERT INTO ledger_balances (household_id, user_id, balance)
            SELECT 
                v_expense.household_id,
                (adjustment->>'user_id')::UUID,
                (adjustment->>'amount')::DECIMAL
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
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_expense_with_adjustments TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION update_expense_with_adjustments IS 
'Updates an expense with automatic adjustment tracking for settled splits. 
This function allows editing of settled expenses by creating adjustment records 
to maintain balance integrity.';

-- Create the adjustment table if it doesn't exist
CREATE TABLE IF NOT EXISTS expense_split_adjustments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_expense_split_adjustments_expense_id 
ON expense_split_adjustments(expense_id);

CREATE INDEX IF NOT EXISTS idx_expense_split_adjustments_user_id 
ON expense_split_adjustments(user_id);