import { create } from 'zustand';
import api from '@/lib/api';

export interface Agent {
  id: string;
  user_id: string;
  project_id: string | null;
  agent_type: 'standalone' | 'project_agent';
  name: string;
  description: string | null;
  has_prompt: boolean;
  prompt_content: string | null;
  created_at: string;
  updated_at: string;
  project_name?: string | null;
}

interface AgentState {
  agents: Agent[];
  standaloneAgents: Agent[];
  projectAgents: Agent[];
  currentAgent: Agent | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadAgents: () => Promise<void>;
  loadAgent: (id: string) => Promise<Agent>;
  loadStandaloneAgents: () => Promise<void>;
  loadProjectAgents: (projectId: string) => Promise<void>;
  createAgent: (data: {
    name: string;
    description?: string;
    agent_type: 'standalone' | 'project_agent';
    project_id?: string;
    has_prompt?: boolean;
    prompt_content?: string;
  }) => Promise<Agent>;
  updateAgent: (id: string, data: Partial<Agent>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  setCurrentAgent: (agent: Agent | null) => void;
  clearError: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  standaloneAgents: [],
  projectAgents: [],
  currentAgent: null,
  isLoading: false,
  error: null,

  loadAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/v1/agents');
      set({ agents: response.data, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to load agents',
        isLoading: false 
      });
    }
  },

  loadAgent: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/api/v1/agents/${id}`);
      const agent = response.data;
      set({ currentAgent: agent, isLoading: false });
      return agent;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to load agent',
        isLoading: false 
      });
      throw error;
    }
  },

  loadStandaloneAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/v1/agents/standalone');
      set({ standaloneAgents: response.data, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to load standalone agents',
        isLoading: false 
      });
    }
  },

  loadProjectAgents: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/api/v1/projects/${projectId}/agents`);
      set({ projectAgents: response.data, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to load project agents',
        isLoading: false 
      });
    }
  },

  createAgent: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/v1/agents', data);
      const newAgent = response.data;
      set((state) => ({
        agents: [...state.agents, newAgent],
        standaloneAgents: data.agent_type === 'standalone' 
          ? [...state.standaloneAgents, newAgent]
          : state.standaloneAgents,
        isLoading: false
      }));
      return newAgent;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to create agent',
        isLoading: false 
      });
      throw error;
    }
  },

  updateAgent: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/api/v1/agents/${id}`, data);
      const updatedAgent = response.data;
      set((state) => ({
        agents: state.agents.map((a) => (a.id === id ? updatedAgent : a)),
        standaloneAgents: state.standaloneAgents.map((a) => (a.id === id ? updatedAgent : a)),
        projectAgents: state.projectAgents.map((a) => (a.id === id ? updatedAgent : a)),
        currentAgent: state.currentAgent?.id === id ? updatedAgent : state.currentAgent,
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to update agent',
        isLoading: false 
      });
      throw error;
    }
  },

  deleteAgent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/agents/${id}`);
      set((state) => ({
        agents: state.agents.filter((a) => a.id !== id),
        standaloneAgents: state.standaloneAgents.filter((a) => a.id !== id),
        currentAgent: state.currentAgent?.id === id ? null : state.currentAgent,
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to delete agent',
        isLoading: false 
      });
      throw error;
    }
  },

  setCurrentAgent: (agent) => set({ currentAgent: agent }),
  clearError: () => set({ error: null }),
}));
