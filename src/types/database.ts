export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: Task;
        Insert: TaskInsert;
        Update: TaskUpdate;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: ChatMessageInsert;
        Update: Partial<ChatMessageInsert>;
      };
    };
  };
}

export type TaskStatus = 'backlog' | 'todo' | 'in_review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  labels: string[];
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TaskInsert {
  id?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  labels?: string[];
  position?: number;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  labels?: string[];
  position?: number;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatMessageInsert {
  role: 'user' | 'assistant';
  content: string;
}

export type ActiveFilter = 'all' | 'this_week' | 'high_priority' | 'overdue';

export interface FilterState {
  view: ActiveFilter;
  priority: TaskPriority | 'all';
  label: string;
  search: string;
}

export interface AgentAction {
  type: 'create_task' | 'update_task' | 'move_task' | 'delete_task';
  description: string;
}

export interface ChatResponse {
  reply: string;
  actions: AgentAction[];
}
