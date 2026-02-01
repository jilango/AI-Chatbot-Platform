'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';
import { useAgentStore } from '@/store/agentStore';
import { useTempChatStore } from '@/store/tempChatStore';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';
import FileUpload, { FileUploadHandle } from '@/components/files/FileUpload';
import FileList from '@/components/files/FileList';
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

  const { agents, loadAgent, updateAgent, deleteAgent, currentAgent } = useAgentStore();
  const { tempChats, loadTempChat } = useTempChatStore();

  const [chatInfo, setChatInfo] = useState<{ name: string; description?: string } | null>(null);
  const [agentProjectId, setAgentProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFiles, setShowFiles] = useState(false);
  const [showEditAgent, setShowEditAgent] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editHasPrompt, setEditHasPrompt] = useState(false);
  const [editPromptContent, setEditPromptContent] = useState('');
  const [isSavingAgent, setIsSavingAgent] = useState(false);
  const [showSaveWarning, setShowSaveWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const fileUploadRef = useRef<FileUploadHandle>(null);

  // Load chat info
  useEffect(() => {
    const loadChatInfo = async () => {
      setIsLoading(true);
      try {
        if (chatType === 'agent') {
          const agent = await loadAgent(chatId);
          setChatInfo({ name: agent.name, description: agent.description ?? undefined });
          setAgentProjectId(agent.project_id || null);
        } else {
          await loadTempChat(chatId);
          setChatInfo({ name: 'Temporary Chat', description: 'This conversation will be deleted when you leave' });
          setAgentProjectId(null);
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

  useEffect(() => {
    if (chatType === 'agent' && currentAgent?.id === chatId) {
      setChatInfo({ name: currentAgent.name, description: currentAgent.description ?? undefined });
    }
  }, [chatType, chatId, currentAgent]);

  useEffect(() => {
    if (showEditAgent && currentAgent?.id === chatId) {
      setEditName(currentAgent.name);
      setEditDescription(currentAgent.description ?? '');
      setEditHasPrompt(!!currentAgent.has_prompt);
      setEditPromptContent(currentAgent.prompt_content ?? '');
    }
  }, [showEditAgent, chatId, currentAgent]);

  useEffect(() => {
    if (!showEditAgent) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowEditAgent(false);
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [showEditAgent]);

  useEffect(() => {
    if (!showSaveWarning) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSaveWarning(false);
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [showSaveWarning]);

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

    // Auth via httpOnly cookie (sent automatically with same-site request when using proxy)
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
    const url =
      chatType === 'agent'
        ? `${baseUrl}/api/v1/chat/agent/${chatId}/stream?message=${encodeURIComponent(content)}`
        : `${baseUrl}/api/v1/chat/temp/${chatId}/stream?message=${encodeURIComponent(content)}`;

    const eventSource = new EventSource(url, { withCredentials: true });

    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        console.log('SSE event received:', event.data);
        const data = JSON.parse(event.data);
        console.log('Parsed SSE data:', data);
        
        if (data.type === 'token') {
          console.log('Appending chunk:', data.content);
          appendStreamingChunk(data.content);
        } else if (data.type === 'done') {
          console.log('Stream complete');
          completeStreaming();
          eventSource.close();
          eventSourceRef.current = null;
        } else if (data.type === 'error') {
          console.error('SSE error:', data.content);
          setError(data.content || 'An error occurred');
          setStreaming(false);
          eventSource.close();
          eventSourceRef.current = null;
        } else {
          console.warn('Unknown SSE message type:', data);
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err, 'Raw data:', event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      console.error('EventSource readyState:', eventSource.readyState);
      setError('Connection error. Please try again.');
      setStreaming(false);
      eventSource.close();
      eventSourceRef.current = null;
    };
    
    eventSource.onopen = () => {
      console.log('EventSource connection opened');
    };
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (!showClearConfirm) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowClearConfirm(false);
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [showClearConfirm]);

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
      // For agents, go back to project page if agent belongs to a project, otherwise dashboard
      if (agentProjectId) {
        router.push(`/dashboard/projects/${agentProjectId}`);
      } else {
        router.push('/dashboard');
      }
    }
  };

  const handleSaveAgent = async () => {
    if (!currentAgent || chatType !== 'agent') return;
    setIsSavingAgent(true);
    try {
      await updateAgent(chatId, {
        name: editName.trim() || currentAgent.name,
        description: editDescription.trim() || null,
        has_prompt: editHasPrompt,
        prompt_content: editHasPrompt ? editPromptContent.trim() : '',
      });
    } finally {
      setIsSavingAgent(false);
    }
  };

  const handleProceedSaveAgent = async () => {
    await handleSaveAgent();
    setShowSaveWarning(false);
    setShowEditAgent(false);
  };

  const handleDeleteAgent = async () => {
    if (chatType !== 'agent') return;
    const confirmed = window.confirm(
      `Are you sure you want to delete this agent? This will permanently remove the agent and its chat history.`
    );
    if (confirmed) {
      await deleteAgent(chatId);
      if (agentProjectId) {
        router.push(`/dashboard/projects/${agentProjectId}`);
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
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Back"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                {chatType === 'temp' ? (
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              {chatType === 'agent' && (
                <button
                  onClick={() => setShowEditAgent(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted border border-border rounded-lg transition-all"
                  aria-label="Edit agent"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="hidden sm:inline">Edit agent</span>
                </button>
              )}
              {chatType === 'agent' && agentProjectId && (
                <>
                  <button
                    onClick={() => {
                      setShowFiles(true);
                      setTimeout(() => {
                        fileUploadRef.current?.triggerUpload();
                      }, 100);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted border border-border rounded-lg transition-all"
                    aria-label="Upload file"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="hidden sm:inline">Upload File</span>
                  </button>
                  <button
                    onClick={() => setShowFiles(!showFiles)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted border border-border rounded-lg transition-all"
                    aria-label="Toggle files"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="hidden sm:inline">{showFiles ? 'Hide' : 'Show'} Files</span>
                  </button>
                </>
              )}
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
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowClearConfirm(false); }}
        >
          <div className="bg-popover rounded-2xl p-6 border border-border max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
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

      {/* Edit Agent Modal */}
      {showEditAgent && chatType === 'agent' && currentAgent?.id === chatId && (
        <div
          className="fixed inset-0 bg-black dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditAgent(false); }}
        >
          <div className="bg-popover rounded-2xl p-8 border border-border max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Edit Agent</h3>
              <button
                type="button"
                onClick={() => setShowEditAgent(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); setShowSaveWarning(true); }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Agent Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="Customer Support Bot"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none transition-all"
                  placeholder="An AI assistant for handling customer inquiries..."
                />
              </div>
              <div className="border border-border rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editHasPrompt}
                    onChange={(e) => setEditHasPrompt(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                  />
                  <span className="font-medium">Add custom prompt for this agent</span>
                </label>
                <p className="text-xs text-muted-foreground mt-2 ml-7">
                  Define the agent&apos;s role, personality, and capabilities
                </p>
              </div>
              {editHasPrompt && (
                <div>
                  <label className="block text-sm font-medium mb-2">Agent Prompt</label>
                  <textarea
                    value={editPromptContent}
                    onChange={(e) => setEditPromptContent(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none transition-all font-mono text-sm"
                    placeholder="You are a helpful customer support agent..."
                  />
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={!editName.trim() || isSavingAgent}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-black dark:text-white border border-border rounded-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                >
                  {isSavingAgent ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAgent}
                  className="text-sm text-red-500 hover:text-red-600 hover:underline"
                >
                  Delete Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save warning popup (agent) */}
      {showSaveWarning && chatType === 'agent' && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSaveWarning(false); }}
        >
          <div className="bg-popover rounded-2xl p-6 border border-border max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Save agent changes?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Saving will update the agent&apos;s context. This conversation and future ones may behave differently until they adapt. Do you want to proceed?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSaveWarning(false)}
                    className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 border border-border rounded-lg font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedSaveAgent}
                    disabled={isSavingAgent}
                    className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-black dark:text-white border border-border rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingAgent ? 'Saving...' : 'Proceed'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Files Section */}
      {chatType === 'agent' && agentProjectId && showFiles && (
        <div className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Project Files</h3>
              <FileUpload 
                ref={fileUploadRef}
                projectId={agentProjectId}
                onUploadComplete={() => {
                  // FileList will automatically reload via useEffect
                }}
              />
              <div>
                <h4 className="text-xs font-medium mb-2 text-muted-foreground">Uploaded Files</h4>
                <FileList projectId={agentProjectId} />
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
                  <svg className="w-10 h-10 text-white dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-3">Ready to help</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                {chatType === 'temp' 
                  ? 'Start a temporary conversation. This chat will be deleted when you leave.'
                  : 'Ask me anything! I\'m here to assist you with your questions and tasks.'}
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
                      <svg className="w-5 h-5 text-white dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
