import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Task, TaskInsert, TaskUpdate, FilterState, TaskStatus } from '../types/database';

function getThisWeekEnd(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function applyFilters(tasks: Task[], filters: FilterState): Task[] {
  let result = [...tasks];

  if (filters.view === 'this_week') {
    const weekEnd = getThisWeekEnd();
    const today = getToday();
    result = result.filter(
      (t) =>
        t.due_date &&
        t.due_date >= today &&
        t.due_date <= weekEnd &&
        t.status !== 'done' &&
        t.status !== 'cancelled'
    );
  } else if (filters.view === 'high_priority') {
    result = result.filter((t) => t.priority === 'high');
  } else if (filters.view === 'overdue') {
    const today = getToday();
    result = result.filter(
      (t) =>
        t.due_date &&
        t.due_date < today &&
        t.status !== 'done' &&
        t.status !== 'cancelled'
    );
  }

  if (filters.priority !== 'all') {
    result = result.filter((t) => t.priority === filters.priority);
  }

  if (filters.label) {
    const lowerLabel = filters.label.toLowerCase();
    result = result.filter((t) =>
      t.labels.some((l) => l.toLowerCase().includes(lowerLabel))
    );
  }

  if (filters.search) {
    const lower = filters.search.toLowerCase();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.description.toLowerCase().includes(lower)
    );
  }

  return result;
}

export function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = {
    backlog: [],
    todo: [],
    in_review: [],
    done: [],
    cancelled: [],
  };
  for (const task of tasks) {
    const status = task.status as TaskStatus;
    if (groups[status]) {
      groups[status].push(task);
    }
  }
  for (const status of Object.keys(groups) as TaskStatus[]) {
    groups[status].sort((a, b) => a.position - b.position);
  }
  return groups;
}

export function useTasks(
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void,
  authReady: boolean
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('status')
      .order('position');
    if (error) {
      addToast('Failed to load tasks', 'error');
    } else {
      setTasks((data as Task[]) ?? []);
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => {
    if (!authReady) return;
    fetchTasks();
  }, [authReady, fetchTasks]);

  const createTask = useCallback(
    async (insert: TaskInsert): Promise<Task | null> => {
      const columnTasks = tasks.filter((t) => t.status === (insert.status || 'backlog'));
      const maxPos = columnTasks.length > 0 ? Math.max(...columnTasks.map((t) => t.position)) : 0;
      const position = maxPos + 1000;

      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...insert, position })
        .select()
        .single();

      if (error) {
        addToast('Failed to create task', 'error');
        return null;
      }
      setTasks((prev) => [...prev, data as Task]);
      return data as Task;
    },
    [tasks, addToast]
  );

  const updateTask = useCallback(
    async (id: string, update: TaskUpdate): Promise<boolean> => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        addToast('Failed to update task', 'error');
        return false;
      }
      setTasks((prev) => prev.map((t) => (t.id === id ? (data as Task) : t)));
      return true;
    },
    [addToast]
  );

  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) {
        addToast('Failed to delete task', 'error');
        return false;
      }
      setTasks((prev) => prev.filter((t) => t.id !== id));
      return true;
    },
    [addToast]
  );

  const moveTask = useCallback(
    async (
      taskId: string,
      newStatus: TaskStatus,
      newPosition: number,
      optimisticTasks?: Task[]
    ): Promise<boolean> => {
      if (optimisticTasks) setTasks(optimisticTasks);

      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          position: newPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) {
        addToast('Failed to move task', 'error');
        fetchTasks();
        return false;
      }
      return true;
    },
    [addToast, fetchTasks]
  );

  const reorderTask = useCallback(
    async (taskId: string, newPosition: number, optimisticTasks?: Task[]): Promise<boolean> => {
      if (optimisticTasks) setTasks(optimisticTasks);
      const { error } = await supabase
        .from('tasks')
        .update({ position: newPosition, updated_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) {
        addToast('Failed to reorder task', 'error');
        fetchTasks();
        return false;
      }
      return true;
    },
    [addToast, fetchTasks]
  );

  const stats = {
    totalOpen: tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length,
    overdue: tasks.filter(
      (t) =>
        t.due_date &&
        t.due_date < getToday() &&
        t.status !== 'done' &&
        t.status !== 'cancelled'
    ).length,
  };

  return {
    tasks,
    setTasks,
    loading,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    reorderTask,
    stats,
  };
}
