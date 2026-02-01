import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance: auth via httpOnly cookie (withCredentials), no token in JS
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      const skipRedirect = (error.config as { skipAuthRedirect?: boolean })?.skipAuthRedirect;
      if (!isLoginRequest && !skipRedirect) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user');
          localStorage.removeItem('auth-storage'); // clear persisted auth so login page doesn't rehydrate as "logged in"
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
