import { create } from 'zustand';
import api from '@/lib/api';

export type ContextSource = 'recent' | 'rag';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  has_prompt: boolean;
  prompt_content: string | null;
  enable_context_sharing: boolean;
  context_source: ContextSource;
  created_at: string;
  updated_at: string;
  agent_count: number;
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<Project>;
  createProject: (data: {
    name: string;
    description?: string;
    has_prompt?: boolean;
    prompt_content?: string;
    enable_context_sharing?: boolean;
    context_source?: ContextSource;
  }) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/v1/projects');
      set({ projects: response.data, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to load projects',
        isLoading: false 
      });
    }
  },

  loadProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/api/v1/projects/${id}`);
      const project = response.data;
      set({ currentProject: project, isLoading: false });
      return project;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to load project',
        isLoading: false 
      });
      throw error;
    }
  },

  createProject: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/v1/projects', data);
      const newProject = response.data;
      set((state) => ({
        projects: [...state.projects, newProject],
        isLoading: false
      }));
      return newProject;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to create project',
        isLoading: false 
      });
      throw error;
    }
  },

  updateProject: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/api/v1/projects/${id}`, data);
      const updatedProject = response.data;
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updatedProject : p)),
        currentProject: state.currentProject?.id === id ? updatedProject : state.currentProject,
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to update project',
        isLoading: false 
      });
      throw error;
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/projects/${id}`);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to delete project',
        isLoading: false 
      });
      throw error;
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),
  clearError: () => set({ error: null }),
}));
