'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProjectStore } from '@/store/projectStore';
import { useAgentStore } from '@/store/agentStore';
import ThemeToggle from '@/components/ThemeToggle';
import CreateAgentModal from '@/components/modals/CreateAgentModal';
import AgentCard from '@/components/dashboard/AgentCard';
import FileUpload, { FileUploadHandle } from '@/components/files/FileUpload';
import FileList from '@/components/files/FileList';

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { currentProject, loadProject, updateProject, deleteProject } = useProjectStore();
  const { projectAgents, loadProjectAgents, createAgent, isLoading } = useAgentStore();
  const [showNewAgent, setShowNewAgent] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const fileUploadRef = useRef<FileUploadHandle>(null);

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
      loadProjectAgents(projectId);
    }
  }, [projectId, loadProject, loadProjectAgents]);

  const handleCreateAgent = async (data: any) => {
    await createAgent(data);
    // Reload agents for this project
    if (projectId) {
      loadProjectAgents(projectId);
    }
  };

  const handleAgentClick = (agentId: string) => {
    router.push(`/dashboard/agents/${agentId}`);
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  const handleDeleteProject = async () => {
    if (!currentProject) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${currentProject.name}"? This will delete all agents within it.`
    );
    if (confirmed) {
      await deleteProject(currentProject.id);
      router.push('/dashboard');
    }
  };

  const toggleContextSharing = async () => {
    if (!currentProject) return;
    await updateProject(currentProject.id, {
      enable_context_sharing: !currentProject.enable_context_sharing,
    });
  };

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Back to dashboard"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold">{currentProject.name}</h1>
                  <p className="text-xs text-muted-foreground">
                    {projectAgents.length} {projectAgents.length === 1 ? 'agent' : 'agents'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowProjectSettings(!showProjectSettings)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Project settings"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showProjectSettings && (
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="space-y-4">
              {currentProject.description && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Description</h3>
                  <p className="text-sm text-muted-foreground">{currentProject.description}</p>
                </div>
              )}
              
              {currentProject.has_prompt && currentProject.prompt_content && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Project Prompt</h3>
                  <div className="p-3 bg-muted rounded-lg border border-border">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                      {currentProject.prompt_content}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                <div>
                  <h3 className="text-sm font-medium">Context Sharing</h3>
                  <p className="text-xs text-muted-foreground">
                    Allow agents to see each other's conversation history
                  </p>
                </div>
                <button
                  onClick={toggleContextSharing}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    currentProject.enable_context_sharing ? 'bg-primary' : 'bg-border'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      currentProject.enable_context_sharing ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleDeleteProject}
                  className="text-sm text-red-500 hover:text-red-600 hover:underline"
                >
                  Delete Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setShowNewAgent(true)}
            className="flex items-center gap-3 px-6 py-3 bg-primary hover:bg-primary-hover text-black dark:text-white rounded-lg transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Agent to Project
          </button>
          <button
            onClick={() => {
              setShowFiles(true);
              // Trigger file input after section is visible
              setTimeout(() => {
                fileUploadRef.current?.triggerUpload();
              }, 100);
            }}
            className="flex items-center gap-3 px-6 py-3 bg-primary hover:bg-primary-hover text-black dark:text-white rounded-lg transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload File
          </button>
          <button
            onClick={() => setShowFiles(!showFiles)}
            className="flex items-center gap-3 px-6 py-3 bg-card hover:bg-muted border border-border rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {showFiles ? 'Hide' : 'Show'} Files
          </button>
        </div>

        {/* Files Section */}
        {showFiles && (
          <div className="mb-8 bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Project Files</h2>
            <div className="space-y-6">
              <FileUpload 
                ref={fileUploadRef}
                projectId={projectId}
                onUploadComplete={() => {
                  // FileList will automatically reload via useEffect
                }}
              />
              <div>
                <h3 className="text-sm font-medium mb-3">Uploaded Files</h3>
                <FileList projectId={projectId} />
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl p-6 border border-border animate-pulse min-h-[180px] w-full h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="w-10 h-10 bg-muted rounded-lg flex-shrink-0 ml-3"></div>
                </div>
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3 mb-4"></div>
                <div className="flex items-center justify-between">
                  <div className="h-5 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        ) : projectAgents.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border border-dashed">
            <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-muted-foreground mb-4">No agents in this project yet</p>
            <button
              onClick={() => setShowNewAgent(true)}
              className="text-primary hover:underline text-sm font-medium"
            >
              Add your first agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectAgents.map((agent, index) => (
              <div key={agent.id} className="w-full h-full" style={{ animationDelay: `${index * 50}ms` }}>
                <AgentCard
                  agent={agent}
                  onClick={() => handleAgentClick(agent.id)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      <CreateAgentModal
        isOpen={showNewAgent}
        onClose={() => setShowNewAgent(false)}
        onSubmit={handleCreateAgent}
        preselectedProjectId={projectId}
      />
    </div>
  );
}
