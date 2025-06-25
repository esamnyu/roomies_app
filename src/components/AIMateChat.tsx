// components/AIMateChat.tsx - Enhanced version
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'model' | 'error';
  content: string;
  timestamp: Date;
}

const AIMateChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    role: 'model',
    content: "Hi! I'm your AI Mate. I can help with:\n\n• 🏠 Household chores and scheduling\n• 💰 Splitting expenses fairly\n• 🤝 Resolving roommate conflicts\n• 📋 Setting house rules\n\nWhat would you like to discuss?",
    timestamp: new Date()
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: trimmedInput,
          history: chatHistory 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setChatHistory(data.history);
      
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'error',
        content: 'Sorry, I couldn\'t process your message. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, chatHistory]);

  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      role: 'model',
      content: "Chat cleared! How can I help you with your household management?",
      timestamp: new Date()
    }]);
    setChatHistory([]);
    toast.success('Chat cleared');
  };

  // Suggested prompts for new users
  const suggestedPrompts = [
    "How do we fairly split rent when rooms are different sizes?",
    "What's a good chore rotation system?",
    "How to handle a messy roommate?",
    "Setting quiet hours rules"
  ];

  return (
    <div className="flex flex-col h-[500px] bg-background rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium">AI Mate Assistant</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearChat}
          title="Clear chat"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 1 && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInput(prompt)}
                className="text-left text-xs p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                {msg.role === 'error' ? '⚠️' : '🤖'}
              </div>
            )}
            
            <div
              className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : msg.role === 'error'
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                  : 'bg-secondary text-secondary-foreground rounded-bl-none'
              }`}
            >
              <ReactMarkdown 
                className="prose prose-sm dark:prose-invert max-w-none"
                components={{
                  ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground">
                You
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              🤖
            </div>
            <div className="px-4 py-2 rounded-2xl bg-secondary rounded-bl-none">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about household management..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AIMateChat;