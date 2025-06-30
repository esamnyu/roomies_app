// src/lib/api/profile.ts
import { supabase } from '../supabase';
import type { Profile } from '../types/types';
import { AuthorizationError } from '../errors';

export const getProfile = async (userId: string): Promise<Profile | null> => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new AuthorizationError('Authentication required');
    }
    
    // Only allow users to access their own profile or profiles of household members
    if (user.id !== userId) {
        // Check if users share a household by finding common household IDs
        const { data: userHouseholds } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', user.id);
            
        const { data: targetHouseholds } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', userId);
        
        const userHouseholdIds = userHouseholds?.map(h => h.household_id) || [];
        const targetHouseholdIds = targetHouseholds?.map(h => h.household_id) || [];
        
        const hasSharedHousehold = userHouseholdIds.some(id => targetHouseholdIds.includes(id));
        
        if (!hasSharedHousehold) {
            throw new AuthorizationError('Cannot access this profile');
        }
    }
    
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
    return data;
};

export const updateUserProfile = async (userId: string, updates: Partial<Profile>): Promise<Profile> => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new AuthorizationError('Authentication required');
    }
    
    // Users can only update their own profile
    if (user.id !== userId) {
        throw new AuthorizationError('Cannot update another user\'s profile');
    }
    
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating profile:', error);
        throw new Error(error.message);
    }
    return data;
};