import React, { useState, useEffect, useRef } from 'react';
import { Message, Profile } from '@/lib/types/types';
import { sendMessage as sendMessageAPI, getHouseholdMessages, subscribeToMessages } from '@/lib/api/messages';
import { useAuth } from './AuthProvider';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import AIMateChat from './AIMateChat';

interface HouseholdChatProps {
  householdId: string;
  members: Profile[];
}

const HouseholdChat: React.FC<HouseholdChatProps> = ({ householdId, members }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('Group');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'Group') {
      const fetchMessages = async () => {
        const fetchedMessages = await getHouseholdMessages(householdId);
        setMessages(fetchedMessages);
      };
      fetchMessages();

      const subscription = subscribeToMessages(householdId, (newMessage) => {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        scrollToBottom();
      });

      return () => {
        if (subscription) {
            subscription.unsubscribe();
        }
      };
    }
  }, [householdId, activeTab]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && user) {
        await sendMessageAPI(householdId, newMessage);
        setNewMessage('');
    }
  };

  const getMemberName = (userId: string) => {
    const member = members.find((m) => m.id === userId);
    // Corrected to use name
    return member?.name || 'Unknown User';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-center p-2 bg-gray-100">
        <div className="flex rounded-md bg-gray-300">
            <Button
            onClick={() => setActiveTab('Group')}
            className={`${activeTab === 'Group' ? 'bg-blue-500 text-white' : ''} rounded-l-md`}
            >
            Group
            </Button>
            <Button
            onClick={() => setActiveTab('AI Mate')}
            className={`${activeTab === 'AI Mate' ? 'bg-blue-500 text-white' : ''} rounded-r-md`}
            >
            AI Mate
            </Button>
        </div>
      </div>

      {activeTab === 'Group' ? (
        <>
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex mb-2 ${
                  message.user_id === user?.id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`p-2 rounded-lg max-w-xs ${
                    message.user_id === user?.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  <div className="text-sm font-semibold">
                    {getMemberName(message.user_id)}
                  </div>
                  <div>{message.content}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t">
            <div className="flex">
              <Input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button onClick={handleSendMessage} className="ml-2">
                Send
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