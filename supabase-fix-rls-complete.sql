-- FIX: Function Security Warning
-- Sets the search_path to prevent malicious code execution
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public, extensions;

-- FIX: Missing RLS Policies (The "Access Denied" issues)
-- We strictly define policies to allow the application to function. 
-- Currently, we are allowing All Authenticated Users to READ/WRITE to unblock development.
-- In production, you would restrict INSERT/UPDATE to specific roles (Admin/Coach).

-- Helper to reset policies for a table
DO $$ 
DECLARE 
    tables text[] := ARRAY[
        'coaching_sessions', 
        'deliverable_assignments', 
        'deliverables', 
        'program_coaches', 
        'program_participants', 
        'session_attendees', 
        'submissions',
        'programs'
    ];
    t text;
BEGIN 
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Enable read for authenticated" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable update for authenticated" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable delete for authenticated" ON public.%I', t);
        
        -- Create permissive policies for development
        -- READ
        EXECUTE format('CREATE POLICY "Enable read for authenticated" ON public.%I FOR SELECT TO authenticated USING (true)', t);
        -- INSERT
        EXECUTE format('CREATE POLICY "Enable insert for authenticated" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t);
        -- UPDATE
        EXECUTE format('CREATE POLICY "Enable update for authenticated" ON public.%I FOR UPDATE TO authenticated USING (true)', t);
    END LOOP;
END $$;
