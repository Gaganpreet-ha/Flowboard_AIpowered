import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ChatMessage, ChatMessageInsert, Task, AgentAction } from '../types/database';

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: AgentAction[];
  created_at: string;
}

export function useChat(
  tasks: Task[],
  onBoardRefresh: () => void,
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void
) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) return;
      setMessages(
        ((data as ChatMessage[]) ?? []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          created_at: m.created_at,
        }))
      );
    }
    loadHistory();
  }, []);

  const persistMessage = useCallback(async (insert: ChatMessageInsert) => {
    const { data } = await supabase
      .from('chat_messages')
      .insert(insert)
      .select()
      .single();
    return data as ChatMessage | null;
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: DisplayMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      await persistMessage({ role: 'user', content });

      setLoading(true);
      try {
        const historyForApi = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch(EDGE_FN_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: historyForApi,
            boardState: tasks,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(err.error || `Request failed (${response.status})`);
        }

        const result = await response.json();
        if (result.error) throw new Error(result.error);

        const assistantMsg: DisplayMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.reply,
          actions: result.actions ?? [],
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        await persistMessage({ role: 'assistant', content: result.reply });

        if (result.actions && result.actions.length > 0) {
          onBoardRefresh();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        addToast(`AI error: ${msg}`, 'error');
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Sorry, I encountered an error: ${msg}`,
            created_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, tasks, persistMessage, onBoardRefresh, addToast]
  );

  const clearHistory = useCallback(async () => {
    await supabase.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setMessages([]);
  }, []);

  return { messages, loading, sendMessage, clearHistory };
}
