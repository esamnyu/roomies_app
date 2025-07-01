import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Profile } from '@/lib/types/types';
import { sendMessage as sendMessageAPI, getHouseholdMessages, subscribeToMessages } from '@/lib/api/messages';
import { useAuth } from './AuthProvider';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import AIMateChat from './AIMateChat';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface HouseholdChatProps {
  householdId: string;
  members: Profile[];
}

const HouseholdChat: React.FC<HouseholdChatProps> = ({ householdId, members }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('Group');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewMessage = useCallback((incomingMessage: Message) => {
    console.log('New message received:', incomingMessage);
    setMessages(prev => {
      const exists = prev.some(m => m.id === incomingMessage.id);
      if (exists) {
        console.log('Message already exists, skipping:', incomingMessage.id);
        return prev;
      }
      const updated = [...prev, incomingMessage];
      console.log('Messages updated, total count:', updated.length);
      return updated.slice(-100);
    });
    setTimeout(scrollToBottom, 100);
  }, []);

  useEffect(() => {
    if (activeTab === 'Group') {
      let mounted = true;
      const loadAndSubscribe = async () => {
        if (!mounted) return;
        try {
          setLoading(true);
          const initialMessages = await getHouseholdMessages(householdId);
          if (mounted) {
            setMessages(initialMessages);
            setTimeout(scrollToBottom, 100);
          }
        } catch (error) {
          console.error('Error loading initial messages:', error);
          if (mounted) {
            toast.error('Failed to load messages');
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

      loadAndSubscribe();

      const subscription = subscribeToMessages(householdId, (message) => {
        if (mounted) {
          handleNewMessage(message);
        } else {
          console.warn('Received message but component is unmounted');
        }
      });

      return () => {
        mounted = false;
        if (subscription && subscription.unsubscribe) {
          console.log('Unsubscribing from messages for household:', householdId);
          subscription.unsubscribe();
        } else {
          console.warn('No subscription to unsubscribe from');
        }
      };
    }
  }, [householdId, activeTab, handleNewMessage]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await sendMessageAPI(householdId, messageText);
      // Message should appear via realtime subscription
      // If it doesn't appear within 2 seconds, reload messages
      setTimeout(async () => {
        const currentMessages = messages;
        if (!currentMessages.some(m => m.content === messageText && m.user_id === user?.id)) {
          console.warn('Message not received via realtime, reloading...');
          try {
            const freshMessages = await getHouseholdMessages(householdId);
            setMessages(freshMessages);
          } catch (error) {
            console.error('Error reloading messages:', error);
          }
        }
      }, 2000);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Could not send message.");
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMemberName = (userId: string) => {
    const member = members.find((m) => m.id === userId);
    return member?.name || 'Unknown User';
  };
  
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border">
      <div className="flex justify-center p-2 bg-gray-100/50">
        <div className="flex rounded-md bg-secondary p-1 space-x-2">
          <Button
            onClick={() => setActiveTab('Group')}
            variant={activeTab === 'Group' ? 'default' : 'secondary'}
            size="sm"
            className="w-24"
          >
            Group
          </Button>
          <Button
            onClick={() => setActiveTab('AI Mate')}
            variant={activeTab === 'AI Mate' ? 'default' : 'secondary'}
            size="sm"
            className="w-24"
          >
            AI Mate
          </Button>
        </div>
      </div>

      {activeTab === 'Group' ? (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-secondary-foreground mt-8">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.user_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-secondary text-secondary-foreground rounded-bl-none'
                      }`}
                    >
                      {!isOwnMessage && (
                        <p className="text-xs font-medium mb-1 opacity-75">
                          {getMemberName(message.user_id)}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      <p
                        className={`text-xs mt-1 opacity-70 text-right ${
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
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1"
                disabled={sending}
              />
              <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4"/>}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <AIMateChat />
      )}
    </div>
  );
};

export default HouseholdChat;