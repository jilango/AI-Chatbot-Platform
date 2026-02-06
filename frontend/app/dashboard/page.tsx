'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useProjectStore } from '@/store/projectStore';
import { useAgentStore } from '@/store/agentStore';
import { useTempChatStore } from '@/store/tempChatStore';
import ThemeToggle from '@/components/ThemeToggle';
import ProjectCard from '@/components/dashboard/ProjectCard';
import AgentCard from '@/components/dashboard/AgentCard';
import CreateProjectModal from '@/components/modals/CreateProjectModal';
import CreateAgentModal from '@/components/modals/CreateAgentModal';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { projects, loadProjects, createProject, isLoading: projectsLoading, error: projectsError, clearError: clearProjectsError } = useProjectStore();
  const { standaloneAgents, loadStandaloneAgents, createAgent, isLoading: agentsLoading, error: agentsError, clearError: clearAgentsError } = useAgentStore();
  const { createTempChat } = useTempChatStore();
  
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewAgent, setShowNewAgent] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
    loadStandaloneAgents();
  }, [loadProjects, loadStandaloneAgents]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

  const handleCreateProject = async (data: any) => {
    const project = await createProject(data);
    setSuccessMessage('Project created');
    // Optionally navigate to project
    // router.push(`/dashboard/projects/${project.id}`);
  };

  const handleCreateAgent = async (data: any) => {
    await createAgent(data);
    setSuccessMessage('Agent created');
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/dashboard/projects/${projectId}`);
  };

  const handleAgentClick = (agentId: string) => {
    router.push(`/dashboard/agents/${agentId}`);
  };

  const handleQuickChat = async () => {
    // Generate a session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempChat = await createTempChat(sessionId);
    router.push(`/dashboard/temp/${tempChat.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-10" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="relative w-12 h-12 rounded-xl btn-gradient glow flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold">Chatbot Platform</h1>
            </Link>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">{user?.name}</span>
              </div>
              <ThemeToggle />
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                aria-label="Log out"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - section fade-in, card stagger via style.animationDelay, 3 skeletons each */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
        {successMessage && (
          <div className="mb-6 rounded-lg bg-primary/10 border border-primary/30 px-4 py-3 text-sm text-primary animate-in fade-in duration-200">
            {successMessage}
          </div>
        )}
        {/* Projects and Quick Actions - Horizontal Layout */}
        <div className="flex flex-col lg:flex-row gap-6 mb-12">
          {/* Projects Section - 70% */}
          <div className="flex-[0.7] animate-in fade-in duration-300">
          {!projectsLoading && projectsError && (
            <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between gap-3 flex-wrap">
              <span>{projectsError}</span>
              <div className="flex gap-2">
                <button onClick={() => { clearProjectsError(); loadProjects(); }} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg font-medium">Retry</button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <h2 className="text-2xl font-bold">Your Projects</h2>
              <p className="text-muted-foreground text-sm">Folders containing multiple agents</p>
            </div>
          </div>

          {projectsLoading ? (
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
          ) : projects.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border border-dashed animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <button
                onClick={() => setShowNewProject(true)}
                className="text-primary hover:underline text-sm font-medium"
              >
                Create your first project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, index) => (
                <div key={project.id} className="w-full h-full">
                  <ProjectCard
                    project={project}
                    onClick={() => handleProjectClick(project.id)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  />
                </div>
              ))}
            </div>
          )}
          </div>

          {/* Quick Actions - 30% - Vertically Stacked */}
          <div className="flex-[0.3] flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300 delay-100">
            <button
              onClick={() => setShowNewProject(true)}
              className="card-gradient-border glow flex items-center gap-4 p-6 bg-card hover:bg-muted border border-border hover:border-transparent rounded-xl transition-[transform,box-shadow] hover:scale-[1.02] active:scale-[0.98] group"
            >
              <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold">New Project</div>
                <div className="text-sm text-muted-foreground">Create a folder for agents</div>
              </div>
            </button>

            <button
              onClick={() => setShowNewAgent(true)}
              className="card-gradient-border glow flex items-center gap-4 p-6 bg-card hover:bg-muted border border-border hover:border-transparent rounded-xl transition-[transform,box-shadow] hover:scale-[1.02] active:scale-[0.98] group"
            >
              <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold">New Agent</div>
                <div className="text-sm text-muted-foreground">Create standalone AI</div>
              </div>
            </button>

            <button
              onClick={handleQuickChat}
              className="card-gradient-border glow flex items-center gap-4 p-6 bg-card hover:bg-muted border border-border hover:border-transparent rounded-xl transition-[transform,box-shadow] hover:scale-[1.02] active:scale-[0.98] group"
            >
              <div className="w-12 h-12 bg-accent/10 group-hover:bg-accent/20 rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold">Quick Chat</div>
                <div className="text-sm text-muted-foreground">Temporary conversation</div>
              </div>
            </button>
          </div>
        </div>

        {/* Standalone Agents Section */}
        <div className="animate-in fade-in duration-300 delay-100">
          {!agentsLoading && agentsError && (
            <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between gap-3 flex-wrap">
              <span>{agentsError}</span>
              <div className="flex gap-2">
                <button onClick={() => { clearAgentsError(); loadStandaloneAgents(); }} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg font-medium">Retry</button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <h2 className="text-2xl font-bold">Standalone Agents</h2>
              <p className="text-muted-foreground text-sm">Independent AI assistants</p>
            </div>
          </div>

          {agentsLoading ? (
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
          ) : standaloneAgents.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border border-dashed animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-muted-foreground mb-4">No standalone agents yet</p>
              <button
                onClick={() => setShowNewAgent(true)}
                className="text-primary hover:underline text-sm font-medium"
              >
                Create your first agent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {standaloneAgents.map((agent, index) => (
                <div key={agent.id} className="w-full h-full">
                  <AgentCard
                    agent={agent}
                    onClick={() => handleAgentClick(agent.id)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <CreateProjectModal
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        onSubmit={handleCreateProject}
      />
      <CreateAgentModal
        isOpen={showNewAgent}
        onClose={() => setShowNewAgent(false)}
        onSubmit={handleCreateAgent}
      />
    </div>
  );
}
