-- Migration: Optimized Bill Splitting System
-- Description: Implements atomic, idempotent expense creation with multi-payer support,
-- ledger balance tracking, and robust recurring expense handling

-- =====================================================
-- STEP 1: Create new tables for enhanced functionality
-- =====================================================

-- Ledger balances table for O(1) balance lookups
CREATE TABLE IF NOT EXISTS public.ledger_balances (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    balance numeric(12,2) NOT NULL DEFAULT 0.00,
    last_updated_at timestamp with time zone DEFAULT NOW(),
    created_at timestamp with time zone DEFAULT NOW(),
    UNIQUE(household_id, user_id)
);

-- Multi-payer support table
CREATE TABLE IF NOT EXISTS public.expense_payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    payer_id uuid NOT NULL REFERENCES profiles(id),
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    created_at timestamp with time zone DEFAULT NOW(),
    UNIQUE(expense_id, payer_id)
);

-- Idempotency tracking table
CREATE TABLE IF NOT EXISTS public.expense_idempotency (
    client_uuid uuid PRIMARY KEY,
    expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT NOW(),
    request_hash text NOT NULL
);

-- Add version column for optimistic concurrency control
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE public.recurring_expenses ADD COLUMN IF NOT EXISTS last_processed_at timestamp with time zone;

-- =====================================================
-- STEP 2: Create indexes for performance
-- =====================================================

-- Indexes for ledger_balances
CREATE INDEX IF NOT EXISTS idx_ledger_balances_household_user 
ON public.ledger_balances(household_id, user_id);

CREATE INDEX IF NOT EXISTS idx_ledger_balances_user_balance 
ON public.ledger_balances(user_id, balance) 
WHERE balance != 0;

-- Indexes for expense queries
CREATE INDEX IF NOT EXISTS idx_expenses_household_date 
ON public.expenses(household_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_user 
ON public.expense_splits(expense_id, user_id);

CREATE INDEX IF NOT EXISTS idx_expense_splits_user_unsettled 
ON public.expense_splits(user_id) 
WHERE settled = false;

-- Indexes for recurring expenses
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_active_due 
ON public.recurring_expenses(household_id, next_due_date) 
WHERE is_active = true;

-- Index for idempotency lookups
CREATE INDEX IF NOT EXISTS idx_expense_idempotency_created 
ON public.expense_idempotency(created_at);

-- =====================================================
-- STEP 3: Helper function to update ledger balances
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_ledger_balance(
    p_household_id uuid,
    p_user_id uuid,
    p_delta numeric
) RETURNS void AS $$
BEGIN
    INSERT INTO public.ledger_balances (household_id, user_id, balance)
    VALUES (p_household_id, p_user_id, p_delta)
    ON CONFLICT (household_id, user_id)
    DO UPDATE SET 
        balance = ledger_balances.balance + p_delta,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 4: Idempotent expense creation with multi-payer
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_expense_atomic(
    p_household_id uuid,
    p_description text,
    p_amount numeric,
    p_payments jsonb,  -- [{payer_id, amount}]
    p_splits jsonb,    -- [{user_id, amount}]
    p_date date DEFAULT CURRENT_DATE,
    p_client_uuid uuid DEFAULT NULL,
    p_recurring_expense_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_expense_id uuid;
    v_payment record;
    v_split record;
    v_total_paid numeric := 0;
    v_total_split numeric := 0;
    v_request_hash text;
    v_existing_expense_id uuid;
BEGIN
    -- Generate request hash for idempotency check
    v_request_hash := encode(sha256(
        concat(
            p_household_id::text,
            p_description,
            p_amount::text,
            p_payments::text,
            p_splits::text,
            p_date::text
        )::bytea
    ), 'hex');

    -- Check idempotency if client_uuid provided
    IF p_client_uuid IS NOT NULL THEN
        SELECT expense_id INTO v_existing_expense_id
        FROM public.expense_idempotency
        WHERE client_uuid = p_client_uuid;
        
        IF v_existing_expense_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'expense_id', v_existing_expense_id,
                'idempotent', true,
                'message', 'Expense already created with this request'
            );
        END IF;
    END IF;

    -- Validate payments sum
    SELECT SUM((p->>'amount')::numeric) INTO v_total_paid
    FROM jsonb_array_elements(p_payments) p;
    
    IF abs(v_total_paid - p_amount) > 0.01 THEN
        RAISE EXCEPTION 'Payment amounts (%) do not match expense amount (%)', 
            v_total_paid, p_amount;
    END IF;

    -- Validate splits sum
    SELECT SUM((s->>'amount')::numeric) INTO v_total_split
    FROM jsonb_array_elements(p_splits) s;
    
    IF abs(v_total_split - p_amount) > 0.01 THEN
        RAISE EXCEPTION 'Split amounts (%) do not match expense amount (%)', 
            v_total_split, p_amount;
    END IF;

    -- Start transaction block
    BEGIN
        -- Create expense (paid_by will be primary payer)
        INSERT INTO public.expenses (
            household_id, 
            description, 
            amount, 
            paid_by, 
            date,
            recurring_expense_id
        )
        VALUES (
            p_household_id, 
            p_description, 
            p_amount, 
            (p_payments->0->>'payer_id')::uuid,  -- First payer as primary
            p_date,
            p_recurring_expense_id
        )
        RETURNING id INTO v_expense_id;

        -- Insert all payments
        FOR v_payment IN 
            SELECT * FROM jsonb_to_recordset(p_payments) 
            AS x(payer_id uuid, amount numeric)
        LOOP
            INSERT INTO public.expense_payments (expense_id, payer_id, amount)
            VALUES (v_expense_id, v_payment.payer_id, v_payment.amount);
            
            -- Update ledger for payer (positive balance = credit)
            PERFORM update_ledger_balance(
                p_household_id, 
                v_payment.payer_id, 
                v_payment.amount
            );
        END LOOP;

        -- Insert all splits
        FOR v_split IN 
            SELECT * FROM jsonb_to_recordset(p_splits) 
            AS x(user_id uuid, amount numeric)
        LOOP
            -- Check if this user is also a payer
            DECLARE
                v_paid_amount numeric;
            BEGIN
                SELECT COALESCE(SUM(amount), 0) INTO v_paid_amount
                FROM jsonb_to_recordset(p_payments) AS p(payer_id uuid, amount numeric)
                WHERE p.payer_id = v_split.user_id;
                
                INSERT INTO public.expense_splits (
                    expense_id, 
                    user_id, 
                    amount,
                    settled
                )
                VALUES (
                    v_expense_id, 
                    v_split.user_id, 
                    v_split.amount,
                    v_paid_amount >= v_split.amount  -- Auto-settle if paid >= owed
                );
                
                -- Update ledger for split (negative balance = debt)
                PERFORM update_ledger_balance(
                    p_household_id, 
                    v_split.user_id, 
                    -v_split.amount
                );
            END;
        END LOOP;

        -- Record idempotency if client_uuid provided
        IF p_client_uuid IS NOT NULL THEN
            INSERT INTO public.expense_idempotency (
                client_uuid, 
                expense_id, 
                request_hash
            )
            VALUES (p_client_uuid, v_expense_id, v_request_hash);
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'expense_id', v_expense_id,
            'idempotent', false,
            'message', 'Expense created successfully'
        );
        
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create expense: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 5: Robust recurring expense processing
-- =====================================================

CREATE OR REPLACE FUNCTION public.process_recurring_expenses_robust(
    p_household_id uuid DEFAULT NULL,
    p_batch_size integer DEFAULT 100
) RETURNS jsonb AS $$
DECLARE
    v_processed_count integer := 0;
    v_error_count integer := 0;
    v_recurring record;
    v_payments jsonb;
    v_splits jsonb;
    v_next_date date;
    v_result jsonb;
BEGIN
    -- Process recurring expenses with row-level locking
    FOR v_recurring IN
        SELECT * FROM public.recurring_expenses
        WHERE is_active = true
        AND next_due_date <= CURRENT_DATE
        AND (p_household_id IS NULL OR household_id = p_household_id)
        AND (last_processed_at IS NULL OR last_processed_at < next_due_date)
        ORDER BY next_due_date, id
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        BEGIN
            -- Prepare payment (single payer for recurring)
            v_payments := jsonb_build_array(
                jsonb_build_object(
                    'payer_id', v_recurring.created_by,
                    'amount', v_recurring.amount
                )
            );
            
            -- Use custom splits or calculate equal splits
            IF v_recurring.splits IS NOT NULL AND jsonb_array_length(v_recurring.splits) > 0 THEN
                v_splits := v_recurring.splits;
            ELSE
                -- Equal split among all household members
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'user_id', hm.user_id,
                        'amount', round(v_recurring.amount / COUNT(*) OVER(), 2)
                    )
                ) INTO v_splits
                FROM public.household_members hm
                WHERE hm.household_id = v_recurring.household_id;
            END IF;
            
            -- Create expense atomically
            v_result := create_expense_atomic(
                v_recurring.household_id,
                v_recurring.description || ' (Recurring)',
                v_recurring.amount,
                v_payments,
                v_splits,
                v_recurring.next_due_date,
                NULL,  -- No client_uuid for system-generated
                v_recurring.id
            );
            
            -- Calculate next due date based on frequency
            v_next_date := CASE v_recurring.frequency
                WHEN 'daily' THEN v_recurring.next_due_date + INTERVAL '1 day'
                WHEN 'weekly' THEN v_recurring.next_due_date + INTERVAL '1 week'
                WHEN 'biweekly' THEN v_recurring.next_due_date + INTERVAL '2 weeks'
                WHEN 'monthly' THEN 
                    -- Handle month-end dates properly
                    CASE 
                        WHEN v_recurring.day_of_month > 28 THEN
                            (v_recurring.next_due_date + INTERVAL '1 month')::date - 
                            ((v_recurring.day_of_month - EXTRACT(DAY FROM 
                                (v_recurring.next_due_date + INTERVAL '1 month')::date
                            ))::integer || ' days')::interval
                        ELSE
                            v_recurring.next_due_date + INTERVAL '1 month'
                    END
                WHEN 'quarterly' THEN v_recurring.next_due_date + INTERVAL '3 months'
                WHEN 'yearly' THEN v_recurring.next_due_date + INTERVAL '1 year'
                ELSE v_recurring.next_due_date + INTERVAL '1 month'
            END;
            
            -- Update recurring expense
            UPDATE public.recurring_expenses
            SET 
                next_due_date = v_next_date,
                last_processed_at = NOW(),
                updated_at = NOW()
            WHERE id = v_recurring.id;
            
            v_processed_count := v_processed_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue processing
            v_error_count := v_error_count + 1;
            RAISE WARNING 'Failed to process recurring expense %: %', 
                v_recurring.id, SQLERRM;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'processed', v_processed_count,
        'errors', v_error_count,
        'message', format('Processed %s recurring expenses with %s errors', 
            v_processed_count, v_error_count)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 6: Smart expense editing with adjustments
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_expense_with_adjustments(
    p_expense_id uuid,
    p_description text,
    p_amount numeric,
    p_payments jsonb,
    p_splits jsonb,
    p_date date,
    p_expected_version integer DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_expense record;
    v_old_payment record;
    v_old_split record;
    v_new_payment record;
    v_new_split record;
    v_adjustment_reason text;
    v_total_paid numeric := 0;
    v_total_split numeric := 0;
BEGIN
    -- Lock and get current expense with version check
    SELECT * INTO v_expense
    FROM public.expenses
    WHERE id = p_expense_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expense not found';
    END IF;
    
    -- Optimistic concurrency check
    IF p_expected_version IS NOT NULL AND v_expense.version != p_expected_version THEN
        RAISE EXCEPTION 'Expense has been modified by another user';
    END IF;
    
    -- Validate new amounts
    SELECT SUM((p->>'amount')::numeric) INTO v_total_paid
    FROM jsonb_array_elements(p_payments) p;
    
    SELECT SUM((s->>'amount')::numeric) INTO v_total_split
    FROM jsonb_array_elements(p_splits) s;
    
    IF abs(v_total_paid - p_amount) > 0.01 OR abs(v_total_split - p_amount) > 0.01 THEN
        RAISE EXCEPTION 'Payment/split amounts do not match expense amount';
    END IF;
    
    -- Start adjustment process
    v_adjustment_reason := format('Expense modified on %s', CURRENT_DATE);
    
    -- Process payment changes
    FOR v_old_payment IN 
        SELECT * FROM public.expense_payments 
        WHERE expense_id = p_expense_id
    LOOP
        -- Check if this payer still exists in new payments
        DECLARE
            v_new_amount numeric;
        BEGIN
            SELECT (p->>'amount')::numeric INTO v_new_amount
            FROM jsonb_array_elements(p_payments) p
            WHERE (p->>'payer_id')::uuid = v_old_payment.payer_id;
            
            IF v_new_amount IS NULL THEN
                -- Payer removed - reverse their payment
                PERFORM update_ledger_balance(
                    v_expense.household_id,
                    v_old_payment.payer_id,
                    -v_old_payment.amount
                );
                DELETE FROM public.expense_payments WHERE id = v_old_payment.id;
            ELSIF v_new_amount != v_old_payment.amount THEN
                -- Amount changed - adjust ledger
                PERFORM update_ledger_balance(
                    v_expense.household_id,
                    v_old_payment.payer_id,
                    v_new_amount - v_old_payment.amount
                );
                UPDATE public.expense_payments
                SET amount = v_new_amount
                WHERE id = v_old_payment.id;
            END IF;
        END;
    END LOOP;
    
    -- Add new payers
    FOR v_new_payment IN
        SELECT * FROM jsonb_to_recordset(p_payments) 
        AS x(payer_id uuid, amount numeric)
    LOOP
        INSERT INTO public.expense_payments (expense_id, payer_id, amount)
        VALUES (p_expense_id, v_new_payment.payer_id, v_new_payment.amount)
        ON CONFLICT (expense_id, payer_id) DO NOTHING;
        
        IF NOT FOUND THEN
            -- New payer - update ledger
            PERFORM update_ledger_balance(
                v_expense.household_id,
                v_new_payment.payer_id,
                v_new_payment.amount
            );
        END IF;
    END LOOP;
    
    -- Process split changes with adjustment tracking
    FOR v_old_split IN 
        SELECT * FROM public.expense_splits 
        WHERE expense_id = p_expense_id
    LOOP
        DECLARE
            v_new_amount numeric;
        BEGIN
            SELECT (s->>'amount')::numeric INTO v_new_amount
            FROM jsonb_array_elements(p_splits) s
            WHERE (s->>'user_id')::uuid = v_old_split.user_id;
            
            IF v_new_amount IS NULL THEN
                -- User removed from split
                IF v_old_split.settled THEN
                    -- Create adjustment for settled split
                    INSERT INTO public.expense_split_adjustments (
                        expense_split_id, 
                        adjustment_amount, 
                        reason, 
                        created_by
                    )
                    VALUES (
                        v_old_split.id,
                        -v_old_split.amount,
                        'User removed from expense: ' || v_adjustment_reason,
                        auth.uid()
                    );
                END IF;
                
                -- Update ledger
                PERFORM update_ledger_balance(
                    v_expense.household_id,
                    v_old_split.user_id,
                    v_old_split.amount
                );
                
                -- Soft delete by marking amount as 0
                UPDATE public.expense_splits
                SET amount = 0
                WHERE id = v_old_split.id;
                
            ELSIF v_new_amount != v_old_split.amount THEN
                -- Amount changed
                IF v_old_split.settled THEN
                    -- Create adjustment for the difference
                    INSERT INTO public.expense_split_adjustments (
                        expense_split_id, 
                        adjustment_amount, 
                        reason, 
                        created_by
                    )
                    VALUES (
                        v_old_split.id,
                        v_new_amount - v_old_split.amount,
                        v_adjustment_reason,
                        auth.uid()
                    );
                ELSE
                    -- Update unsettled split directly
                    UPDATE public.expense_splits
                    SET amount = v_new_amount
                    WHERE id = v_old_split.id;
                END IF;
                
                -- Update ledger
                PERFORM update_ledger_balance(
                    v_expense.household_id,
                    v_old_split.user_id,
                    v_old_split.amount - v_new_amount
                );
            END IF;
        END;
    END LOOP;
    
    -- Add new split users
    FOR v_new_split IN
        SELECT * FROM jsonb_to_recordset(p_splits) 
        AS x(user_id uuid, amount numeric)
    LOOP
        -- Check if split exists
        IF NOT EXISTS (
            SELECT 1 FROM public.expense_splits
            WHERE expense_id = p_expense_id
            AND user_id = v_new_split.user_id
        ) THEN
            -- New split user
            INSERT INTO public.expense_splits (
                expense_id, 
                user_id, 
                amount, 
                settled
            )
            VALUES (
                p_expense_id,
                v_new_split.user_id,
                v_new_split.amount,
                false
            );
            
            -- Update ledger
            PERFORM update_ledger_balance(
                v_expense.household_id,
                v_new_split.user_id,
                -v_new_split.amount
            );
        END IF;
    END LOOP;
    
    -- Update expense details
    UPDATE public.expenses
    SET 
        description = p_description,
        amount = p_amount,
        paid_by = (p_payments->0->>'payer_id')::uuid,
        date = p_date,
        version = version + 1,
        updated_at = NOW()
    WHERE id = p_expense_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'expense_id', p_expense_id,
        'version', v_expense.version + 1,
        'message', 'Expense updated successfully with adjustments tracked'
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update expense: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 7: Trigger to maintain ledger consistency
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_update_ledger_on_settlement()
RETURNS TRIGGER AS $$
BEGIN
    -- When a settlement is created, update ledger balances
    -- Payer's balance increases (they paid off debt)
    PERFORM update_ledger_balance(
        NEW.household_id,
        NEW.payer_id,
        NEW.amount
    );
    
    -- Payee's balance decreases (they received payment)
    PERFORM update_ledger_balance(
        NEW.household_id,
        NEW.payee_id,
        -NEW.amount
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_ledger_on_settlement ON public.settlements;
CREATE TRIGGER update_ledger_on_settlement
    AFTER INSERT ON public.settlements
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_ledger_on_settlement();

-- =====================================================
-- STEP 8: Fast balance query function
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_household_balances_fast(
    p_household_id uuid
) RETURNS TABLE(
    user_id uuid,
    balance numeric,
    profile jsonb,
    last_updated timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lb.user_id,
        lb.balance,
        jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'avatar_url', p.avatar_url,
            'email', p.email
        ) as profile,
        lb.last_updated_at
    FROM public.ledger_balances lb
    JOIN public.profiles p ON lb.user_id = p.id
    WHERE lb.household_id = p_household_id
    AND lb.balance != 0  -- Only return non-zero balances
    ORDER BY abs(lb.balance) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 9: Cleanup old idempotency records
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_idempotency_records()
RETURNS void AS $$
BEGIN
    DELETE FROM public.expense_idempotency
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 10: Initialize ledger balances from existing data
-- =====================================================

CREATE OR REPLACE FUNCTION public.initialize_ledger_balances()
RETURNS void AS $$
DECLARE
    v_household record;
    v_balance record;
BEGIN
    -- Process each household
    FOR v_household IN
        SELECT DISTINCT household_id FROM public.household_members
    LOOP
        -- Calculate and insert balances
        FOR v_balance IN
            SELECT * FROM calculate_household_balances(v_household.household_id)
        LOOP
            INSERT INTO public.ledger_balances (
                household_id, 
                user_id, 
                balance
            )
            VALUES (
                v_household.household_id,
                v_balance.userid,
                v_balance.balance
            )
            ON CONFLICT (household_id, user_id) DO UPDATE
            SET balance = EXCLUDED.balance;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run initialization
SELECT initialize_ledger_balances();