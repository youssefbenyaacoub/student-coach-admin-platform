-- ========================================================
-- CLEANUP SCRIPT: REMOVE LEGACY PROGRAM MANAGEMENT
-- ========================================================
-- Run this in your Supabase SQL Editor to remove old structures.

-- 1. Drop the RPC Functions
DROP FUNCTION IF EXISTS public.create_program_instance(UUID, TEXT);
DROP FUNCTION IF EXISTS public.submit_program_instance_task(UUID, JSONB);
DROP FUNCTION IF EXISTS public.approve_program_instance_task(UUID, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.reorder_program_instance_tasks(UUID, UUID[]);
DROP FUNCTION IF EXISTS public.advance_program_instance_stage(UUID, UUID);
DROP FUNCTION IF EXISTS public.inject_program_instance_task(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN);
DROP FUNCTION IF EXISTS public.extend_program_instance_task_deadline(UUID, TIMESTAMPTZ);

-- 2. Drop the Tables (in reverse dependency order)
DROP TABLE IF EXISTS public.program_instance_tasks CASCADE;
DROP TABLE IF EXISTS public.program_instances CASCADE;
DROP TABLE IF EXISTS public.program_task_templates CASCADE;
DROP TABLE IF EXISTS public.program_template_contents CASCADE;
DROP TABLE IF EXISTS public.program_template_stages CASCADE;
DROP TABLE IF EXISTS public.program_templates CASCADE;

-- Note: The 'programs' and 'coaching_sessions' tables remain as they 
-- are now part of the simplified core system in supabase-schema.sql.
