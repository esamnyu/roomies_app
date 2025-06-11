"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import * as api from '@/lib/api';
import { subscriptionManager } from '@/lib/subscriptionManager';
import type { Message } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';

interface HouseholdChatProps {
  householdId: string;
}

export const HouseholdChat: React.FC<HouseholdChatProps> = ({ householdId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewMessage = useCallback((incomingMessage: Message) => {
    setMessages(prev => {
      const exists = prev.some(m => m.id === incomingMessage.id);
      if (exists) return prev;

      const updated = [...prev, incomingMessage];
      return updated.slice(-100); // Only keep the last 100 messages
    });
    setTimeout(scrollToBottom, 100);
  }, []);

  useEffect(() => {
    const loadAndSubscribe = async () => {
      try {
        setLoading(true);
        const initialMessages = await api.getHouseholdMessages(householdId);
        setMessages(initialMessages);
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Error loading initial messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAndSubscribe();

    const subscriptionKey = `messages:${householdId}`;
    // The 'subscription' variable was removed as it was unused.
    api.subscribeToMessages(householdId, handleNewMessage);

    return () => {
      subscriptionManager.unsubscribe(subscriptionKey);
    };
  }, [householdId, handleNewMessage]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await api.sendMessage(householdId, messageText);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Could not send message.");
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
             ' ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-background rounded-lg shadow border border-border">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-secondary-foreground mt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.user_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] ${
                    isOwnMessage
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  } rounded-lg px-4 py-2`}
                >
                  {!isOwnMessage && (
                    <p className="text-xs font-medium mb-1 opacity-75">
                      {message.profiles?.name}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 opacity-70 ${
                      isOwnMessage ? 'text-primary-foreground' : 'text-secondary-foreground'
                    }`}
                  >
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-input rounded-full focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            size="default"
            className="rounded-full w-10 h-10 p-0 flex-shrink-0"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
