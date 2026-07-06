import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { TaskCard } from './TaskCard';
import type { Task, TaskStatus } from '../../types/database';

interface Props {
  status: TaskStatus;
  label: string;
  accent: string;
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
}

export function KanbanColumn({ status, label, accent, tasks, onAddTask, onEditTask }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${accent}`} />
          <h3 className="text-sm font-semibold text-slate-300">{label}</h3>
          <span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full tabular-nums min-w-[20px] text-center">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Add task"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[120px] rounded-xl transition-colors ${
          isOver ? 'bg-slate-800/60 ring-1 ring-sky-500/30' : 'bg-slate-900/30'
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="p-2 space-y-2">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-xs text-slate-600">No tasks here</p>
                <button
                  onClick={() => onAddTask(status)}
                  className="mt-2 text-xs text-slate-600 hover:text-sky-400 transition-colors"
                >
                  + Add one
                </button>
              </div>
            ) : (
              tasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={onEditTask} />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
