-- Fix notification types to include chore management notifications

-- First, drop the existing check constraint
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the new check constraint with all notification types including chore management
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'expense_added',
    'payment_reminder',
    'task_assigned',
    'task_completed',
    'settlement_recorded',
    'recurring_expense_added',
    'member_joined',
    'member_left',
    'household_invitation',
    'message_sent',
    'chore_assigned',
    'chore_reminder',
    'chore_completed',
    'chore_missed',
    -- New chore management notification types
    'chore_snoozed',
    'chores_swapped',
    'chore_delegated',
    'chores_assigned'
));

-- Also update the TypeScript types by adding these to the Notification type in types.ts