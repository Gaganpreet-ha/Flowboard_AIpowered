import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import type { Task, TaskStatus, TaskInsert, TaskUpdate, FilterState } from '../../types/database';
import { applyFilters, groupByStatus } from '../../hooks/useTasks';

interface Props {
  tasks: Task[];
  filters: FilterState;
  onCreateTask: (insert: TaskInsert) => Promise<Task | null>;
  onUpdateTask: (id: string, update: TaskUpdate) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onMoveTask: (taskId: string, newStatus: TaskStatus, newPosition: number, optimistic?: Task[]) => Promise<boolean>;
  onReorderTask: (taskId: string, newPosition: number, optimistic?: Task[]) => Promise<boolean>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const columns: { status: TaskStatus; label: string; accent: string }[] = [
  { status: 'backlog', label: 'Backlog', accent: 'bg-slate-500' },
  { status: 'todo', label: 'To Do', accent: 'bg-sky-500' },
  { status: 'in_review', label: 'In Review', accent: 'bg-amber-500' },
  { status: 'done', label: 'Done', accent: 'bg-emerald-500' },
  { status: 'cancelled', label: 'Cancelled', accent: 'bg-slate-600' },
];

function computePosition(tasks: Task[], overIndex: number, activeId: string): number {
  const others = tasks.filter((t) => t.id !== activeId);
  if (others.length === 0) return 1000;
  if (overIndex === 0) return (others[0]?.position ?? 1000) - 100;
  if (overIndex >= others.length) return (others[others.length - 1]?.position ?? 1000) + 100;
  return ((others[overIndex - 1]?.position ?? 0) + (others[overIndex]?.position ?? 0)) / 2;
}

export function KanbanBoard({
  tasks,
  filters,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onMoveTask,
  onReorderTask,
  setTasks,
}: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined);
  const [modalStatus, setModalStatus] = useState<TaskStatus>('backlog');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredTasks = applyFilters(tasks, filters);
  const grouped = groupByStatus(filteredTasks);

  function handleDragStart({ active }: DragStartEvent) {
    const task = tasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overTask = tasks.find((t) => t.id === over.id);
    const overStatus = (overTask?.status ?? over.id) as TaskStatus;

    if (activeTask.status !== overStatus) {
      setTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === active.id ? { ...t, status: overStatus } : t
        );
        return updated;
      });
    }
  }

  const handleDragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      setActiveTask(null);
      if (!over) return;

      const draggedTask = tasks.find((t) => t.id === active.id);
      if (!draggedTask) return;

      const overTask = tasks.find((t) => t.id === over.id);
      const newStatus = (overTask?.status ?? over.id) as TaskStatus;

      const columnTasks = tasks.filter((t) => t.status === newStatus);
      const overIndex = overTask ? columnTasks.findIndex((t) => t.id === over.id) : columnTasks.length;

      if (newStatus !== draggedTask.status) {
        const newPosition = computePosition(columnTasks, overIndex, active.id as string);
        const optimistic = tasks.map((t) =>
          t.id === active.id ? { ...t, status: newStatus, position: newPosition } : t
        );
        await onMoveTask(active.id as string, newStatus, newPosition, optimistic);
      } else {
        const activeIndex = columnTasks.findIndex((t) => t.id === active.id);
        if (activeIndex === overIndex) return;

        const reordered = arrayMove(columnTasks, activeIndex, overIndex);
        const newPosition = computePosition(reordered, overIndex, active.id as string);

        const optimistic = tasks.map((t) => {
          const found = reordered.find((r) => r.id === t.id);
          return found ? { ...t, position: found.position } : t;
        }).map((t) => (t.id === active.id ? { ...t, position: newPosition } : t));

        await onReorderTask(active.id as string, newPosition, optimistic);
      }
    },
    [tasks, onMoveTask, onReorderTask]
  );

  function openNewTask(status: TaskStatus) {
    setModalStatus(status);
    setModalTask(null);
  }

  function openEditTask(task: Task) {
    setModalTask(task);
  }

  function closeModal() {
    setModalTask(undefined);
  }

  async function handleSave(data: TaskInsert | TaskUpdate) {
    if (modalTask) {
      await onUpdateTask(modalTask.id, data as TaskUpdate);
    } else {
      await onCreateTask({ ...(data as TaskInsert), status: modalStatus });
    }
  }

  async function handleDelete() {
    if (modalTask) await onDeleteTask(modalTask.id);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-6 h-full overflow-x-auto">
          {columns.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              accent={col.accent}
              tasks={grouped[col.status]}
              onAddTask={openNewTask}
              onEditTask={openEditTask}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <div className="rotate-2 opacity-90 shadow-2xl">
              <TaskCard task={activeTask} onClick={() => {}} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          initialStatus={modalStatus}
          onSave={handleSave}
          onDelete={modalTask ? handleDelete : undefined}
          onClose={closeModal}
        />
      )}
    </>
  );
}
