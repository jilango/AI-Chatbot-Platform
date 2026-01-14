import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-sm font-bold">
            AI
          </div>
        )}

        {/* Message Content */}
        <div className="flex flex-col gap-1">
          <div
            className={`px-4 py-3 rounded-2xl ${
              isUser
                ? 'bg-gradient-to-r from-brand-primary to-blue-600 text-white'
                : 'bg-dark-card border border-dark-border'
            }`}
          >
            {isUser ? (
              <p className="text-[15px] whitespace-pre-wrap">{content}</p>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            )}
          </div>
          <span className={`text-xs text-gray-500 px-2 ${isUser ? 'text-right' : 'text-left'}`}>
            {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}
