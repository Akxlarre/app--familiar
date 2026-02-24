// =============================================================================
// FamilyApp — Fitness / Cuidado Físico module models
// =============================================================================

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'full_body'
  | 'cardio';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';

export type SessionStatus = 'in_progress' | 'completed' | 'cancelled';

export type GoalType = 'exercise_pr' | 'body_weight' | 'consistency' | 'shared';

export type RecordType = 'max_weight' | 'max_volume' | 'estimated_1rm';

// -----------------------------------------------------------------------------
// Core entities
// -----------------------------------------------------------------------------

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string | null;
  description: string | null;
  image_url: string | null;
  equipment: string | null;
  is_custom: boolean;
  household_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Routine {
  id: string;
  profile_id: string;
  name: string;
  active_days: string[];
  is_active: boolean;
  description: string | null;
  household_id: string | null;
  created_at: string;
  updated_at: string;
  exercises?: RoutineExerciseWithExercise[];
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string;
  sets: number;
  reps: number | null;
  target_weight: number | null;
  sort_order: number;
  notes: string | null;
  exercise?: Exercise;
}

export interface RoutineExerciseWithExercise extends RoutineExercise {
  exercise: Exercise;
}

export interface WorkoutSession {
  id: string;
  profile_id: string;
  routine_id: string | null;
  session_date: string;
  notes: string | null;
  household_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  status: SessionStatus;
  created_at: string;
  routine?: Pick<Routine, 'id' | 'name'>;
  sets?: WorkoutSetWithExercise[];
  profile_name?: string;
}

export interface WorkoutSet {
  id: string;
  workout_session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  completed: boolean;
  rpe: number | null;
  rir: number | null;
  is_pr: boolean;
  exercise?: Exercise;
}

export interface WorkoutSetWithExercise extends WorkoutSet {
  exercise: Exercise;
}

export interface BodyLog {
  id: string;
  profile_id: string;
  household_id: string;
  date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  chest_cm: number | null;
  arms_cm: number | null;
  legs_cm: number | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface FitnessGoal {
  id: string;
  profile_id: string;
  household_id: string;
  type: GoalType;
  exercise_id: string | null;
  target_value: number;
  current_value: number;
  deadline: string | null;
  achieved_at: string | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  exercise?: Pick<Exercise, 'id' | 'name'>;
}

export interface PersonalRecord {
  id: string;
  profile_id: string;
  household_id: string;
  exercise_id: string;
  record_type: RecordType;
  value: number;
  set_id: string | null;
  achieved_at: string;
  exercise?: Pick<Exercise, 'id' | 'name'>;
}

// -----------------------------------------------------------------------------
// Active session state (in-memory / UI)
// -----------------------------------------------------------------------------

export interface ActiveSessionState {
  session: WorkoutSession;
  exercises: ActiveExerciseState[];
  currentExerciseIndex: number;
  restTimerSeconds: number | null;
  previousSession: WorkoutSession | null;
}

export interface ActiveExerciseState {
  exercise: Exercise;
  sets: WorkoutSet[];
  targetSets: number;
  targetReps: number | null;
  previousSets: WorkoutSet[];
}

// -----------------------------------------------------------------------------
// Input / filter types
// -----------------------------------------------------------------------------

export interface CreateExerciseInput {
  name: string;
  muscle_group?: string | null;
  equipment?: string | null;
  description?: string | null;
  householdId: string;
}

export interface CreateRoutineInput {
  profileId: string;
  householdId: string | null;
  name: string;
  activeDays?: string[];
  description?: string | null;
  exercises?: { exerciseId: string; sets: number; reps: number | null; targetWeight: number | null; notes?: string | null }[];
}

export interface CreateBodyLogInput {
  profileId: string;
  householdId: string;
  date: string;
  weightKg?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  chestCm?: number | null;
  armsCm?: number | null;
  legsCm?: number | null;
  notes?: string | null;
  photoUrl?: string | null;
}

export interface SessionSetInput {
  workoutSessionId: string;
  exerciseId: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe?: number | null;
  rir?: number | null;
  isPr?: boolean;
}
