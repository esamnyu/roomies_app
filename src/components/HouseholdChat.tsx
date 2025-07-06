import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Profile } from '@/lib/types/types';
import { sendMessage as sendMessageAPI, getHouseholdMessages, subscribeToMessages } from '@/lib/api/messages';
import { useAuth } from './AuthProvider';
import { Input } from '@/components/primitives/Input';
import { Button } from '@/components/primitives/Button';
import { AIMateChatRAG } from './AIMateChat-RAG';
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
    setMessages(prev => {
      const exists = prev.some(m => m.id === incomingMessage.id);
      if (exists) {
        return prev;
      }
      const updated = [...prev, incomingMessage];
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
    <div className="flex flex-col h-full">
      <div className="flex justify-center px-4 py-3 border-b border-border/50">
        <div className="flex rounded-full bg-secondary/20 p-1 gap-1">
          <Button
            onClick={() => setActiveTab('Group')}
            variant="ghost"
            size="sm"
            className={`
              px-6 py-1.5 rounded-full transition-all duration-200
              ${activeTab === 'Group' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'hover:bg-secondary/50 text-muted-foreground'
              }
            `}
          >
            Group Chat
          </Button>
          <Button
            onClick={() => setActiveTab('AI Mate')}
            variant="ghost"
            size="sm"
            className={`
              px-6 py-1.5 rounded-full transition-all duration-200
              ${activeTab === 'AI Mate' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'hover:bg-secondary/50 text-muted-foreground'
              }
            `}
          >
            AI Assistant
          </Button>
        </div>
      </div>

      {activeTab === 'Group' ? (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-muted/10">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm mx-auto">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Send className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Start the conversation</h3>
                  <p className="text-sm text-muted-foreground">Send a message to your household members</p>
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.user_id === user?.id;
                const memberName = getMemberName(message.user_id);
                const memberInitial = memberName.charAt(0).toUpperCase();
                
                return (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isOwnMessage && (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                        {memberInitial}
                      </div>
                    )}
                    <div className={`group flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      {!isOwnMessage && (
                        <p className="text-xs font-medium text-muted-foreground mb-1 ml-1">
                          {memberName}
                        </p>
                      )}
                      <div
                        className={`
                          px-4 py-2.5 rounded-2xl shadow-sm
                          ${isOwnMessage
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-background border border-border/50 text-foreground rounded-bl-sm'
                          }
                        `}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 px-1">
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                    {isOwnMessage && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                        {user?.user_metadata?.name?.charAt(0).toUpperCase() || 'Y'}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 bg-background/50 backdrop-blur-sm border-t border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="pr-12 py-6 rounded-full border-border/50 bg-background/80 backdrop-blur-sm focus:bg-background transition-colors"
                  disabled={sending}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!newMessage.trim() || sending}
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 p-0"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4"/>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <AIMateChatRAG householdId={householdId} />
      )}
    </div>
  );
};

export default HouseholdChat;