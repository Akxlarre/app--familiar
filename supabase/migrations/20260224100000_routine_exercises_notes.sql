-- Notas por ejercicio en la rutina (persistentes, editables en sesión)
ALTER TABLE public.routine_exercises
  ADD COLUMN IF NOT EXISTS notes TEXT;
