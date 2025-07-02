import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Bot, Send, X, AlertCircle, Info, Sparkles, MessageSquare, Zap } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  debug?: {
    context_tokens: number;
    context_types: string[];
  };
}

interface AIMateChatRAGProps {
  householdId: string;
}

export function AIMateChatRAG({ householdId }: AIMateChatRAGProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const suggestedPrompts = [
    "Who paid the last rent?",
    "How much do I owe for groceries?",
    "What chores are assigned to me this week?",
    "What's the WiFi password?",
    "Show me recent expenses"
  ];

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch('/api/ai-chat-rag-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: input,
          householdId,
          conversationHistory: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content.substring(0, 200) // Limit length
          }))
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        debug: data.debug
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6 bg-muted/10" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md mx-auto">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center mx-auto mb-6">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">AI Assistant</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  I'm your household's AI assistant with real-time access to your data
                </p>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>Expenses & Bills</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Chore Schedules</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span>House Rules</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4 text-primary" />
                    <span>General Info</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Popular Questions</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestedPrompts.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handlePromptClick(prompt)}
                        className="text-xs rounded-full px-4 py-1 hover:bg-primary/10 border-border/50"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isUser = message.role === 'user';
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      <div
                        className={`
                          px-4 py-2.5 rounded-2xl shadow-sm
                          ${isUser
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-background border border-border/50 text-foreground rounded-bl-sm'
                          }
                        `}
                      >
                        {message.role === 'assistant' ? (
                          <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {message.content}
                          </p>
                        )}
                      </div>
                      {showDebug && message.debug && (
                        <div className="mt-1 px-1 text-xs text-muted-foreground">
                          <span className="opacity-60">
                            {message.debug.context_tokens} tokens • 
                            Intent: {message.debug.intent} ({(message.debug.confidence * 100).toFixed(0)}%)
                          </span>
                        </div>
                      )}
                    </div>
                    {isUser && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                        {user?.user_metadata?.name?.charAt(0).toUpperCase() || 'Y'}
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex items-start gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-background border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
      <div className="p-4 bg-background/50 backdrop-blur-sm border-t border-border/50">
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive mb-3 px-1">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about expenses, chores, or household info..."
              className="pr-12 py-5 rounded-full border-border/50 bg-background/80 backdrop-blur-sm focus:bg-background transition-colors"
              disabled={isLoading}
            />
            <Button 
              onClick={isLoading ? handleCancel : sendMessage} 
              disabled={!isLoading && !input.trim()}
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 p-0"
              variant={isLoading ? "secondary" : "primary"}
            >
              {isLoading ? (
                <X className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4"/>
              )}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="rounded-full px-3 hidden sm:flex"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-center mt-2">
          <p className="text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              RAG-enhanced • Real-time household data
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}