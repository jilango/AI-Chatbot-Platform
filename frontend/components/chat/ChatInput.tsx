import { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  return (
    <div className="border-t border-dark-border bg-dark-surface p-4">
      <div className="max-w-4xl mx-auto flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Type your message... (Shift+Enter for new line)"
          rows={1}
          className="flex-1 px-4 py-3 bg-dark-card border border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ maxHeight: '200px' }}
        />
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || disabled}
          className="px-6 py-3 bg-brand-primary hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-medium transition-colors flex-shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  );
}
