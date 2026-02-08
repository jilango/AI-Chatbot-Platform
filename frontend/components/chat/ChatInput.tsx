import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showInputHint, setShowInputHint] = useState(false);
  const [hintPosition, setHintPosition] = useState<{ top: number; left: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-focus on mount
    textareaRef.current?.focus();
  }, []);

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

  const charCount = message.length;
  const showCharCount = charCount > 200;

  const openHint = () => {
    if (infoButtonRef.current) {
      const rect = infoButtonRef.current.getBoundingClientRect();
      setHintPosition({ left: rect.right + 8, top: rect.top });
      setShowInputHint(true);
    } else {
      setShowInputHint(true);
    }
  };

  const closeHint = () => {
    setShowInputHint(false);
    setHintPosition(null);
  };

  useEffect(() => {
    if (!showInputHint) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inButton = hintRef.current?.contains(target);
      const inPopover = popoverRef.current?.contains(target);
      if (!inButton && !inPopover) closeHint();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showInputHint]);

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur-sm sticky bottom-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="relative flex items-center gap-2">
          <div className={`flex-1 flex items-center gap-3 p-4 bg-input border-2 rounded-2xl transition-all ${
            isFocused 
              ? 'border-ring shadow-lg' 
              : 'border-border'
          }`}>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={disabled}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 bg-transparent border-none focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground text-[15px] leading-[1.5] py-0.5 max-h-[200px]"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              {showCharCount && (
                <span className={`text-xs px-2 py-1 rounded ${
                  charCount > 500 ? 'text-accent bg-accent/10' : 'text-muted-foreground'
                }`}>
                  {charCount}
                </span>
              )}
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || disabled}
                className="btn-gradient p-2.5 rounded-lg font-semibold transition-all flex items-center justify-center flex-shrink-0 disabled:opacity-70 disabled:cursor-not-allowed"
                title={disabled ? 'Please wait...' : 'Send message (Enter)'}
              >
                {disabled ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {/* Desktop-only: info button outside input box, toggles keyboard hint */}
          <div className="flex-shrink-0" ref={hintRef}>
            <button
              ref={infoButtonRef}
              type="button"
              onClick={() => (showInputHint ? closeHint() : openHint())}
              className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showInputHint && hintPosition && typeof document !== 'undefined' && createPortal(
              <div
                ref={popoverRef}
                className="fixed z-[100] px-3 py-2 bg-popover border border-border rounded-lg shadow-lg text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-200 whitespace-nowrap pointer-events-auto"
                style={{ left: hintPosition.left, top: hintPosition.top }}
              >
                <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono">Shift+Enter</kbd> for new line
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
