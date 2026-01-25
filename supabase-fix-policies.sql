-- FIX Missing Permissions
-- Run this in Supabase SQL Editor to allow users to sign up!

-- 1. Allow users to insert their own profile during signup
CREATE POLICY "Users can insert their own profile" ON "public"."users"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK ((auth.uid() = id));

-- 2. Allow users to update their own profile
-- (Permission might already exist, but running this ensures it's correct)
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."users";
CREATE POLICY "Users can update own profile" ON "public"."users"
FOR UPDATE
USING (auth.uid() = id);
