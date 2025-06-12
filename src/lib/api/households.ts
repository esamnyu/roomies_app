// src/lib/api/households.ts
import { supabase } from '../supabase';
import type { Household, HouseholdMember, HouseRule, CreateHouseholdParams } from '../types/types';
import { initializeChoresForHousehold } from './chores';

// --- HOUSEHOLD FUNCTIONS ---
export const createHousehold = async (params: CreateHouseholdParams) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const householdInsertData: Partial<Household> = {
    name: params.name,
    created_by: user.id,
    member_count: params.member_count,
    core_chores: params.core_chores,
    chore_frequency: params.chore_frequency as Household['chore_frequency'],
    chore_framework: params.chore_framework as Household['chore_framework'],
    last_chore_rotation_date: null,
    next_chore_rotation_date: null,
  };

  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert(householdInsertData)
    .select()
    .single();

  if (householdError) throw householdError;

  const { error: memberError } = await supabase
    .from('household_members')
    .insert({ household_id: household.id, user_id: user.id, role: 'admin' });

  if (memberError) {
    await supabase.from('households').delete().eq('id', household.id);
    throw memberError;
  }

  if (household.core_chores && household.core_chores.length > 0) {
    await initializeChoresForHousehold(household.id, household as Household);
  }

  return household;
};

export const getUserHouseholds = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .rpc('get_user_households_with_counts', { p_user_id: user.id })

  if (error) {
    console.error('Error in getUserHouseholds RPC:', error);
    throw error
  }
  return data || []
}

export const getHouseholdData = async (householdId: string) => {
  const { data, error } = await supabase
    .rpc('get_household_data', { p_household_id: householdId })
  if (error) throw error
  return data
}

export const getHouseholdDetails = async (householdId: string): Promise<Household | null> => {
  const { data, error } = await supabase
    .from('households')
    .select('*, rules, rules_last_updated')
    .eq('id', householdId)
    .single();

  if (error) {
    console.error('Error fetching household details:', error);
    throw error;
  }
  return data;
};

// --- MEMBER MANAGEMENT ---

export const getHouseholdMembers = async (householdId: string): Promise<HouseholdMember[]> => {
  const { data, error } = await supabase
    .from('household_members')
    .select(`
      *,
      profiles (*)
    `)
    .eq('household_id', householdId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching household members:', error);
    throw error;
  }
  return data || [];
};

export const updateMemberRole = async (memberId: string, role: 'admin' | 'member') => {
    const { data, error } = await supabase
        .from('household_members')
        .update({ role })
        .eq('id', memberId)
        .select()
        .single();
    if (error) {
        console.error("Error updating member role:", error);
        throw error;
    }
    return data;
};

export const removeMember = async (memberId: string) => {
    const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('id', memberId);
    if (error) {
        console.error("Error removing member:", error);
        throw error;
    }
    return true;
};

// --- SETTINGS & MANAGEMENT FUNCTIONS ---

export const updateHouseholdSettings = async (householdId: string, updates: Partial<Household>) => {
    const { data, error } = await supabase
        .from('households')
        .update(updates)
        .eq('id', householdId)
        .select()
        .single();

    if (error) {
        console.error("Error updating household settings:", error);
        throw error;
    }
    return data;
};

export const leaveHousehold = async (householdId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', householdId)
        .eq('user_id', user.id);

    if (error) {
        console.error("Error leaving household:", error);
        throw error;
    }
    return true;
};

export const deleteHousehold = async (householdId: string) => {
    const { error } = await supabase
        .from('households')
        .delete()
        .eq('id', householdId);

    if (error) {
        console.error("Error deleting household:", error);
        throw error;
    }
    return true;
};

// --- HOUSE RULES FUNCTIONS ---

export const addHouseRule = async (householdId: string, category: string, content: string): Promise<Household> => {
    if (!householdId || !category || !content) {
        throw new Error("Household ID, category, and content are required.");
    }

    const { data: household, error: fetchError } = await supabase
        .from('households')
        .select('rules')
        .eq('id', householdId)
        .single();

    if (fetchError || !household) {
        throw new Error("Could not retrieve household to add rule.");
    }

    const newRule = {
        id: `rule_${Date.now()}_${Math.random()}`,
        category,
        content,
    };

    const existingRules = household.rules || [];
    const updatedRules = [...existingRules, newRule];

    const { data, error } = await supabase
        .from('households')
        .update({
            rules: updatedRules,
            rules_last_updated: new Date().toISOString()
        })
        .eq('id', householdId)
        .select()
        .single();

    if (error) {
        console.error("Error adding house rule:", error);
        throw error;
    }

    return data;
}

export const updateHouseRule = async (householdId: string, updatedRule: HouseRule): Promise<Household> => {
    if (!householdId || !updatedRule || !updatedRule.id) {
        throw new Error("Household ID and a complete rule object with ID are required.");
    }

    const { data: household, error: fetchError } = await supabase
        .from('households')
        .select('rules')
        .eq('id', householdId)
        .single();

    if (fetchError || !household) {
        throw new Error("Could not retrieve household to update rule.");
    }

    const existingRules = household.rules || [];
    const ruleIndex: number = (existingRules as HouseRule[]).findIndex((rule: HouseRule) => rule.id === updatedRule.id);

    if (ruleIndex === -1) {
        throw new Error("Rule not found to update.");
    }

    const updatedRules = [...existingRules];
    updatedRules[ruleIndex] = updatedRule;

    const { data, error } = await supabase
        .from('households')
        .update({
            rules: updatedRules,
            rules_last_updated: new Date().toISOString()
        })
        .eq('id', householdId)
        .select()
        .single();

    if (error) {
        console.error("Error updating house rule:", error);
        throw error;
    }

    return data;
}

export const deleteHouseRule = async (householdId: string, ruleId: string): Promise<Household> => {
    if (!householdId || !ruleId) {
        throw new Error("Household ID and Rule ID are required.");
    }

    const { data: household, error: fetchError } = await supabase
        .from('households')
        .select('rules')
        .eq('id', householdId)
        .single();

    if (fetchError || !household) {
        throw new Error("Could not retrieve household to delete rule.");
    }

    const existingRules = household.rules || [];
    const updatedRules: HouseRule[] = (existingRules as HouseRule[]).filter((rule: HouseRule) => rule.id !== ruleId);

    if (existingRules.length === updatedRules.length) {
        console.warn("Rule with ID not found, no changes made.");
    }

    const { data, error } = await supabase
        .from('households')
        .update({
            rules: updatedRules,
            rules_last_updated: new Date().toISOString()
        })
        .eq('id', householdId)
        .select()
        .single();

    if (error) {
        console.error("Error deleting house rule:", error);
        throw error;
    }

    return data;
}

// --- JOIN CODE FUNCTIONS ---
const generateRandomCode = (length = 4): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export const generateAndGetHouseholdJoinCode = async (householdId: string): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: memberData, error: memberCheckError } = await supabase
    .from('household_members').select('role').eq('household_id', householdId).eq('user_id', user.id).single();
  if (memberCheckError || !memberData) { throw new Error('You are not authorized to manage this household.'); }
  const newCode = generateRandomCode(4);
  const { data: updatedHousehold, error: updateError } = await supabase
    .from('households').update({ join_code: newCode }).eq('id', householdId).select('join_code').single();
  if (updateError || !updatedHousehold?.join_code) { console.error('Error generating or updating join code:', updateError); throw new Error('Could not generate or update join code.'); }
  return updatedHousehold.join_code;
};

export const getActiveHouseholdJoinCode = async (householdId: string): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { count, error: memberCheckError } = await supabase
    .from('household_members').select('*', { count: 'exact', head: true }).eq('household_id', householdId).eq('user_id', user.id);
  if (memberCheckError || count === 0) { throw new Error('You are not authorized to view this household\'s join code.');}
  const { data: household, error } = await supabase.from('households').select('join_code').eq('id', householdId).single();
  if (error) { console.error('Error fetching join code:', error); return null; }
  return household?.join_code || null;
};

export const joinHouseholdWithCode = async (joinCode: string): Promise<Household> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated. Please log in to join a household.');
  const normalizedCode = joinCode.toUpperCase().trim();
  if (normalizedCode.length !== 4) { throw new Error('Invalid join code format. Code must be 4 characters.'); }
  const { data: household, error: householdError } = await supabase
    .from('households').select('id, name, member_count, join_code').eq('join_code', normalizedCode).single();
  if (householdError || !household) { console.error('Error finding household by code:', householdError); throw new Error('Invalid or expired join code.');}
  const { data: existingMember, error: existingMemberError } = await supabase
    .from('household_members').select('id').eq('household_id', household.id).eq('user_id', user.id).single();
  if (existingMember) { throw new Error('You are already a member of this household.'); }
  if (existingMemberError && existingMemberError.code !== 'PGRST116') { throw existingMemberError; }
  const { data: members, error: membersError } = await supabase
    .from('household_members').select('user_id').eq('household_id', household.id);
  if (membersError) { console.error('Error fetching current members:', membersError); throw new Error('Could not verify household capacity.'); }
  const currentMemberCount = members?.length || 0;
  if (household.member_count && currentMemberCount >= household.member_count) { throw new Error('This household is currently full.');}
  const { error: addMemberError } = await supabase
    .from('household_members').insert({ household_id: household.id, user_id: user.id, role: 'member' });
  if (addMemberError) { console.error('Error adding member to household:', addMemberError); throw new Error('Failed to join household. Please try again.'); }
  return household as Household;
};
