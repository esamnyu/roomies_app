// src/lib/api/profile.ts
import { supabase } from '../supabase';
import type { Profile } from '../types/types';

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return { data, error };
};

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  return { data, error };
};

export const getProfileWithEmail = async (userId: string) => {
  const { data, error } = await supabase.from('profiles').select('*, email').eq('id', userId).single();
  return { data, error };
};