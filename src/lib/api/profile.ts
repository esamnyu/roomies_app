// src/lib/api/profile.ts
import { supabase } from '../supabase';
import type { Profile } from '../types/types';

export const getProfile = async (userId: string): Promise<Profile | null> => {
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