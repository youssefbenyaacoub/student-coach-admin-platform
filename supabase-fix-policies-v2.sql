-- FIX Missing Permissions (Complete)
-- Run this in Supabase SQL Editor to ensure ANY authenticated user can see and create their own profile

-- 1. Reset permissions
DROP POLICY IF EXISTS "Users can insert their own profile" ON "public"."users";
DROP POLICY IF EXISTS "Users are viewable by everyone" ON "public"."users";
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."users";

-- 2. Allow Inserting Profile (Crucial for Sign Up)
CREATE POLICY "Users can insert their own profile" ON "public"."users"
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 3. Allow Viewing Profiles (Crucial for Login to work)
-- Without this, the app cannot read the user's role/name after logging in
CREATE POLICY "Users are viewable by everyone" ON "public"."users"
FOR SELECT
USING (true);

-- 4. Allow Updating Profile
CREATE POLICY "Users can update own profile" ON "public"."users"
FOR UPDATE
USING (auth.uid() = id);

-- 5. Force public access for fetchUserDetails debugging (Optional but helpful)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon;
