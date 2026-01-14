import { create } from 'zustand';
import api from '@/lib/api';

export interface TemporaryChat {
  id: string;
  user_id: string;
  session_id: string;
  created_at: string;
}

interface TempChatState {
  tempChats: TemporaryChat[];
  currentTempChat: TemporaryChat | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadTempChat: (id: string) => Promise<TemporaryChat>;
  createTempChat: (sessionId: string) => Promise<TemporaryChat>;
  deleteTempChat: (id: string) => Promise<void>;
  cleanupSession: (sessionId: string) => Promise<void>;
  setCurrentTempChat: (tempChat: TemporaryChat | null) => void;
  clearError: () => void;
}

export const useTempChatStore = create<TempChatState>((set, get) => ({
  tempChats: [],
  currentTempChat: null,
  isLoading: false,
  error: null,

  loadTempChat: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/api/v1/temporary-chats/${id}`);
      const tempChat = response.data;
      set({ currentTempChat: tempChat, isLoading: false });
      return tempChat;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to load temporary chat',
        isLoading: false 
      });
      throw error;
    }
  },

  createTempChat: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/v1/temporary-chats', { session_id: sessionId });
      const tempChat = response.data;
      set({ currentTempChat: tempChat, isLoading: false });
      return tempChat;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to create temporary chat',
        isLoading: false 
      });
      throw error;
    }
  },

  deleteTempChat: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/temporary-chats/${id}`);
      set({ currentTempChat: null, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to delete temporary chat',
        isLoading: false 
      });
      throw error;
    }
  },

  cleanupSession: async (sessionId: string) => {
    try {
      await api.delete(`/api/v1/temporary-chats/session/${sessionId}`);
    } catch (error) {
      console.error('Failed to cleanup session:', error);
    }
  },

  setCurrentTempChat: (tempChat) => set({ currentTempChat: tempChat }),
  clearError: () => set({ error: null }),
}));
