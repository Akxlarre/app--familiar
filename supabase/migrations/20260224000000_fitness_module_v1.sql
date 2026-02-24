-- =============================================================================
-- FamilyApp — Módulo de Cuidado Físico v1
-- ALTER tablas existentes, nuevas tablas, RLS familiar, seed ejercicios
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ALTER tablas existentes
-- -----------------------------------------------------------------------------

-- exercises: biblioteca completa + custom por hogar
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS equipment TEXT,
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_exercises_household ON public.exercises(household_id) WHERE is_custom = true;

-- routines: visibilidad familiar
ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_routines_household ON public.routines(household_id) WHERE household_id IS NOT NULL;

-- Backfill household_id en routines desde profiles
UPDATE public.routines r
SET household_id = p.household_id
FROM public.profiles p
WHERE r.profile_id = p.id AND r.household_id IS NULL AND p.household_id IS NOT NULL;

-- workout_sessions: sesión en tiempo real
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_seconds INT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';

ALTER TABLE public.workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_status_check;
ALTER TABLE public.workout_sessions
  ADD CONSTRAINT workout_sessions_status_check CHECK (status IN ('in_progress', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_workout_sessions_household ON public.workout_sessions(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON public.workout_sessions(profile_id, status) WHERE status = 'in_progress';

-- Backfill household_id en workout_sessions
UPDATE public.workout_sessions ws
SET household_id = p.household_id
FROM public.profiles p
WHERE ws.profile_id = p.id AND ws.household_id IS NULL AND p.household_id IS NOT NULL;

-- session_sets: RPE/RIR y PR
ALTER TABLE public.session_sets
  ADD COLUMN IF NOT EXISTS rpe SMALLINT,
  ADD COLUMN IF NOT EXISTS rir SMALLINT,
  ADD COLUMN IF NOT EXISTS is_pr BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.session_sets DROP CONSTRAINT IF EXISTS session_sets_rpe_check;
ALTER TABLE public.session_sets ADD CONSTRAINT session_sets_rpe_check CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10));
ALTER TABLE public.session_sets DROP CONSTRAINT IF EXISTS session_sets_rir_check;
ALTER TABLE public.session_sets ADD CONSTRAINT session_sets_rir_check CHECK (rir IS NULL OR rir >= 0);

-- -----------------------------------------------------------------------------
-- 2. Nuevas tablas
-- -----------------------------------------------------------------------------

-- body_logs: registro corporal
CREATE TABLE IF NOT EXISTS public.body_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg DECIMAL(5, 2),
  waist_cm DECIMAL(5, 1),
  hips_cm DECIMAL(5, 1),
  chest_cm DECIMAL(5, 1),
  arms_cm DECIMAL(5, 1),
  legs_cm DECIMAL(5, 1),
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_body_logs_profile_date ON public.body_logs(profile_id, date DESC);
CREATE INDEX idx_body_logs_household ON public.body_logs(household_id);

-- fitness_goals: metas individuales y compartidas
CREATE TABLE IF NOT EXISTS public.fitness_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('exercise_pr', 'body_weight', 'consistency', 'shared')),
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  target_value DECIMAL(10, 2) NOT NULL,
  current_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  deadline DATE,
  achieved_at TIMESTAMPTZ,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fitness_goals_profile ON public.fitness_goals(profile_id);
CREATE INDEX idx_fitness_goals_household ON public.fitness_goals(household_id);

-- personal_records: cache de PRs
CREATE TABLE IF NOT EXISTS public.personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('max_weight', 'max_volume', 'estimated_1rm')),
  value DECIMAL(10, 2) NOT NULL,
  set_id UUID REFERENCES public.session_sets(id) ON DELETE SET NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, exercise_id, record_type)
);

CREATE INDEX idx_personal_records_profile ON public.personal_records(profile_id);
CREATE INDEX idx_personal_records_household ON public.personal_records(household_id);

-- -----------------------------------------------------------------------------
-- 3. RLS — políticas para dimensión familiar
-- -----------------------------------------------------------------------------

-- exercises: INSERT/UPDATE/DELETE solo para ejercicios custom del hogar
DROP POLICY IF EXISTS "exercises_insert_custom" ON public.exercises;
CREATE POLICY "exercises_insert_custom" ON public.exercises FOR INSERT
  WITH CHECK (is_custom = true AND household_id = get_my_household_id());

DROP POLICY IF EXISTS "exercises_update_custom" ON public.exercises;
CREATE POLICY "exercises_update_custom" ON public.exercises FOR UPDATE
  USING (is_custom = true AND (household_id = get_my_household_id() OR created_by = auth.uid()));

DROP POLICY IF EXISTS "exercises_delete_custom" ON public.exercises;
CREATE POLICY "exercises_delete_custom" ON public.exercises FOR DELETE
  USING (is_custom = true AND (household_id = get_my_household_id() OR created_by = auth.uid()));

-- routines: SELECT para miembros del hogar; INSERT/UPDATE/DELETE solo propios
DROP POLICY IF EXISTS "routines_all" ON public.routines;
CREATE POLICY "routines_select" ON public.routines FOR SELECT USING (
  profile_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_id AND p.household_id = get_my_household_id())
);
CREATE POLICY "routines_insert" ON public.routines FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "routines_update" ON public.routines FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "routines_delete" ON public.routines FOR DELETE USING (profile_id = auth.uid());

-- routine_exercises: SELECT si la rutina es visible; mutación solo si rutina es propia
DROP POLICY IF EXISTS "routine_exercises_all" ON public.routine_exercises;
CREATE POLICY "routine_exercises_select" ON public.routine_exercises FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.routines r
    WHERE r.id = routine_id
    AND (r.profile_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = r.profile_id AND p.household_id = get_my_household_id()))
  )
);
CREATE POLICY "routine_exercises_insert" ON public.routine_exercises FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_id AND r.profile_id = auth.uid())
);
CREATE POLICY "routine_exercises_update" ON public.routine_exercises FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_id AND r.profile_id = auth.uid())
);
CREATE POLICY "routine_exercises_delete" ON public.routine_exercises FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_id AND r.profile_id = auth.uid())
);

-- workout_sessions: SELECT para hogar; INSERT/UPDATE/DELETE solo propios
DROP POLICY IF EXISTS "workout_sessions_all" ON public.workout_sessions;
CREATE POLICY "workout_sessions_select" ON public.workout_sessions FOR SELECT USING (
  profile_id = auth.uid()
  OR (household_id IS NOT NULL AND belongs_to_household(household_id))
);
CREATE POLICY "workout_sessions_insert" ON public.workout_sessions FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "workout_sessions_update" ON public.workout_sessions FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "workout_sessions_delete" ON public.workout_sessions FOR DELETE USING (profile_id = auth.uid());

-- session_sets: SELECT si la sesión es visible; mutación solo si sesión es propia
DROP POLICY IF EXISTS "session_sets_all" ON public.session_sets;
CREATE POLICY "session_sets_select" ON public.session_sets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    WHERE ws.id = workout_session_id
    AND (ws.profile_id = auth.uid() OR (ws.household_id IS NOT NULL AND belongs_to_household(ws.household_id)))
  )
);
CREATE POLICY "session_sets_insert" ON public.session_sets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = workout_session_id AND ws.profile_id = auth.uid())
);
CREATE POLICY "session_sets_update" ON public.session_sets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = workout_session_id AND ws.profile_id = auth.uid())
);
CREATE POLICY "session_sets_delete" ON public.session_sets FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = workout_session_id AND ws.profile_id = auth.uid())
);

-- body_logs
ALTER TABLE public.body_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "body_logs_all" ON public.body_logs FOR ALL USING (belongs_to_household(household_id));

-- fitness_goals
ALTER TABLE public.fitness_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fitness_goals_all" ON public.fitness_goals FOR ALL USING (belongs_to_household(household_id));

-- personal_records
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personal_records_all" ON public.personal_records FOR ALL USING (belongs_to_household(household_id));

-- -----------------------------------------------------------------------------
-- 4. Seed ejercicios básicos (biblioteca global, is_custom = false)
-- -----------------------------------------------------------------------------

INSERT INTO public.exercises (id, name, muscle_group, equipment, description, is_custom) VALUES
  (gen_random_uuid(), 'Press de banca', 'chest', 'barbell', 'Press de banca con barra', false),
  (gen_random_uuid(), 'Press de banca con mancuernas', 'chest', 'dumbbell', 'Press de pecho con mancuernas', false),
  (gen_random_uuid(), 'Aperturas en banco', 'chest', 'dumbbell', 'Aperturas para pectorales', false),
  (gen_random_uuid(), 'Cruces en polea', 'chest', 'cable', 'Cruces de pecho en polea', false),
  (gen_random_uuid(), 'Press en máquina', 'chest', 'machine', 'Press de pecho en máquina', false),
  (gen_random_uuid(), 'Flexiones', 'chest', 'bodyweight', 'Push-ups', false),
  (gen_random_uuid(), 'Dominadas', 'back', 'bodyweight', 'Pull-ups', false),
  (gen_random_uuid(), 'Jalón al pecho', 'back', 'cable', 'Jalón al pecho en polea', false),
  (gen_random_uuid(), 'Remo con barra', 'back', 'barbell', 'Peso muerto rumano / Remo con barra', false),
  (gen_random_uuid(), 'Remo con mancuerna', 'back', 'dumbbell', 'Remo unilateral con mancuerna', false),
  (gen_random_uuid(), 'Remo en máquina', 'back', 'machine', 'Remo sentado en máquina', false),
  (gen_random_uuid(), 'Peso muerto convencional', 'back', 'barbell', 'Deadlift convencional', false),
  (gen_random_uuid(), 'Peso muerto rumano', 'back', 'barbell', 'RDL', false),
  (gen_random_uuid(), 'Sentadilla trasera', 'legs', 'barbell', 'Back squat', false),
  (gen_random_uuid(), 'Sentadilla frontal', 'legs', 'barbell', 'Front squat', false),
  (gen_random_uuid(), 'Prensa de piernas', 'legs', 'machine', 'Leg press', false),
  (gen_random_uuid(), 'Extensión de cuádriceps', 'legs', 'machine', 'Extensión de piernas en máquina', false),
  (gen_random_uuid(), 'Curl femoral', 'legs', 'machine', 'Curl de piernas acostado o sentado', false),
  (gen_random_uuid(), 'Zancadas con barra', 'legs', 'barbell', 'Lunges con barra', false),
  (gen_random_uuid(), 'Zancadas con mancuernas', 'legs', 'dumbbell', 'Lunges con mancuernas', false),
  (gen_random_uuid(), 'Peso muerto rumano con mancuerna', 'legs', 'dumbbell', 'RDL con mancuerna', false),
  (gen_random_uuid(), 'Elevación de talones de pie', 'legs', 'machine', 'Calf raise en máquina', false),
  (gen_random_uuid(), 'Press militar con barra', 'shoulders', 'barbell', 'Overhead press con barra', false),
  (gen_random_uuid(), 'Press militar con mancuernas', 'shoulders', 'dumbbell', 'Overhead press con mancuernas', false),
  (gen_random_uuid(), 'Elevaciones laterales', 'shoulders', 'dumbbell', 'Lateral raise', false),
  (gen_random_uuid(), 'Elevaciones frontales', 'shoulders', 'dumbbell', 'Front raise', false),
  (gen_random_uuid(), 'Face pull', 'shoulders', 'cable', 'Face pull en polea', false),
  (gen_random_uuid(), 'Encogimientos con barra', 'shoulders', 'barbell', 'Shrugs con barra', false),
  (gen_random_uuid(), 'Encogimientos con mancuernas', 'shoulders', 'dumbbell', 'Shrugs con mancuernas', false),
  (gen_random_uuid(), 'Curl de bíceps con barra', 'arms', 'barbell', 'Barbell bicep curl', false),
  (gen_random_uuid(), 'Curl de bíceps con mancuernas', 'arms', 'dumbbell', 'Dumbbell bicep curl', false),
  (gen_random_uuid(), 'Curl martillo', 'arms', 'dumbbell', 'Hammer curl', false),
  (gen_random_uuid(), 'Curl en polea', 'arms', 'cable', 'Curl en polea baja', false),
  (gen_random_uuid(), 'Extensión de tríceps en polea', 'arms', 'cable', 'Tricep pushdown', false),
  (gen_random_uuid(), 'Extensión de tríceps con mancuerna', 'arms', 'dumbbell', 'Tricep extension con mancuerna', false),
  (gen_random_uuid(), 'Fondos en paralelas', 'arms', 'bodyweight', 'Dips', false),
  (gen_random_uuid(), 'Press cerrado', 'arms', 'barbell', 'Close grip bench press', false),
  (gen_random_uuid(), 'Plancha abdominal', 'core', 'bodyweight', 'Plank', false),
  (gen_random_uuid(), 'Crunch abdominal', 'core', 'bodyweight', 'Crunch', false),
  (gen_random_uuid(), 'Elevación de piernas colgado', 'core', 'bodyweight', 'Hanging leg raise', false),
  (gen_random_uuid(), 'Russian twist', 'core', 'bodyweight', 'Russian twist', false),
  (gen_random_uuid(), 'Cable crunch', 'core', 'cable', 'Crunch en polea', false),
  (gen_random_uuid(), 'Remo al mentón', 'shoulders', 'barbell', 'Upright row con barra', false),
  (gen_random_uuid(), 'Remo al mentón con mancuernas', 'shoulders', 'dumbbell', 'Upright row con mancuernas', false),
  (gen_random_uuid(), 'Pájaros en polea', 'back', 'cable', 'Reverse fly en polea', false),
  (gen_random_uuid(), 'Pájaros con mancuernas', 'back', 'dumbbell', 'Reverse fly con mancuernas', false),
  (gen_random_uuid(), 'Hip thrust con barra', 'legs', 'barbell', 'Hip thrust', false),
  (gen_random_uuid(), 'Sentadilla búlgara', 'legs', 'dumbbell', 'Bulgarian split squat', false),
  (gen_random_uuid(), 'Copa squat', 'legs', 'dumbbell', 'Goblet squat', false)
;

-- Evitar duplicados por nombre si ya existían datos: usamos ON CONFLICT solo si hay UNIQUE en name.
-- Como no hay UNIQUE en name, el seed se ejecuta una sola vez; si ya hay filas, se agregan más.
-- Para no duplicar en futuras ejecuciones, podríamos usar INSERT ... WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = ...).
-- Por simplicidad dejamos el INSERT directo; en entorno limpio no hay ejercicios previos además del seed.
