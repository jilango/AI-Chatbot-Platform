'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';
import { useAgentStore } from '@/store/agentStore';
import { useTempChatStore } from '@/store/tempChatStore';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';
import { getToken } from '@/lib/auth';
import api from '@/lib/api';

interface ChatInterfaceProps {
  chatType: 'agent' | 'temp';
  chatId: string;
}

export default function ChatInterface({ chatType, chatId }: ChatInterfaceProps) {
  const router = useRouter();
  const {
    messages,
    isStreaming,
    streamingMessage,
    addUserMessage,
    appendStreamingChunk,
    completeStreaming,
    setStreaming,
    loadHistory,
    clearMessages,
    setError,
  } = useChatStore();

  const { agents, loadAgent } = useAgentStore();
  const { tempChats, loadTempChat } = useTempChatStore();

  const [chatInfo, setChatInfo] = useState<{ name: string; description?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load chat info
  useEffect(() => {
    const loadChatInfo = async () => {
      setIsLoading(true);
      try {
        if (chatType === 'agent') {
          const agent = await loadAgent(chatId);
          setChatInfo({ name: agent.name, description: agent.description });
        } else {
          await loadTempChat(chatId);
          setChatInfo({ name: 'Temporary Chat', description: 'This conversation will be deleted when you leave' });
        }
      } catch (error) {
        console.error('Failed to load chat info:', error);
        setError('Failed to load chat information');
      } finally {
        setIsLoading(false);
      }
    };

    loadChatInfo();
  }, [chatType, chatId, loadAgent, loadTempChat, setError]);

  // Load chat history
  useEffect(() => {
    if (chatType === 'agent') {
      loadHistory({ agent_id: chatId });
    } else {
      loadHistory({ temp_chat_id: chatId });
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [chatType, chatId, loadHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const handleSendMessage = async (content: string) => {
    addUserMessage(content);
    setStreaming(true);

    // Cleanup previous connection if exists
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const token = getToken();
    if (!token) {
      setError('Authentication required');
      setStreaming(false);
      return;
    }

    // Prepare query params
    const params = new URLSearchParams();
    if (chatType === 'agent') {
      params.append('agent_id', chatId);
    } else {
      params.append('temp_chat_id', chatId);
    }
    params.append('message', content);

    // Create SSE connection
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/chat/stream?${params.toString()}`;
    const eventSource = new EventSource(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    } as any);

    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'token') {
          appendStreamingChunk(data.content);
        } else if (data.type === 'done') {
          completeStreaming();
          eventSource.close();
          eventSourceRef.current = null;
        } else if (data.type === 'error') {
          setError(data.content || 'An error occurred');
          setStreaming(false);
          eventSource.close();
          eventSourceRef.current = null;
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = () => {
      setError('Connection error. Please try again.');
      setStreaming(false);
      eventSource.close();
      eventSourceRef.current = null;
    };
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearChat = async () => {
    try {
      if (chatType === 'agent') {
        await api.delete(`/api/v1/chat/${chatId}/clear?agent_id=${chatId}`);
      } else {
        await api.delete(`/api/v1/chat/${chatId}/clear?temp_chat_id=${chatId}`);
      }
      clearMessages();
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Failed to clear chat:', error);
      setError('Failed to clear chat. Please try again.');
    }
  };

  const handleBack = () => {
    if (chatType === 'temp') {
      // For temp chats, go back to dashboard
      router.push('/dashboard');
    } else {
      // For agents, find the agent and go back to project or dashboard
      const agent = agents.find(a => a.id === chatId);
      if (agent?.project_id) {
        router.push(`/dashboard/projects/${agent.project_id}`);
      } else {
        router.push('/dashboard');
      }
    }
  };

  if (isLoading || !chatInfo) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading chat...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back Button + Chat Info */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all group"
                aria-label="Back"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Back</span>
              </button>
              <div className="h-8 w-px bg-border"></div>
              <div className="flex items-center gap-3">
                {chatType === 'temp' ? (
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                )}
                <div>
                  <h1 className="text-lg font-semibold">{chatInfo.name}</h1>
                  {chatInfo.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{chatInfo.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={messages.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted border border-border rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                aria-label="Clear chat history"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">Clear Chat</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-popover rounded-2xl p-6 border border-border max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Clear chat history?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  This will permanently delete all messages in this conversation. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 border border-border rounded-lg font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearChat}
                    className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {messages.length === 0 && !isStreaming && (
            <div className="text-center py-20">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl rotate-6 blur-xl"></div>
                <div className={`relative w-20 h-20 ${chatType === 'temp' ? 'bg-accent' : 'bg-primary'} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-3">Ready to help</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                {chatType === 'temp' 
                  ? 'Start a temporary conversation. This chat will be deleted when you leave.'
                  : 'Ask me anything! I'm here to assist you with your questions and tasks.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {[
                  { icon: '💡', text: 'Explain a concept', prompt: 'Can you explain how...' },
                  { icon: '🔍', text: 'Get information', prompt: 'Tell me about...' },
                  { icon: '✍️', text: 'Write something', prompt: 'Help me write...' },
                  { icon: '🤔', text: 'Solve a problem', prompt: 'How do I...' },
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    className="p-4 bg-card hover:bg-muted border border-border rounded-xl text-left transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{suggestion.icon}</span>
                      <div>
                        <div className="font-medium group-hover:text-primary transition-colors">
                          {suggestion.text}
                        </div>
                        <div className="text-xs text-muted-foreground">{suggestion.prompt}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.created_at}
              isLatest={index === messages.length - 1}
            />
          ))}

          {isStreaming && (
            <>
              {streamingMessage && (
                <div className="flex justify-start mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex gap-3 max-w-[85%]">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full ${chatType === 'temp' ? 'bg-accent' : 'bg-primary'} flex items-center justify-center shadow-lg`}>
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="flex-1 px-5 py-4 rounded-2xl bg-card border border-border shadow-sm">
                      <div className="prose prose-invert prose-sm max-w-none dark:prose-invert">
                        {streamingMessage}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {!streamingMessage && <TypingIndicator />}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <ChatInput onSend={handleSendMessage} disabled={isStreaming} />
    </div>
  );
}
