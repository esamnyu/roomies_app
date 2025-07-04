-- Test the balance calculation directly
-- Replace the household_id with your actual household ID
WITH household_id AS (
    SELECT household_id FROM households LIMIT 1
)
SELECT 
    le.user_id,
    p.name as user_name,
    SUM(CASE 
        WHEN le.entry_type = 'credit' THEN le.amount 
        WHEN le.entry_type = 'debit' THEN -le.amount 
        ELSE 0 
    END) as calculated_balance
FROM ledger_entries le
JOIN profiles p ON p.id = le.user_id
WHERE le.household_id = (SELECT household_id FROM household_id)
GROUP BY le.user_id, p.name
HAVING SUM(CASE 
    WHEN le.entry_type = 'credit' THEN le.amount 
    WHEN le.entry_type = 'debit' THEN -le.amount 
    ELSE 0 
END) != 0;