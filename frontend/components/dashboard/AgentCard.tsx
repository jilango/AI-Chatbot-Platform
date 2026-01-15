import { Agent } from '@/store/agentStore';
import { formatDistanceToNow } from 'date-fns';

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
}

export default function AgentCard({ agent, onClick }: AgentCardProps) {
  return (
    <button
      onClick={onClick}
      className="group bg-card hover:bg-muted rounded-xl p-6 border border-border hover:border-primary/50 transition-all text-left relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 min-h-[180px] w-full h-full flex flex-col"
    >
      {/* Gradient Overlay on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 group-hover:from-primary/5 transition-all duration-300"></div>
      
      <div className="relative flex flex-col flex-1 w-full">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-semibold group-hover:text-primary transition-colors flex-1 line-clamp-1">
            {agent.name}
          </h3>
          <div className="flex-shrink-0 ml-3 w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </div>
        
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2 min-h-[40px] flex-1">
          {agent.description || 'No description provided'}
        </p>
        
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            {agent.has_prompt && (
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                Has Prompt
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(agent.updated_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </button>
  );
}
