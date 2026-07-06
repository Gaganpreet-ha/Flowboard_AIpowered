import { Menu, MessageSquare, Search, X } from 'lucide-react';
import type { FilterState, TaskPriority } from '../../types/database';

interface Props {
  sidebarOpen: boolean;
  chatOpen: boolean;
  onToggleSidebar: () => void;
  onToggleChat: () => void;
  filters: FilterState;
  onFilterChange: (patch: Partial<FilterState>) => void;
}

export function TopBar({
  sidebarOpen,
  chatOpen,
  onToggleSidebar,
  onToggleChat,
  filters,
  onFilterChange,
}: Props) {
  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-3 shrink-0 z-20">
      <div className="flex items-center gap-3 w-48 shrink-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-slate-100 font-semibold text-base tracking-tight select-none">
          Flowboard
        </span>
      </div>

      <div className="flex-1 flex items-center gap-2 max-w-2xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full pl-8 pr-8 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={filters.priority}
          onChange={(e) => onFilterChange({ priority: e.target.value as TaskPriority | 'all' })}
          className="bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 px-2.5 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer transition-colors"
        >
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <input
          type="text"
          placeholder="Filter by label..."
          value={filters.label}
          onChange={(e) => onFilterChange({ label: e.target.value })}
          className="w-36 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
        />
      </div>

      <div className="w-48 flex justify-end shrink-0">
        <button
          onClick={onToggleChat}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            chatOpen
              ? 'bg-sky-500 text-white hover:bg-sky-600'
              : 'bg-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>
      </div>
    </header>
  );
}
