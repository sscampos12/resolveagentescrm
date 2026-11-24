/*
# Add conversation assignment and instance routing

1. Modified Tables
- `conversations`
  - `connection_id` (uuid, nullable): the WhatsApp connection/instance that owns the conversation.
  - `assigned_to` (uuid, nullable): the authenticated user currently responsible for the conversation.
  - `handoff_status` (text, not null): `ai`, `human`, or `waiting`.
  - `assigned_at` (timestamptz, nullable): when a human took responsibility.

2. Security
- Keep tenant ownership based on `user_id`.
- Allow owners and administrators to update assignment and AI handoff state.
- Allow administrators to read and update all conversations and their messages.
- Keep message access restricted through the parent conversation ownership or administrator role.

3. Important Notes
- Existing conversations remain valid: new fields are nullable or have safe defaults.
- No existing records or message content is deleted.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'connection_id'
  ) THEN
    ALTER TABLE public.conversations ADD COLUMN connection_id uuid REFERENCES public.connections(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE public.conversations ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'handoff_status'
  ) THEN
    ALTER TABLE public.conversations ADD COLUMN handoff_status text NOT NULL DEFAULT 'ai' CHECK (handoff_status IN ('ai', 'human', 'waiting'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'assigned_at'
  ) THEN
    ALTER TABLE public.conversations ADD COLUMN assigned_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS conversations_connection_id_idx ON public.conversations(connection_id);
CREATE INDEX IF NOT EXISTS conversations_assigned_to_idx ON public.conversations(assigned_to);

DROP POLICY IF EXISTS "conversations_update" ON public.conversations;
CREATE POLICY "conversations_update"
ON public.conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR is_admin())
WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select"
ON public.messages FOR SELECT
TO authenticated
USING (
  is_admin()
  OR EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  is_admin()
  OR EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "messages_update" ON public.messages;
CREATE POLICY "messages_update"
ON public.messages FOR UPDATE
TO authenticated
USING (
  is_admin()
  OR EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
)
WITH CHECK (
  is_admin()
  OR EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);
