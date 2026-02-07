'use client';

import { useState, useEffect, useRef } from 'react';
import { useProjectStore, Project } from '@/store/projectStore';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    agent_type: 'standalone' | 'project_agent';
    project_id?: string;
    has_prompt: boolean;
    prompt_content: string;
  }) => Promise<void>;
  preselectedProjectId?: string;
}

export default function CreateAgentModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  preselectedProjectId 
}: CreateAgentModalProps) {
  const { projects, loadProjects } = useProjectStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agentType, setAgentType] = useState<'standalone' | 'project_agent'>(
    preselectedProjectId ? 'project_agent' : 'standalone'
  );
  const [selectedProjectId, setSelectedProjectId] = useState(preselectedProjectId || '');
  const [hasPrompt, setHasPrompt] = useState(false);
  const [promptContent, setPromptContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) setErrorMessage(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      previousActiveRef.current = document.activeElement as HTMLElement | null;
      return;
    }
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      previousActiveRef.current?.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && agentType === 'project_agent') {
      loadProjects();
    }
  }, [isOpen, agentType, loadProjects]);

  useEffect(() => {
    if (preselectedProjectId) {
      setAgentType('project_agent');
      setSelectedProjectId(preselectedProjectId);
    }
  }, [preselectedProjectId]);

  if (!isOpen) return null;

  const getErrorMessage = (error: unknown): string => {
    const detail = (error as any)?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail[0]) {
      const first = detail[0];
      return typeof first === 'object' && first?.msg != null ? String(first.msg) : String(first);
    }
    return 'Failed to create agent';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        description,
        agent_type: agentType,
        project_id: agentType === 'project_agent' ? selectedProjectId : undefined,
        has_prompt: hasPrompt,
        prompt_content: hasPrompt ? promptContent : '',
      });
      // Reset form
      setName('');
      setDescription('');
      setAgentType(preselectedProjectId ? 'project_agent' : 'standalone');
      setSelectedProjectId(preselectedProjectId || '');
      setHasPrompt(false);
      setPromptContent('');
      onClose();
    } catch (error) {
      console.error('Failed to create agent:', error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-popover rounded-2xl p-8 border border-border max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Create New Agent</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Agent Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              placeholder="Customer Support Bot"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none transition-all"
              placeholder="An AI assistant for handling customer inquiries..."
            />
          </div>

          {!preselectedProjectId && (
            <div className="space-y-3">
              <label className="block text-sm font-medium">Agent Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAgentType('standalone')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    agentType === 'standalone'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  <div className="font-medium mb-1">Standalone Agent</div>
                  <div className="text-xs text-muted-foreground">Independent AI assistant</div>
                </button>
                <button
                  type="button"
                  onClick={() => setAgentType('project_agent')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    agentType === 'project_agent'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  <div className="font-medium mb-1">Project Agent</div>
                  <div className="text-xs text-muted-foreground">Part of a project folder</div>
                </button>
              </div>
            </div>
          )}

          {agentType === 'project_agent' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium mb-2">
                Select Project <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                required
                disabled={!!preselectedProjectId}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-50"
              >
                <option value="">Choose a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="border border-border rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasPrompt}
                onChange={(e) => setHasPrompt(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
              />
              <span className="font-medium">Add custom prompt for this agent</span>
            </label>
            <p className="text-xs text-muted-foreground mt-2 ml-7">
              Define the agent's role, personality, and capabilities
            </p>
          </div>

          {hasPrompt && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium mb-2">
                Agent Prompt
              </label>
              <textarea
                value={promptContent}
                onChange={(e) => setPromptContent(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none transition-all font-mono text-sm"
                placeholder="You are a helpful customer support agent. You should be friendly, professional, and always try to resolve customer issues..."
              />
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between gap-3">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-600 dark:text-red-400 hover:underline font-medium shrink-0"
              >
                Try again
              </button>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-muted hover:bg-muted/80 border border-border rounded-lg font-medium transition-all"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !name.trim() || 
                (agentType === 'project_agent' && !selectedProjectId) || 
                isSubmitting
              }
              className="btn-gradient flex-1 px-4 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
