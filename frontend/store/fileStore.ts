import { create } from 'zustand';
import api from '@/lib/api';

export interface ProjectFile {
  id: string;
  project_id: string;
  user_id: string;
  openai_file_id: string;
  filename: string;
  file_type: string | null;
  file_size: number;
  uploaded_at: string;
}

interface FileState {
  files: ProjectFile[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadProjectFiles: (projectId: string) => Promise<void>;
  uploadFile: (projectId: string, file: File) => Promise<ProjectFile>;
  deleteFile: (fileId: string) => Promise<void>;
  clearError: () => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  isLoading: false,
  error: null,

  loadProjectFiles: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/api/v1/files/project/${projectId}`);
      set({ files: response.data, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to load files',
        isLoading: false 
      });
    }
  },

  uploadFile: async (projectId: string, file: File) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(
        `/api/v1/files/project/${projectId}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      const newFile = response.data.file;
      set((state) => ({
        files: [newFile, ...state.files],
        isLoading: false
      }));
      
      return newFile;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to upload file',
        isLoading: false 
      });
      throw error;
    }
  },

  deleteFile: async (fileId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/files/${fileId}`);
      set((state) => ({
        files: state.files.filter(f => f.id !== fileId),
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to delete file',
        isLoading: false 
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
