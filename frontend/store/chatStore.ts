import { create } from 'zustand';
import api from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatState {
  messages: Message[];
  currentProjectId: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  streamingMessage: string;
  
  // Actions
  setCurrentProject: (projectId: string) => void;
  loadHistory: (projectId: string) => Promise<void>;
  addUserMessage: (content: string) => void;
  appendStreamingChunk: (chunk: string) => void;
  completeStreaming: () => void;
  setStreaming: (isStreaming: boolean) => void;
  clearMessages: () => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentProjectId: null,
  isLoading: false,
  isStreaming: false,
  error: null,
  streamingMessage: '',

  setCurrentProject: (projectId: string) => {
    set({ currentProjectId: projectId, messages: [], streamingMessage: '' });
  },

  loadHistory: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/api/v1/chat/${projectId}/history`);
      set({ messages: response.data.messages, isLoading: false });
    } catch (error: any) {
      set({ error: 'Failed to load chat history', isLoading: false });
    }
  },

  addUserMessage: (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, userMessage] }));
  },

  appendStreamingChunk: (chunk: string) => {
    set((state) => ({ streamingMessage: state.streamingMessage + chunk }));
  },

  completeStreaming: () => {
    const { streamingMessage, messages } = get();
    if (streamingMessage) {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: streamingMessage,
        created_at: new Date().toISOString(),
      };
      set({
        messages: [...messages, assistantMessage],
        streamingMessage: '',
        isStreaming: false,
      });
    }
  },

  setStreaming: (isStreaming: boolean) => {
    set({ isStreaming });
    if (isStreaming) {
      set({ streamingMessage: '' });
    }
  },

  clearMessages: () => {
    set({ messages: [], streamingMessage: '' });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
