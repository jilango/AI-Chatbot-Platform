'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProjectStore, ContextSource } from '@/store/projectStore';
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
  
  const { currentProject, loadProject, updateProject, deleteProject, error: projectError, clearError: clearProjectError } = useProjectStore();
  const { projectAgents, loadProjectAgents, createAgent, isLoading, error: agentsError, clearError: clearAgentsError } = useAgentStore();
  const [showNewAgent, setShowNewAgent] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editHasPrompt, setEditHasPrompt] = useState(false);
  const [editPromptContent, setEditPromptContent] = useState('');
  const [editContextSource, setEditContextSource] = useState<ContextSource>('recent');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveWarning, setShowSaveWarning] = useState(false);
  const fileUploadRef = useRef<FileUploadHandle>(null);

  useEffect(() => {
    if (showProjectSettings && currentProject) {
      setEditName(currentProject.name);
      setEditDescription(currentProject.description ?? '');
      setEditHasPrompt(!!currentProject.has_prompt);
      setEditPromptContent(currentProject.prompt_content ?? '');
      setEditContextSource(currentProject.context_source ?? 'recent');
    }
  }, [showProjectSettings, currentProject]);

  useEffect(() => {
    if (!showProjectSettings) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowProjectSettings(false);
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [showProjectSettings]);

  useEffect(() => {
    if (!showSaveWarning) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSaveWarning(false);
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [showSaveWarning]);

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

  const handleSaveProject = async () => {
    if (!currentProject) return;
    setIsSaving(true);
    try {
      await updateProject(currentProject.id, {
        name: editName.trim() || currentProject.name,
        description: editDescription.trim() || null,
        has_prompt: editHasPrompt,
        prompt_content: editHasPrompt ? editPromptContent.trim() : '',
        context_source: currentProject.enable_context_sharing ? editContextSource : 'recent',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProceedSave = async () => {
    await handleSaveProject();
    setShowSaveWarning(false);
    setShowProjectSettings(false);
  };

  if (!currentProject && projectError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center animate-in fade-in duration-200 p-4">
        <div className="text-center max-w-md">
          <p className="text-red-600 dark:text-red-400 mb-4">{projectError}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => { clearProjectError(); loadProject(projectId); }}
              className="btn-gradient px-4 py-2 rounded-full font-semibold"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-muted border border-border rounded-lg font-medium hover:bg-muted/80"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center animate-in fade-in duration-200">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-300">
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
              {currentProject.enable_context_sharing && (
                <span
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-medium"
                  title={`Context sharing: ${currentProject.context_source === 'rag' ? 'RAG (Semantic Search)' : 'Recent Messages'}`}
                  aria-label="Context sharing is on"
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" aria-hidden />
                  {currentProject.context_source === 'rag' ? 'RAG Context' : 'Context Sharing'}
                </span>
              )}
              <button
                onClick={() => setShowProjectSettings(!showProjectSettings)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium transition-colors"
                aria-label="Edit project"
              >
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit project
              </button>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Edit Project Modal */}
      {showProjectSettings && currentProject && (
        <div
          className="fixed inset-0 bg-black dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowProjectSettings(false); }}
        >
          <div className="bg-popover rounded-2xl p-8 border border-border max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Edit Project</h3>
              <button
                type="button"
                onClick={() => setShowProjectSettings(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); setShowSaveWarning(true); }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Project Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="My AI Project"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none transition-all"
                  placeholder="A project for managing multiple AI agents..."
                />
              </div>

              <div className="border border-border rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editHasPrompt}
                    onChange={(e) => setEditHasPrompt(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                  />
                  <span className="font-medium">Add system prompt for this project</span>
                </label>
                <p className="text-xs text-muted-foreground mt-2 ml-7">
                  All agents in this project will inherit this prompt as context
                </p>
              </div>

              {editHasPrompt && (
                <div>
                  <label className="block text-sm font-medium mb-2">Project System Prompt</label>
                  <textarea
                    value={editPromptContent}
                    onChange={(e) => setEditPromptContent(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none transition-all font-mono text-sm"
                    placeholder="This project is focused on customer support. All agents should be helpful, professional, and empathetic..."
                  />
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
                  type="button"
                  onClick={toggleContextSharing}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    currentProject.enable_context_sharing ? 'bg-green-500' : 'bg-border'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      currentProject.enable_context_sharing ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {currentProject.enable_context_sharing && (
                <div className="border border-border rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-medium mb-3">Context Retrieval Method</label>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <input
                        type="radio"
                        name="editContextSource"
                        value="recent"
                        checked={editContextSource === 'recent'}
                        onChange={() => setEditContextSource('recent')}
                        className="mt-0.5 w-4 h-4 text-primary focus:ring-2 focus:ring-ring"
                      />
                      <div>
                        <span className="font-medium">Recent Messages</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Shows the most recent conversations from other agents (faster, simpler)
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <input
                        type="radio"
                        name="editContextSource"
                        value="rag"
                        checked={editContextSource === 'rag'}
                        onChange={() => setEditContextSource('rag')}
                        className="mt-0.5 w-4 h-4 text-primary focus:ring-2 focus:ring-ring"
                      />
                      <div>
                        <span className="font-medium">RAG (Semantic Search)</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Finds the most relevant context based on the current conversation (smarter, more accurate)
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={!editName.trim() || isSaving}
                  className="btn-gradient px-4 py-2 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  className="text-sm text-red-500 hover:text-red-600 hover:underline"
                >
                  Delete Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save warning popup */}
      {showSaveWarning && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSaveWarning(false); }}
        >
          <div className="bg-popover rounded-2xl p-6 border border-border max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Save project changes?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Saving will update the project context. Agents in this project may behave differently until conversations adapt to the new context. Do you want to proceed?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSaveWarning(false)}
                    className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 border border-border rounded-lg font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedSave}
                    disabled={isSaving}
                    className="btn-gradient flex-1 px-4 py-2.5 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Proceed'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-100">
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setShowNewAgent(true)}
            className="flex items-center gap-3 px-6 py-3 bg-primary hover:bg-primary-hover text-black dark:text-white border border-border rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
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
            className="flex items-center gap-3 px-6 py-3 bg-primary hover:bg-primary-hover text-black dark:text-white border border-border rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload File
          </button>
          <button
            onClick={() => setShowFiles(!showFiles)}
            className="flex items-center gap-3 px-6 py-3 bg-card hover:bg-muted border border-border rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {showFiles ? 'Hide' : 'Show'} Files
          </button>
        </div>

        {!isLoading && agentsError && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between gap-3 flex-wrap">
            <span>{agentsError}</span>
            <button onClick={() => { clearAgentsError(); loadProjectAgents(projectId); }} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg font-medium">Retry</button>
          </div>
        )}

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
          <div className="text-center py-12 bg-card rounded-xl border border-border border-dashed animate-in fade-in duration-300">
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
