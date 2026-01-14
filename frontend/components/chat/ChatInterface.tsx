'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';
import { createSSEConnection } from '@/lib/sse';
import api from '@/lib/api';

interface ChatInterfaceProps {
  projectId: string;
  projectName: string;
}

export default function ChatInterface({ projectId, projectName }: ChatInterfaceProps) {
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadHistory(projectId);
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [projectId, loadHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const handleSendMessage = (content: string) => {
    addUserMessage(content);
    setStreaming(true);

    // Cleanup previous connection if exists
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    // Create new SSE connection
    cleanupRef.current = createSSEConnection({
      projectId,
      message: content,
      onChunk: (chunk) => {
        appendStreamingChunk(chunk);
      },
      onComplete: () => {
        completeStreaming();
        cleanupRef.current = null;
      },
      onError: (error) => {
        setError(error.message);
        setStreaming(false);
        cleanupRef.current = null;
      },
    });
  };

  const handleClearChat = async () => {
    if (confirm('Are you sure you want to clear all messages?')) {
      try {
        await api.delete(`/api/v1/chat/${projectId}/clear`);
        clearMessages();
      } catch (error) {
        console.error('Failed to clear chat:', error);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-surface border-b border-dark-border px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">{projectName}</h1>
          <p className="text-sm text-gray-400">Chat with your AI assistant</p>
        </div>
        <button
          onClick={handleClearChat}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-dark-border hover:border-gray-500 rounded-lg transition-colors"
        >
          Clear Chat
        </button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 && !isStreaming && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-yellow-500 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold">
                AI
              </div>
              <h2 className="text-2xl font-bold mb-2">Start a Conversation</h2>
              <p className="text-gray-400">Send a message to begin chatting with your AI assistant</p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.created_at}
            />
          ))}

          {isStreaming && (
            <>
              {streamingMessage && (
                <div className="flex justify-start mb-4">
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-sm font-bold">
                      AI
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-dark-card border border-dark-border">
                      <div className="prose prose-invert prose-sm max-w-none">
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
