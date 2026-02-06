import { Project } from '@/store/projectStore';
import { formatDistanceToNow } from 'date-fns';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  style?: React.CSSProperties;
}

export default function ProjectCard({ project, onClick, style }: ProjectCardProps) {
  return (
    <button
      onClick={onClick}
      style={style}
      className="card-gradient-border glow group bg-card hover:bg-muted rounded-xl p-6 border border-border hover:border-transparent transition-[transform,box-shadow,border-color] text-left relative animate-in fade-in slide-in-from-bottom-4 duration-300 min-h-[180px] w-full h-full flex flex-col"
      aria-label={`Open project ${project.name}`}
    >
      {/* Gradient Overlay on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 group-hover:from-primary/5 transition-all duration-300"></div>
      
      <div className="relative flex flex-col flex-1 w-full">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-semibold group-hover:text-primary transition-colors flex-1 line-clamp-1">
            {project.name}
          </h3>
          <div className="flex-shrink-0 ml-3 w-10 h-10 bg-muted group-hover:bg-primary/10 rounded-lg flex items-center justify-center transition-all">
            <svg className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
        </div>
        
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2 min-h-[40px] flex-1">
          {project.description || 'No description provided'}
        </p>
        
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {project.agent_count} {project.agent_count === 1 ? 'agent' : 'agents'}
            </span>
            {project.has_prompt && (
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                Has Prompt
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </button>
  );
}
