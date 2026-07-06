/*
# Add user_id and tighten RLS policies

## Summary
Converts both tables from fully-open (USING true) to owner-scoped RLS.
The app uses Supabase anonymous auth — users are assigned a UUID via
`supabase.auth.signInAnonymously()` on first load, so every row has a real
owner without any login UI.

## Changes

### tasks
- Add `user_id uuid NOT NULL DEFAULT auth.uid()` — automatically populated
  from the active session on every INSERT; no client code change required.
- SELECT: still open to anon + authenticated so the board loads before the
  anonymous session resolves (acceptable for a personal app; can restrict later).
- INSERT: requires `WITH CHECK (auth.uid() = user_id)` — the DEFAULT satisfies
  this automatically as long as the client is signed in.
- UPDATE / DELETE: require the session uid to match the row owner.

### chat_messages
- Same pattern as tasks.

## Notes
1. Existing rows (if any) have no user_id; they will be inaccessible after this
   migration for UPDATE/DELETE. Since this is a fresh project with no persisted
   data, this is acceptable.
2. The app must call `supabase.auth.signInAnonymously()` before any write.
   If the session is not ready, INSERT will fail the WITH CHECK and the hook
   surfaces the error as a toast.
*/

-- ── tasks ──────────────────────────────────────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

-- Backfill: existing rows with null user_id are orphaned; set a sentinel so
-- the NOT NULL constraint can be applied without data loss.
UPDATE tasks SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;

ALTER TABLE tasks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN user_id SET DEFAULT auth.uid();

-- SELECT: open read for anon + authenticated (board loads instantly)
DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT
  TO anon, authenticated USING (true);

-- INSERT: authenticated session only; DEFAULT auth.uid() satisfies the check
DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
CREATE POLICY "authenticated_insert_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- UPDATE: owner only
DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
CREATE POLICY "authenticated_update_tasks" ON tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DELETE: owner only
DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "authenticated_delete_tasks" ON tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── chat_messages ──────────────────────────────────────────────────────────

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

UPDATE chat_messages SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;

ALTER TABLE chat_messages ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE chat_messages ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "anon_select_chat_messages" ON chat_messages;
CREATE POLICY "anon_select_chat_messages" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_messages" ON chat_messages;
CREATE POLICY "authenticated_insert_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "anon_update_chat_messages" ON chat_messages;
CREATE POLICY "authenticated_update_chat_messages" ON chat_messages FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "anon_delete_chat_messages" ON chat_messages;
CREATE POLICY "authenticated_delete_chat_messages" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
