// src/lib/api/messages.ts
import { supabase } from '../supabase';
import { subscriptionManager } from '../subscriptionManager';
import type { Message, MessageWithProfileRPC } from '../types/types';


export const sendMessage = async (householdId: string, content: string): Promise<Message> => {
  const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('messages').insert({ household_id: householdId, user_id: user.id, content: content.trim() }).select().single(); if (error) throw error;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return { ...data, profiles: profile || undefined } as Message;
};

export const getHouseholdMessages = async (householdId: string, limit = 50, before?: string): Promise<Message[]> => {
  const { data, error } = await supabase.rpc('get_messages_with_profiles', { p_household_id: householdId, p_limit: limit, p_before: before }); if (error) throw error;
  return ((data || []) as MessageWithProfileRPC[]).map((msg: MessageWithProfileRPC) => ({ ...msg, profiles: msg.profile })).reverse();
};

export const subscribeToMessages = (householdId: string, onMessage: (message: Message) => void) => {
    const key = `messages:${householdId}`;
    const channel = supabase.channel(key)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `household_id=eq.${householdId}`
      }, async (payload) => {
          if (payload.new) {
            const newMessage = payload.new as Message;
            // Fetch the profile separately to keep the realtime payload light
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newMessage.user_id)
              .single();

            onMessage({ ...newMessage, profiles: profile || undefined });
          }
      })
      .subscribe((status, err) => {
        if (err) {
          console.error(`Subscription error for ${key}:`, err);
        }
      });

    return subscriptionManager.subscribe(key, channel);
};