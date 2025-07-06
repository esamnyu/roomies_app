-- Function to delete expense with proper ledger handling
-- For unsettled expenses: Simply removes the expense and its ledger entries
-- For settled expenses: Creates reversal entries to maintain ledger integrity
CREATE OR REPLACE FUNCTION delete_expense_with_ledger(p_expense_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expense RECORD;
    v_has_settled_splits BOOLEAN;
    v_ledger_entry RECORD;
    v_reversal_description TEXT;
BEGIN
    -- Get expense details with settled status
    SELECT 
        e.*,
        EXISTS(
            SELECT 1 FROM expense_splits 
            WHERE expense_id = e.id AND settled = true
        ) as has_settled_splits
    INTO v_expense
    FROM expenses e
    WHERE e.id = p_expense_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Expense not found'::text;
        RETURN;
    END IF;
    
    v_has_settled_splits := v_expense.has_settled_splits;
    
    -- Case 1: Unsettled expense - simple deletion
    IF NOT v_has_settled_splits THEN
        -- Delete ledger entries
        DELETE FROM ledger_entries 
        WHERE reference_id = p_expense_id 
        AND reference_table = 'expenses';
        
        -- Update ledger balances
        FOR v_ledger_entry IN 
            SELECT DISTINCT household_id, user_id 
            FROM ledger_entries 
            WHERE reference_id = p_expense_id
        LOOP
            PERFORM update_ledger_balance(
                v_ledger_entry.household_id, 
                v_ledger_entry.user_id, 
                0
            );
        END LOOP;
        
        -- Delete expense splits
        DELETE FROM expense_splits WHERE expense_id = p_expense_id;
        
        -- Delete expense payments
        DELETE FROM expense_payments WHERE expense_id = p_expense_id;
        
        -- Delete the expense
        DELETE FROM expenses WHERE id = p_expense_id;
        
        RETURN QUERY SELECT true, 'Expense deleted successfully'::text;
        RETURN;
    END IF;
    
    -- Case 2: Settled expense - create reversal entries
    v_reversal_description := 'Reversal: ' || v_expense.description;
    
    -- Create reversal ledger entries
    FOR v_ledger_entry IN 
        SELECT * FROM ledger_entries 
        WHERE reference_id = p_expense_id 
        AND reference_table = 'expenses'
        AND transaction_type != 'reversal'
    LOOP
        INSERT INTO ledger_entries (
            household_id,
            user_id,
            amount,
            entry_type,
            transaction_type,
            reference_id,
            reference_table,
            description,
            metadata,
            created_by
        ) VALUES (
            v_ledger_entry.household_id,
            v_ledger_entry.user_id,
            v_ledger_entry.amount,
            -- Reverse the entry type: debit becomes credit, credit becomes debit
            CASE 
                WHEN v_ledger_entry.entry_type = 'debit' THEN 'credit'
                ELSE 'debit'
            END,
            'reversal',
            p_expense_id,
            'expenses',
            v_reversal_description,
            jsonb_build_object(
                'original_entry_id', v_ledger_entry.id,
                'reversal_reason', 'expense_deleted',
                'deleted_at', NOW()
            ),
            auth.uid()
        );
        
        -- Update the ledger balance
        PERFORM update_ledger_balance(
            v_ledger_entry.household_id,
            v_ledger_entry.user_id,
            CASE 
                WHEN v_ledger_entry.entry_type = 'debit' THEN v_ledger_entry.amount
                ELSE -v_ledger_entry.amount
            END
        );
    END LOOP;
    
    -- Mark the expense as reversed (soft delete)
    UPDATE expenses 
    SET 
        is_reversed = true,
        reversed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_expense_id;
    
    -- Add notification for affected users
    INSERT INTO notifications (user_id, household_id, type, title, message, data)
    SELECT DISTINCT
        es.user_id,
        v_expense.household_id,
        'expense_reversed',
        'Expense Reversed',
        format('The expense "%s" has been deleted and reversed', v_expense.description),
        jsonb_build_object(
            'expense_id', p_expense_id,
            'amount', v_expense.amount,
            'deleted_by', auth.uid()
        )
    FROM expense_splits es
    WHERE es.expense_id = p_expense_id
    AND es.user_id != auth.uid();
    
    RETURN QUERY SELECT true, 'Settled expense has been reversed successfully'::text;
END;
$$;

-- Add columns to expenses table for reversal tracking
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;

-- Create index for reversed expenses
CREATE INDEX IF NOT EXISTS idx_expenses_reversed ON expenses(is_reversed) WHERE is_reversed = true;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_expense_with_ledger(UUID) TO authenticated;