'use client';

import { useState } from 'react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    has_prompt: boolean;
    prompt_content: string;
    enable_context_sharing: boolean;
  }) => Promise<void>;
}

export default function CreateProjectModal({ isOpen, onClose, onSubmit }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hasPrompt, setHasPrompt] = useState(false);
  const [promptContent, setPromptContent] = useState('');
  const [enableContextSharing, setEnableContextSharing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        description,
        has_prompt: hasPrompt,
        prompt_content: hasPrompt ? promptContent : '',
        enable_context_sharing: enableContextSharing,
      });
      // Reset form
      setName('');
      setDescription('');
      setHasPrompt(false);
      setPromptContent('');
      setEnableContextSharing(true);
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-popover rounded-2xl p-8 border border-border max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Create New Project</h3>
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
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              placeholder="My AI Project"
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
              placeholder="A project for managing multiple AI agents..."
            />
          </div>

          <div className="border border-border rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasPrompt}
                onChange={(e) => setHasPrompt(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
              />
              <span className="font-medium">Add system prompt for this project</span>
            </label>
            <p className="text-xs text-muted-foreground mt-2 ml-7">
              All agents in this project will inherit this prompt as context
            </p>
          </div>

          {hasPrompt && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium mb-2">
                Project System Prompt
              </label>
              <textarea
                value={promptContent}
                onChange={(e) => setPromptContent(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none transition-all font-mono text-sm"
                placeholder="This project is focused on customer support. All agents should be helpful, professional, and empathetic..."
              />
            </div>
          )}

          <div className="border border-border rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableContextSharing}
                onChange={(e) => setEnableContextSharing(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
              />
              <span className="font-medium">Enable context sharing between agents</span>
            </label>
            <p className="text-xs text-muted-foreground mt-2 ml-7">
              Agents can see summaries of conversations from other agents in this project
            </p>
          </div>

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
              disabled={!name.trim() || isSubmitting}
              className="flex-1 px-4 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-all shadow-sm"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
