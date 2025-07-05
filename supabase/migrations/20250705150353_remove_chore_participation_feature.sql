-- Remove chore participation feature completely

-- First drop all triggers that depend on the functions
DROP TRIGGER IF EXISTS add_participants_for_new_chore ON household_chores;
DROP TRIGGER IF EXISTS on_new_chore_created ON household_chores;
DROP TRIGGER IF EXISTS handle_new_chore_participants_trigger ON chore_participants;
DROP TRIGGER IF EXISTS handle_new_member_chore_participation_trigger ON household_members;
DROP TRIGGER IF EXISTS add_chore_participation_for_new_member ON household_members;

-- Drop functions that depend on chore_participants table
DROP FUNCTION IF EXISTS batch_update_chore_participation(uuid, jsonb);
DROP FUNCTION IF EXISTS ensure_chore_participants_exist(uuid, uuid);
DROP FUNCTION IF EXISTS get_household_chores_with_participants_safe(uuid, uuid);
DROP FUNCTION IF EXISTS populate_initial_chore_participants(uuid);

-- Drop trigger functions
DROP FUNCTION IF EXISTS handle_new_chore_participants();
DROP FUNCTION IF EXISTS handle_new_member_chore_participation();

-- Drop the chore_participants table (this will automatically drop all indexes and constraints)
DROP TABLE IF EXISTS chore_participants CASCADE;

-- Remove participation-related columns from household_chores if they exist
ALTER TABLE household_chores 
DROP COLUMN IF EXISTS min_participants;

-- Drop any foreign key constraints that might reference chore_participants
-- (These would have been dropped with the table, but being explicit)

-- Clean up any remaining references in other tables
-- Update chore assignments if needed to remove participation references
UPDATE chore_assignments 
SET generation_method = 'manual' 
WHERE generation_method IS NULL OR generation_method = 'participation';

-- Remove any test pages or components (these will be handled in the code)
-- Note: Test components like TestChoreParticipation.tsx and related files 
-- should be removed from the codebase separately

-- Add a comment to document this removal
COMMENT ON TABLE household_chores IS 'Chores for households. Participation feature removed on 2025-01-07.';