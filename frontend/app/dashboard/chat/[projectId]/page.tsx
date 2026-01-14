'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ChatInterface from '@/components/chat/ChatInterface';
import api from '@/lib/api';

interface Project {
  id: string;
  name: string;
  description: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await api.get(`/api/v1/projects/${projectId}`);
      setProject(response.data);
      setError(null);
    } catch (error) {
      console.error('Failed to load project:', error);
      setError('Failed to load project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium mb-2">Loading project</h3>
          <p className="text-muted-foreground text-sm">Please wait...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-3">Oops! Something went wrong</h3>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-muted hover:bg-muted/80 border border-border rounded-lg font-medium transition-all"
            >
              Back to Dashboard
            </button>
            <button
              onClick={loadProject}
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-all shadow-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return <ChatInterface projectId={projectId} projectName={project.name} projectDescription={project.description} />;
}
