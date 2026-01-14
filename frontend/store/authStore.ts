import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { setToken, removeToken, setUser as setUserLocal, getUser as getUserLocal } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/api/v1/auth/login', { email, password });
          const { access_token } = response.data;
          
          setToken(access_token);
          
          // Get user info
          const userResponse = await api.get('/api/v1/users/me');
          const user = userResponse.data;
          
          setUserLocal(user);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Login failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/api/v1/auth/register', { email, password, name });
          
          // Auto-login after registration
          const response = await api.post('/api/v1/auth/login', { email, password });
          const { access_token } = response.data;
          
          setToken(access_token);
          
          // Get user info
          const userResponse = await api.get('/api/v1/users/me');
          const user = userResponse.data;
          
          setUserLocal(user);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Registration failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        removeToken();
        set({ user: null, isAuthenticated: false });
      },

      checkAuth: () => {
        const user = getUserLocal();
        if (user) {
          set({ user, isAuthenticated: true });
        } else {
          set({ user: null, isAuthenticated: false });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
