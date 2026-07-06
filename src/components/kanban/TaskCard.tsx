import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Tag, GripVertical } from 'lucide-react';
import type { Task } from '../../types/database';

interface Props {
  task: Task;
  onClick: (task: Task) => void;
  isDragging?: boolean;
}

const priorityConfig = {
  high: { dot: 'bg-red-400', text: 'text-red-400', label: 'High' },
  medium: { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Med' },
  low: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Low' },
};

function isOverdue(due_date: string | null): boolean {
  if (!due_date) return false;
  return due_date < new Date().toISOString().split('T')[0];
}

function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TaskCard({ task, onClick, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: sortableDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isBeingDragged = isDragging || sortableDragging;
  const p = priorityConfig[task.priority];
  const overdue = isOverdue(task.due_date);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-slate-800 border rounded-lg p-3 cursor-pointer transition-all duration-150 select-none ${
        isBeingDragged
          ? 'opacity-50 border-sky-500/50 shadow-lg shadow-sky-500/10 rotate-1'
          : 'border-slate-700 hover:border-slate-600 hover:bg-slate-750 hover:shadow-md'
      }`}
      onClick={() => !isBeingDragged && onClick(task)}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-slate-600 hover:text-slate-400 transition-colors cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-sm font-medium text-slate-100 leading-snug line-clamp-2 flex-1">
              {task.title}
            </p>
            <span className={`flex items-center gap-1 text-xs shrink-0 ${p.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
              {p.label}
            </span>
          </div>

          {task.description && (
            <p className="text-xs text-slate-400 line-clamp-2 mb-2">{task.description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {task.due_date && (
              <span
                className={`flex items-center gap-1 text-xs ${
                  overdue ? 'text-red-400' : 'text-slate-400'
                }`}
              >
                <Calendar className="w-3 h-3" />
                {formatDate(task.due_date)}
                {overdue && <span className="font-medium">(overdue)</span>}
              </span>
            )}
            {task.labels.slice(0, 3).map((label) => (
              <span
                key={label}
                className="flex items-center gap-1 text-xs bg-slate-700/70 text-slate-300 px-1.5 py-0.5 rounded-md"
              >
                <Tag className="w-2.5 h-2.5 text-slate-400" />
                {label}
              </span>
            ))}
            {task.labels.length > 3 && (
              <span className="text-xs text-slate-500">+{task.labels.length - 3}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
