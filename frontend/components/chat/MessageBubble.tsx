import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isLatest?: boolean;
}

export default function MessageBubble({ role, content, timestamp, isLatest }: MessageBubbleProps) {
  const isUser = role === 'user';
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 group ${
        isLatest ? 'animate-in fade-in slide-in-from-bottom-4 duration-300' : ''
      }`}
    >
      <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isUser && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        )}

        {/* Message Content */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div
            className={`relative px-5 py-4 rounded-2xl ${
              isUser
                ? 'bg-primary text-white shadow-lg'
                : 'bg-card border border-border shadow-sm'
            }`}
          >
            {isUser ? (
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                {content}
              </p>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert light:prose-slate">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="mb-3 last:mb-0 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-3 last:mb-0 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="px-1.5 py-0.5 bg-muted rounded text-primary text-sm font-mono">
                          {children}
                        </code>
                      ) : (
                        <code className="block p-4 bg-muted rounded-lg overflow-x-auto text-sm font-mono">
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}

            {/* Copy Button (only for AI messages) */}
            {!isUser && (
              <button
                onClick={handleCopy}
                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 p-2 bg-card hover:bg-muted border border-border rounded-lg shadow-lg transition-all duration-200"
                title="Copy message"
              >
                {isCopied ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* Timestamp */}
          <div className={`flex items-center gap-2 px-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
