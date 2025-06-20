import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { GoogleGenerativeAI } from "@google/generative-ai"; 
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// ====================================================================================
// IMPORTANT: YOU MUST ADD YOUR GEMINI API KEY HERE
// Get your key from Google AI Studio: https://aistudio.google.com/app/apikey
// ====================================================================================
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;


// --- Component ---

const AIMateChat: React.FC = () => {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const chat = useMemo(() => {
        if (!API_KEY) {
            setError("API Key is missing. Please add it to AIMateChat.tsx");
            return null;
        }
        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
            
            // 1. Define the system instruction for the AI model
            const systemInstruction = {
                role: "system",
                parts: [{ text: "You are 'AI Mate', a helpful assistant for roommates using the Roomies app. Your goal is to provide advice and information strictly related to shared living, roommate etiquette, conflict resolution, managing shared expenses, and organizing chores. Do not answer questions outside of this scope. If a user asks an unrelated question, politely decline by saying 'I can only help with questions about roommate and household management. Try to wrap up answers within 200 words'"}]
            };

            // 2. Add the system instruction and update token limit in the chat configuration
            return model.startChat({
                history: [],
                generationConfig: {
                    maxOutputTokens: 1000, // Updated token limit
                },
                systemInstruction: systemInstruction,
            });
        } catch (e) {
            console.error("Error initializing GoogleGenAI:", e);
            setError("Failed to initialize the AI model. Check the API key and console for errors.");
            return null;
        }
    }, []);

    const sendMessage = async () => {
        if (!input.trim() || isLoading || !chat) {
            if (!chat && API_KEY) {
                setError("AI chat could not be initialized. Check console for details.");
            }
            return;
        }

        const userMessage = { role: 'user', parts: [{ text: input }] };
        setMessages((prev) => [...prev, userMessage]);
        
        const userText = input;
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const stream = await chat.sendMessageStream(userText);
            let modelResponseText = '';
            setMessages((prev) => [...prev, { role: 'model', parts: [{ text: modelResponseText }] }]);

            for await (const chunk of stream.stream) {
                const chunkText = chunk.text();
                modelResponseText += chunkText;
                setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].parts[0].text = modelResponseText;
                    return newMessages;
                });
            }

        } catch (e) {
            console.error('Error sending message to Gemini API:', e);
            const errorMessage = {
                role: 'model',
                parts: [{ text: 'Sorry, something went wrong. Please check the console for details.' }],
            };
            setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
            setError('An error occurred while fetching the response.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!API_KEY) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <h3 className="font-bold text-red-700">Chat Configuration Error</h3>
                <p className="text-sm text-red-600 mt-2">The Gemini API Key is missing.</p>
                <p className="text-xs text-gray-500 mt-1">Please add it to the `API_KEY` constant in `src/components/AIMateChat.tsx`.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[500px] bg-background rounded-lg border">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !isLoading && (
                     <div className="flex items-end gap-2 justify-start">
                        <div className="max-w-xs px-4 py-2 rounded-2xl bg-secondary text-secondary-foreground rounded-bl-none">
                           <p className="text-sm">Hi! I'm your AI Mate. I can help with questions about chores, expenses, and getting along with roommates.</p>
                        </div>
                    </div>
                )}
                
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex items-end gap-2 ${
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                    >
                        <div
                            className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${
                                msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground rounded-br-none'
                                    : 'bg-secondary text-secondary-foreground rounded-bl-none'
                            }`}
                        >
                            <ReactMarkdown className="prose prose-sm dark:prose-invert">
                                {msg.parts[0].text}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))}
                 <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2">
                    <Input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message to AI Mate..."
                        className="flex-1"
                        disabled={isLoading || !chat}
                    />
                    <Button onClick={sendMessage} disabled={isLoading || !input.trim() || !chat}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                    </Button>
                </div>
                {error && <p className="text-xs text-destructive mt-2">{error}</p>}
            </div>
        </div>
    );
};

export default AIMateChat;

