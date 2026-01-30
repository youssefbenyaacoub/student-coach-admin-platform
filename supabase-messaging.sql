-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure unique conversation pair between a student and a referent
    CONSTRAINT unique_conversation_pair UNIQUE (student_id, referent_id)
);

-- 2. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_content TEXT NOT NULL,
    -- Store simple metadata about attachments here if needed, but we use a separate table for full details
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- 3. Create Message Attachments Table
CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER, -- Size in bytes
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Conversations

-- Users can view conversations they are part of
CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT
USING (
    auth.uid() = student_id OR auth.uid() = referent_id
);

-- Only authenticated users can insert, but practically this might be limited to system or specific logic
-- Checking role might be good but distinct pairs is the key
CREATE POLICY "Users can create conversations they are part of"
ON public.conversations FOR INSERT
WITH CHECK (
    auth.uid() = student_id OR auth.uid() = referent_id
);

-- 6. RLS Policies for Messages

-- Users can view messages in conversations they belong to
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = messages.conversation_id
        AND (c.student_id = auth.uid() OR c.referent_id = auth.uid())
    )
);

-- Users can insert messages into conversations they belong to
CREATE POLICY "Users can insert messages in their conversations"
ON public.messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id 
    AND EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
        AND (c.student_id = auth.uid() OR c.referent_id = auth.uid())
    )
);

-- Users can update (mark as read) messages in their conversations
-- Typically you only mark as read if you are the RECEIVER, but for simplicity:
CREATE POLICY "Users can update messages in their conversations"
ON public.messages FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = messages.conversation_id
        AND (c.student_id = auth.uid() OR c.referent_id = auth.uid())
    )
);

-- Users can delete their own messages (optional)
CREATE POLICY "Users can delete their own messages"
ON public.messages FOR DELETE
USING (
    auth.uid() = sender_id
);

-- 7. RLS Policies for Attachments

-- Users can view attachments if they can view the message
CREATE POLICY "Users can view attachments linked to visible messages"
ON public.message_attachments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversations c ON c.id = m.conversation_id
        WHERE m.id = message_attachments.message_id
        AND (c.student_id = auth.uid() OR c.referent_id = auth.uid())
    )
);

-- Users can insert attachments linked to their own messages
CREATE POLICY "Users can insert attachments for their messages"
ON public.message_attachments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.id = message_id
        AND m.sender_id = auth.uid()
    )
);


-- 8. Realtime Enablement
-- Add tables to the publication to enable realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- Attachments usually don't need realtime, but can be added if needed
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_attachments;

-- 9. Storage Buckets (Optional: Create bucket for secure attachments if not exists)
-- This usually requires running via API or Dashboard, but SQL can set up RLS for storage.objects
-- Assuming a bucket named 'secure-attachments' exists.
-- insert into storage.buckets (id, name, public) values ('secure-attachments', 'secure-attachments', false);

-- Storage RLS (Example Concept - needs actual bucket existence)
-- CREATE POLICY "Access secure attachments"
-- ON storage.objects FOR SELECT
-- USING ( bucket_id = 'secure-attachments' AND (storage.foldername(name))[1] = auth.uid()::text ); 
-- (Requires complex policy to verify conversation membership based on file path or metadata, sticking to app-level verification via signed URLs is easier for now)
