import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { Routine, RoutineExercise, RoutineExerciseWithExercise, Exercise } from '@core/models/fitness.model';
import type { CreateRoutineInput } from '@core/models/fitness.model';

export interface UpdateRoutineInput {
  name?: string;
  active_days?: string[];
  is_active?: boolean;
  description?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class RoutineService {
  private supabase = inject(SupabaseService);

  async getRoutinesByProfile(profileId: string, householdId: string | null): Promise<{ data: Routine[]; error: Error | null }> {
    let query = this.supabase.client
      .from('routines')
      .select(
        `
        *,
        routine_exercises (
          id,
          routine_id,
          exercise_id,
          sets,
          reps,
          target_weight,
          sort_order,
          notes,
          exercises (*)
        )
      `
      )
      .eq('profile_id', profileId)
      .order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map((r) => this.mapRoutine(r)), error: null };
  }

  async getRoutine(id: string): Promise<{ data: Routine | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('routines')
      .select(
        `
        *,
        routine_exercises (
          id,
          routine_id,
          exercise_id,
          sets,
          reps,
          target_weight,
          sort_order,
          notes,
          exercises (*)
        )
      `
      )
      .eq('id', id)
      .maybeSingle();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapRoutine(data) : null, error: null };
  }

  async createRoutine(input: CreateRoutineInput): Promise<{ data?: Routine; error: Error | null }> {
    const { data: routine, error: routineError } = await this.supabase.client
      .from('routines')
      .insert({
        profile_id: input.profileId,
        household_id: input.householdId ?? null,
        name: input.name.trim(),
        active_days: input.activeDays ?? [],
        description: input.description?.trim() ?? null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (routineError || !routine) return { error: (routineError as Error) ?? new Error('Failed to create routine') };

    const routineId = routine.id as string;
    if (input.exercises?.length) {
      for (let i = 0; i < input.exercises.length; i++) {
        const ex = input.exercises[i];
        await this.supabase.client.from('routine_exercises').insert({
          routine_id: routineId,
          exercise_id: ex.exerciseId,
          sets: ex.sets ?? 3,
          reps: ex.reps ?? null,
          target_weight: ex.targetWeight ?? null,
          sort_order: i,
          notes: (ex as { notes?: string | null }).notes ?? null,
        });
      }
    }
    const res = await this.getRoutine(routineId);
    return { data: res.data ?? undefined, error: res.error };
  }

  async updateRoutine(id: string, input: UpdateRoutineInput): Promise<{ data?: Routine; error: Error | null }> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) payload['name'] = input.name.trim();
    if (input.active_days !== undefined) payload['active_days'] = input.active_days;
    if (input.is_active !== undefined) payload['is_active'] = input.is_active;
    if (input.description !== undefined) payload['description'] = input.description?.trim() ?? null;

    const { error } = await this.supabase.client.from('routines').update(payload).eq('id', id);
    if (error) return { error: error as unknown as Error };
    const res = await this.getRoutine(id);
    return { data: res.data ?? undefined, error: res.error };
  }

  async deleteRoutine(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('routines').delete().eq('id', id);
    return { error: error ? (error as unknown as Error) : null };
  }

  async reorderRoutineExercises(routineId: string, exerciseIds: string[]): Promise<{ error: Error | null }> {
    for (let i = 0; i < exerciseIds.length; i++) {
      const { error } = await this.supabase.client
        .from('routine_exercises')
        .update({ sort_order: i })
        .eq('routine_id', routineId)
        .eq('exercise_id', exerciseIds[i]);
      if (error) return { error: error as unknown as Error };
    }
    return { error: null };
  }

  /** Reemplaza todos los ejercicios de la rutina (borra e inserta en orden). */
  async replaceRoutineExercises(
    routineId: string,
    items: { exerciseId: string; sets: number; reps: number | null; targetWeight: number | null }[]
  ): Promise<{ error: Error | null }> {
    const { error: delErr } = await this.supabase.client.from('routine_exercises').delete().eq('routine_id', routineId);
    if (delErr) return { error: delErr as unknown as Error };
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const { error } = await this.supabase.client.from('routine_exercises').insert({
        routine_id: routineId,
        exercise_id: it.exerciseId,
        sets: it.sets,
        reps: it.reps,
        target_weight: it.targetWeight,
        sort_order: i,
      });
      if (error) return { error: error as unknown as Error };
    }
    return { error: null };
  }

  async addExerciseToRoutine(
    routineId: string,
    exerciseId: string,
    sets: number,
    reps: number | null,
    targetWeight: number | null,
    sortOrder: number
  ): Promise<{ data?: RoutineExercise; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('routine_exercises')
      .insert({
        routine_id: routineId,
        exercise_id: exerciseId,
        sets,
        reps,
        target_weight: targetWeight,
        sort_order: sortOrder,
      })
      .select()
      .single();
    if (error) return { error: error as unknown as Error };
    return { data: this.mapRoutineExercise(data), error: null };
  }

  async removeExerciseFromRoutine(routineId: string, routineExerciseId: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client
      .from('routine_exercises')
      .delete()
      .eq('id', routineExerciseId)
      .eq('routine_id', routineId);
    return { error: error ? (error as unknown as Error) : null };
  }

  async updateRoutineExercise(
    routineExerciseId: string,
    updates: { sets?: number; reps?: number | null; target_weight?: number | null; sort_order?: number; notes?: string | null; exercise_id?: string }
  ): Promise<{ error: Error | null }> {
    const payload: Record<string, unknown> = {};
    if (updates.sets !== undefined) payload['sets'] = updates.sets;
    if (updates.reps !== undefined) payload['reps'] = updates.reps;
    if (updates.target_weight !== undefined) payload['target_weight'] = updates.target_weight;
    if (updates.sort_order !== undefined) payload['sort_order'] = updates.sort_order;
    if (updates.notes !== undefined) payload['notes'] = updates.notes;
    if (updates.exercise_id !== undefined) payload['exercise_id'] = updates.exercise_id;
    const { error } = await this.supabase.client.from('routine_exercises').update(payload).eq('id', routineExerciseId);
    return { error: error ? (error as unknown as Error) : null };
  }

  async duplicateRoutine(routineId: string, profileId: string, householdId: string | null): Promise<{ data?: Routine; error: Error | null }> {
    const { data: orig } = await this.getRoutine(routineId);
    if (!orig) return { error: new Error('Routine not found') };
    const exercises = orig.exercises;
    return this.createRoutine({
      profileId,
      householdId,
      name: `${orig.name} (copia)`,
      activeDays: orig.active_days,
      description: orig.description ?? undefined,
      exercises: exercises?.map((re) => ({
        exerciseId: re.exercise_id,
        sets: re.sets,
        reps: re.reps,
        targetWeight: re.target_weight,
        notes: re.notes ?? undefined,
      })),
    });
  }

  private mapRoutine(row: Record<string, unknown>): Routine {
    const re = (row['routine_exercises'] as Record<string, unknown>[] | null) ?? [];
    const exercises = re
      .sort((a, b) => Number(a['sort_order'] ?? 0) - Number(b['sort_order'] ?? 0))
      .map((e) => this.mapRoutineExercise(e));
    return {
      id: row['id'] as string,
      profile_id: row['profile_id'] as string,
      name: row['name'] as string,
      active_days: (row['active_days'] as string[]) ?? [],
      is_active: (row['is_active'] as boolean) ?? true,
      description: (row['description'] as string) ?? null,
      household_id: (row['household_id'] as string) ?? null,
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
      exercises,
    };
  }

  private mapRoutineExercise(row: Record<string, unknown>): RoutineExerciseWithExercise {
    const ex = row['exercises'] as Record<string, unknown> | null;
    return {
      id: row['id'] as string,
      routine_id: row['routine_id'] as string,
      exercise_id: row['exercise_id'] as string,
      sets: Number(row['sets'] ?? 3),
      reps: row['reps'] != null ? Number(row['reps']) : null,
      target_weight: row['target_weight'] != null ? Number(row['target_weight']) : null,
      sort_order: Number(row['sort_order'] ?? 0),
      notes: (row['notes'] as string) ?? null,
      exercise: ex
        ? {
            id: ex['id'] as string,
            name: ex['name'] as string,
            muscle_group: (ex['muscle_group'] as string) ?? null,
            description: (ex['description'] as string) ?? null,
            image_url: (ex['image_url'] as string) ?? null,
            equipment: (ex['equipment'] as string) ?? null,
            is_custom: (ex['is_custom'] as boolean) ?? false,
            household_id: (ex['household_id'] as string) ?? null,
            created_by: (ex['created_by'] as string) ?? null,
            created_at: ex['created_at'] as string,
          }
        : ({} as Exercise),
    };
  }
}
