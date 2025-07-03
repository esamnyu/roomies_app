// src/lib/api/settlements.ts
import { supabase } from '../supabase';
import { enhancedSubscriptionManager as subscriptionManager } from '../enhancedSubscriptionManager';
import type { Settlement, Profile } from '../types/types';

// This function is updated to accept a single object.
export const createSettlement = async (settlement: Omit<Settlement, 'id' | 'created_at' | 'payer_profile' | 'payee_profile'>) => {
  // MODIFIED: Changed RPC call to the correct function name 'create_settlement'
  const { data, error } = await supabase
    .rpc('create_settlement', {
      p_household_id: settlement.household_id,
      p_payer_id: settlement.payer_id,
      p_payee_id: settlement.payee_id,
      p_amount: settlement.amount,
      p_description: settlement.description
    })
    .select(`
      *,
      payer_profile:profiles!settlements_payer_id_fkey(id, name, avatar_url),
      payee_profile:profiles!settlements_payee_id_fkey(id, name, avatar_url)
    `)
    .single();

  if (error) {
    console.error("Error creating settlement:", error);
    throw error;
  }

  // The 'create_settlement' function returns a SETOF settlements, so it will be an array.
  // We return the first element to match the expected return type.
  return Array.isArray(data) ? data[0] : data;
};

export const getHouseholdSettlements = async (householdId: string) => {
  const { data, error } = await supabase
    .from('settlements')
    .select(`
      *,
      payer_profile:profiles!settlements_payer_id_fkey(id, name, avatar_url),
      payee_profile:profiles!settlements_payee_id_fkey(id, name, avatar_url)
    `)
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
};

export const subscribeToSettlements = (householdId: string, onSettlement: (settlement: Settlement) => void) => {
  const key = `settlements:${householdId}`;
  
  if (subscriptionManager.hasSubscription(key)) {
    console.log(`Already subscribed to ${key}, skipping...`);
    return;
  }
  
  const channel = supabase
    .channel(key)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'settlements',
      filter: `household_id=eq.${householdId}`
    }, async (payload) => {
      if (payload.new) {
        const newSettlement = payload.new as Settlement;
        const { data } = await supabase
          .from('settlements')
          .select(`
            *,
            payer_profile:profiles!settlements_payer_id_fkey(id, name, avatar_url),
            payee_profile:profiles!settlements_payee_id_fkey(id, name, avatar_url)
          `)
          .eq('id', newSettlement.id)
          .single();
        if (data) onSettlement(data);
      }
    })
    .subscribe((status, err) => {
      if (err) {
        console.error(`Subscription error for ${key}:`, err);
      } else {
        console.log(`Subscription status for ${key}:`, status);
      }
    });
    
  return subscriptionManager.subscribe(key, channel);
};

// --- NEW EFFICIENT BALANCE CALCULATION ---

export const getHouseholdBalances = async (householdId: string) => {
  const { data, error } = await supabase
    .rpc('get_household_balances_fast', {
      p_household_id: householdId
    });

  if (error) {
    console.error("Error fetching household balances:", error);
    throw error;
  }
  
  interface HouseholdBalance {
    userId: string;
    balance: number;
    profile: Profile;
  }

  type RawBalance = {
    user_id: string;
    balance: number;
    profile: Profile;
  };

  return (data?.map((item: RawBalance): HouseholdBalance => ({
    userId: item.user_id,
    balance: item.balance,
    profile: item.profile
  })) || []) as HouseholdBalance[];
};

// --- SETTLEMENT SUGGESTION HELPER ---
export type SettlementSuggestion = { from: string; to: string; amount: number; fromProfile: Profile; toProfile: Profile };

// Import the new optimal settlement algorithm
import { getOptimalSettlementSuggestions } from './optimal-settlements';

// Delegate to the new optimal algorithm which handles 2-20 users efficiently
export const getSettlementSuggestions = (balances: Awaited<ReturnType<typeof getHouseholdBalances>>): SettlementSuggestion[] => {
  return getOptimalSettlementSuggestions(balances);
};
