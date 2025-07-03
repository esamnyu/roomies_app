// src/lib/api/messages.ts
import { supabase } from '../supabase';
import { enhancedSubscriptionManager as subscriptionManager } from '../enhancedSubscriptionManager';
import type { Message, MessageWithProfileRPC } from '../types/types';
import { validateInput, sendMessageSchema } from './validation/schemas';
import { requireHouseholdMember } from './auth/middleware';
import DOMPurify from 'isomorphic-dompurify';

export const sendMessage = async (householdId: string, content: string): Promise<Message> => {
  const { data: { user } } = await supabase.auth.getUser(); 
  if (!user) throw new Error('Not authenticated');
  
  // Validate input
  const validatedInput = validateInput(sendMessageSchema, { householdId, content });
  
  // Verify user is a member of the household
  await requireHouseholdMember(validatedInput.householdId, user.id);
  
  // Sanitize the content to prevent XSS attacks
  // Allow only basic formatting tags
  const sanitizedContent = DOMPurify.sanitize(validatedInput.content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    FORCE_BODY: true
  });
  
  // Additional check: if sanitization removed too much content, reject
  if (sanitizedContent.length < validatedInput.content.length * 0.5) {
    throw new Error('Message contains too much invalid content');
  }
  
  const { data, error } = await supabase
    .from('messages')
    .insert({ 
      household_id: validatedInput.householdId, 
      user_id: user.id, 
      content: sanitizedContent.trim() 
    })
    .select()
    .single(); 
    
  if (error) throw error;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  return { ...data, profiles: profile || undefined } as Message;
};

export const getHouseholdMessages = async (householdId: string, limit = 50, before?: string): Promise<Message[]> => {
  const { data, error } = await supabase.rpc('get_messages_with_profiles', { 
    p_household_id: householdId, 
    p_limit: limit, 
    p_before: before 
  }); 
  
  if (error) throw error;
  
  return ((data || []) as MessageWithProfileRPC[])
    .map((msg: MessageWithProfileRPC) => ({ ...msg, profiles: msg.profile }))
    .reverse();
};

export const subscribeToMessages = (householdId: string, onMessage: (message: Message) => void) => {
  const key = `messages:${householdId}`;
  
  // Always clean up existing subscription and create a new one
  // This ensures we have fresh subscriptions and proper cleanup
  subscriptionManager.unsubscribe(key);
  
  const channel = supabase
    .channel(key)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `household_id=eq.${householdId}`
    }, async (payload) => {
      console.log(`New message received for ${key}:`, payload);
      if (payload.new) {
        const newMessage = payload.new as Message;
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMessage.user_id)
            .single();

          onMessage({ ...newMessage, profiles: profile || undefined });
        } catch (error) {
          console.error('Error fetching profile for new message:', error);
          // Still deliver the message even if profile fetch fails
          onMessage(newMessage);
        }
      }
    });

  // Subscribe through the subscription manager which handles the actual subscription
  const managedChannel = subscriptionManager.subscribe(key, channel);
  
  if (managedChannel) {
    managedChannel.subscribe((status, err) => {
      if (err) {
        console.error(`Subscription error for ${key}:`, err);
        // Clean up failed subscription
        subscriptionManager.unsubscribe(key);
      } else {
        console.log(`Subscription status for ${key}:`, status);
      }
    });
  }
  
  // Return an object with unsubscribe method for proper cleanup
  return {
    unsubscribe: () => subscriptionManager.unsubscribe(key)
  };
};