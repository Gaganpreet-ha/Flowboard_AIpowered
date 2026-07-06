import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, CheckCircle2, Trash2, MessageSquareOff } from 'lucide-react';
import type { DisplayMessage } from '../../hooks/useChat';

interface Props {
  messages: DisplayMessage[];
  loading: boolean;
  onSend: (message: string) => void;
  onClearHistory: () => void;
}

const actionLabels: Record<string, string> = {
  create_task: 'Created task',
  update_task: 'Updated task',
  move_task: 'Moved task',
  delete_task: 'Deleted task',
};

export function ChatPanel({ messages, loading, onSend, onClearHistory }: Props) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setInput('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-semibold text-slate-200">AI Assistant</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded"
            title="Clear history"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <MessageSquareOff className="w-10 h-10 text-slate-700" />
            <p className="text-slate-500 text-sm">No messages yet.</p>
            <p className="text-slate-600 text-xs max-w-[200px]">
              Ask me to create tasks, summarize your board, or suggest what to work on next.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-sky-400" />
                  </div>
                )}
                <div className={`max-w-[85%] space-y-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div
                    className={`px-3 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-sky-500 text-white rounded-br-sm'
                        : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {msg.actions.map((action, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full"
                        >
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>
                            {actionLabels[action.type] ?? action.type}: {action.description.replace(/^(Created|Updated|Moved|Deleted) task "?/i, '').replace(/"$/, '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3 h-3 text-slate-300" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-sky-400" />
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl rounded-bl-sm px-3 py-2.5">
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="px-4 py-4 border-t border-slate-800">
        <div className="relative flex items-end gap-2 bg-slate-800 border border-slate-700 rounded-xl focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the AI assistant..."
            rows={1}
            className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-32 min-h-[40px]"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 128) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="m-1.5 p-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-1.5 text-center">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  );
}
