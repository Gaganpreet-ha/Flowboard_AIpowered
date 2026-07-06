import { useState, useCallback } from 'react';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { ChatPanel } from './components/chat/ChatPanel';
import { ToastContainer } from './components/ui/ToastContainer';
import { useAuth } from './hooks/useAuth';
import { useTasks } from './hooks/useTasks';
import { useChat } from './hooks/useChat';
import { useToast } from './hooks/useToast';
import type { FilterState, Task } from './types/database';

function getLocalBool(key: string, fallback: boolean): boolean {
  try {
    const val = localStorage.getItem(key);
    if (val === null) return fallback;
    return val === 'true';
  } catch {
    return fallback;
  }
}

function setLocalBool(key: string, value: boolean) {
  try {
    localStorage.setItem(key, String(value));
  } catch {}
}

const defaultFilters: FilterState = {
  view: 'all',
  priority: 'all',
  label: '',
  search: '',
};

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(() => getLocalBool('sidebar_open', true));
  const [chatOpen, setChatOpen] = useState(() => getLocalBool('chat_open', false));
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const { authReady } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const {
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
  } = useTasks(addToast, authReady);

  const { messages, loading: chatLoading, sendMessage, clearHistory } = useChat(
    tasks,
    fetchTasks,
    addToast
  );

  function toggleSidebar() {
    setSidebarOpen((prev) => {
      const next = !prev;
      setLocalBool('sidebar_open', next);
      return next;
    });
  }

  function toggleChat() {
    setChatOpen((prev) => {
      const next = !prev;
      setLocalBool('chat_open', next);
      return next;
    });
  }

  const handleFilterChange = useCallback((patch: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const setTasksCallback = useCallback(
    (updater: React.SetStateAction<Task[]>) => {
      setTasks(updater);
    },
    [setTasks]
  );

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <TopBar
        sidebarOpen={sidebarOpen}
        chatOpen={chatOpen}
        onToggleSidebar={toggleSidebar}
        onToggleChat={toggleChat}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          open={sidebarOpen}
          filters={filters}
          onFilterChange={handleFilterChange}
          stats={stats}
        />

        <main className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">Loading board...</p>
              </div>
            </div>
          ) : (
            <KanbanBoard
              tasks={tasks}
              filters={filters}
              onCreateTask={createTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onMoveTask={moveTask}
              onReorderTask={reorderTask}
              setTasks={setTasksCallback}
            />
          )}
        </main>

        {chatOpen && (
          <>
            <div className="hidden md:block w-px bg-slate-800 shrink-0" />
            <aside className="hidden md:flex flex-col w-[360px] shrink-0 bg-slate-900 h-full">
              <ChatPanel
                messages={messages}
                loading={chatLoading}
                onSend={sendMessage}
                onClearHistory={clearHistory}
              />
            </aside>
            <div className="md:hidden fixed inset-0 z-40 flex flex-col bg-slate-900">
              <ChatPanel
                messages={messages}
                loading={chatLoading}
                onSend={sendMessage}
                onClearHistory={clearHistory}
              />
            </div>
          </>
        )}
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
