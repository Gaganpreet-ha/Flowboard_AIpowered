import { LayoutGrid, CalendarDays, Flame, AlertTriangle, CheckSquare } from 'lucide-react';
import type { ActiveFilter, FilterState } from '../../types/database';

interface Props {
  open: boolean;
  filters: FilterState;
  onFilterChange: (patch: Partial<FilterState>) => void;
  stats: { totalOpen: number; overdue: number };
}

const views: { id: ActiveFilter; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All Tasks', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'this_week', label: 'Due This Week', icon: <CalendarDays className="w-4 h-4" /> },
  { id: 'high_priority', label: 'High Priority', icon: <Flame className="w-4 h-4" /> },
  { id: 'overdue', label: 'Overdue', icon: <AlertTriangle className="w-4 h-4" /> },
];

export function Sidebar({ open, filters, onFilterChange, stats }: Props) {
  return (
    <aside
      className={`shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-200 overflow-hidden ${
        open ? 'w-60' : 'w-14'
      }`}
    >
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {views.map((view) => {
          const active = filters.view === view.id;
          return (
            <button
              key={view.id}
              onClick={() => onFilterChange({ view: view.id })}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors group ${
                active
                  ? 'bg-sky-500/15 text-sky-400'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
              title={!open ? view.label : undefined}
            >
              <span className={`shrink-0 ${active ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                {view.icon}
              </span>
              {open && <span className="truncate">{view.label}</span>}
              {open && view.id === 'overdue' && stats.overdue > 0 && (
                <span className="ml-auto bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                  {stats.overdue}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className={`border-t border-slate-800 px-3 py-4 ${!open && 'flex flex-col items-center gap-3'}`}>
        {open ? (
          <>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">Stats</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-2">
                  <CheckSquare className="w-3.5 h-3.5" />
                  Open tasks
                </span>
                <span className="text-slate-200 font-semibold tabular-nums">{stats.totalOpen}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  Overdue
                </span>
                <span className={`font-semibold tabular-nums ${stats.overdue > 0 ? 'text-red-400' : 'text-slate-200'}`}>
                  {stats.overdue}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              className="flex flex-col items-center gap-0.5"
              title={`${stats.totalOpen} open tasks`}
            >
              <span className="text-slate-200 font-semibold text-sm tabular-nums">{stats.totalOpen}</span>
              <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div
              className="flex flex-col items-center gap-0.5"
              title={`${stats.overdue} overdue`}
            >
              <span className={`font-semibold text-sm tabular-nums ${stats.overdue > 0 ? 'text-red-400' : 'text-slate-200'}`}>
                {stats.overdue}
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
