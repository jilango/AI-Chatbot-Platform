import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import { setUser as setUserLocal, getUser as getUserLocal, removeUser as removeUserLocal } from '@/lib/auth';

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

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
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
          const { user } = response.data;
          setUserLocal(user);
          // Verify the session cookie is sent (required when frontend and backend are on different domains)
          try {
            await api.get('/api/v1/users/me', { skipAuthRedirect: true } as Parameters<typeof api.get>[1]);
          } catch {
            set({
              error: 'Login succeeded but the session cookie was not accepted. If the app and API are on different domains, set the backend env COOKIE_SAMESITE=none (and keep COOKIE_SECURE=true) and ensure CORS_ORIGINS includes this site.',
              isLoading: false,
            });
            throw new Error('Session verification failed');
          }
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: unknown) {
          if ((error as Error)?.message === 'Session verification failed') return;
          const err = error as { response?: { data?: { detail?: string | { msg?: string }[] } } };
          const detail = err.response?.data?.detail;
          const errorMessage = Array.isArray(detail) ? (detail[0]?.msg ?? 'Login failed') : (detail || 'Login failed');
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/api/v1/auth/register', { email, password, name });
          const response = await api.post('/api/v1/auth/login', { email, password });
          const { user } = response.data;
          setUserLocal(user);
          try {
            await api.get('/api/v1/users/me', { skipAuthRedirect: true } as Parameters<typeof api.get>[1]);
          } catch {
            set({
              error: 'Account created but session could not be verified. If the app and API are on different domains, set the backend env COOKIE_SAMESITE=none (and keep COOKIE_SECURE=true) and ensure CORS_ORIGINS includes this site.',
              isLoading: false,
            });
            throw new Error('Session verification failed');
          }
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: unknown) {
          if ((error as Error)?.message === 'Session verification failed') return;
          const err = error as { response?: { data?: { detail?: string | { msg?: string }[] } } };
          const detail = err.response?.data?.detail;
          const errorMessage = Array.isArray(detail) ? (detail[0]?.msg ?? 'Registration failed') : (detail || 'Registration failed');
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post('/api/v1/auth/logout');
        } finally {
          removeUserLocal();
          set({ user: null, isAuthenticated: false });
        }
      },

      checkAuth: async () => {
        try {
          const { data: user } = await api.get('/api/v1/users/me');
          setUserLocal(user);
          set({ user, isAuthenticated: true });
          return true;
        } catch {
          removeUserLocal();
          set({ user: null, isAuthenticated: false });
          return false;
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
