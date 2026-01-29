-- Add coach matching to program participants
ALTER TABLE public.program_participants 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_program_participants_coach ON public.program_participants(coach_id);

-- Policy to allow coaches to see their students
DROP POLICY IF EXISTS "Coaches can view their matched students" ON public.program_participants;
CREATE POLICY "Coaches can view their matched students" ON public.program_participants
  FOR SELECT
  USING (
    coach_id = auth.uid() OR 
    public.has_role(ARRAY['admin']) OR
    student_id = auth.uid()
  );

-- Function to match student and coach
CREATE OR REPLACE FUNCTION public.match_student_coach(
  p_program_id UUID,
  p_student_id UUID,
  p_coach_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Only admins can match students and coaches';
  END IF;

  UPDATE public.program_participants
  SET coach_id = p_coach_id,
      updated_at = NOW()
  WHERE program_id = p_program_id AND student_id = p_student_id;
  
  -- Also notify the student and coach
  -- (Trigger would be better but direct insert for now)
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    p_student_id,
    'matching',
    'Coach Assigned',
    'A new coach has been assigned to you for your program.'
  );
  
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    p_coach_id,
    'matching',
    'New Student Assigned',
    'A new student has been assigned to you for coaching.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_student_coach(UUID, UUID, UUID) TO authenticated;
