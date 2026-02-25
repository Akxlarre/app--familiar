import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { WorkoutSession, WorkoutSet, WorkoutSetWithExercise } from '@core/models/fitness.model';
import type { SessionSetInput } from '@core/models/fitness.model';
import { PersonalRecordService } from './personal-record.service';

@Injectable({
  providedIn: 'root',
})
export class WorkoutSessionService {
  private supabase = inject(SupabaseService);
  private personalRecordService = inject(PersonalRecordService);

  async startSession(profileId: string, routineId: string | null, householdId: string | null): Promise<{ data?: WorkoutSession; error: Error | null }> {
    const startedAt = new Date().toISOString();
    const sessionDate = startedAt.slice(0, 10);
    const { data, error } = await this.supabase.client
      .from('workout_sessions')
      .insert({
        profile_id: profileId,
        routine_id: routineId,
        household_id: householdId,
        session_date: sessionDate,
        started_at: startedAt,
        status: 'in_progress',
      })
      .select()
      .single();
    if (error) return { error: error as unknown as Error };
    return { data: this.mapSession(data), error: null };
  }

  async getSession(id: string): Promise<{ data: WorkoutSession | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('workout_sessions')
      .select(
        `
        *,
        routines (id, name),
        session_sets (
          id,
          workout_session_id,
          exercise_id,
          set_number,
          reps,
          weight,
          completed,
          rpe,
          rir,
          is_pr,
          exercises (*)
        )
      `
      )
      .eq('id', id)
      .maybeSingle();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapSessionWithSets(data) : null, error: null };
  }

  async getActiveSession(profileId: string): Promise<{ data: WorkoutSession | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('workout_sessions')
      .select(
        `
        *,
        routines (id, name),
        session_sets (
          id,
          workout_session_id,
          exercise_id,
          set_number,
          reps,
          weight,
          completed,
          rpe,
          rir,
          is_pr,
          exercises (*)
        )
      `
      )
      .eq('profile_id', profileId)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapSessionWithSets(data) : null, error: null };
  }

  async finishSession(sessionId: string, notes?: string | null): Promise<{ data?: WorkoutSession; error: Error | null }> {
    const endedAt = new Date().toISOString();
    const { data: session } = await this.supabase.client.from('workout_sessions').select('started_at').eq('id', sessionId).single();
    let durationSeconds: number | null = null;
    if (session?.started_at) {
      durationSeconds = Math.round((new Date(endedAt).getTime() - new Date(session.started_at as string).getTime()) / 1000);
    }
    const { data, error } = await this.supabase.client
      .from('workout_sessions')
      .update({
        status: 'completed',
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        notes: notes ?? null,
      })
      .eq('id', sessionId)
      .select()
      .single();
    if (error) return { error: error as unknown as Error };
    return { data: this.mapSession(data), error: null };
  }

  async updateSessionNotes(sessionId: string, notes: string | null): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client
      .from('workout_sessions')
      .update({ notes })
      .eq('id', sessionId);
    return { error: error ? (error as unknown as Error) : null };
  }

  async cancelSession(sessionId: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client
      .from('workout_sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId);
    return { error: error ? (error as unknown as Error) : null };
  }

  async addSet(input: SessionSetInput): Promise<{ data?: WorkoutSet; isPr?: boolean; error: Error | null }> {
    const { data: set, error } = await this.supabase.client
      .from('session_sets')
      .insert({
        workout_session_id: input.workoutSessionId,
        exercise_id: input.exerciseId,
        set_number: input.setNumber,
        weight: input.weight,
        reps: input.reps,
        rpe: input.rpe ?? null,
        rir: input.rir ?? null,
        is_pr: input.isPr ?? false,
      })
      .select()
      .single();
    if (error) return { error: error as unknown as Error };
    const { data: authData } = await this.supabase.client.auth.getUser();
    const profileId = authData?.user?.id;
    let isPr = false;
    if (profileId && input.weight != null && input.reps != null) {
      const prCheck = await this.personalRecordService.checkAndUpsertPr(
        profileId,
        input.exerciseId,
        input.weight,
        input.reps,
        set.id
      );
      isPr = prCheck.isPr;
      if (isPr) {
        await this.supabase.client.from('session_sets').update({ is_pr: true }).eq('id', set.id);
      }
    }
    return { data: this.mapSet(set), isPr, error: null };
  }

  async updateSet(
    setId: string,
    updates: { weight?: number | null; reps?: number | null }
  ): Promise<{ data?: WorkoutSet; error: Error | null }> {
    const payload: Record<string, unknown> = {};
    if (updates.weight !== undefined) payload['weight'] = updates.weight;
    if (updates.reps !== undefined) payload['reps'] = updates.reps;
    const { data, error } = await this.supabase.client
      .from('session_sets')
      .update(payload)
      .eq('id', setId)
      .select()
      .single();
    if (error) return { error: error as unknown as Error };
    return { data: this.mapSet(data), error: null };
  }

  async deleteSet(setId: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('session_sets').delete().eq('id', setId);
    return { error: error ? (error as unknown as Error) : null };
  }

  async getSessionsByProfile(
    profileId: string,
    options?: { limit?: number; fromDate?: string; toDate?: string }
  ): Promise<{ data: WorkoutSession[]; error: Error | null }> {
    let query = this.supabase.client
      .from('workout_sessions')
      .select(
        `
        *,
        routines (id, name)
      `
      )
      .eq('profile_id', profileId)
      .eq('status', 'completed')
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(options?.limit ?? 50);
    if (options?.fromDate) query = query.gte('session_date', options.fromDate);
    if (options?.toDate) query = query.lte('session_date', options.toDate);
    const { data, error } = await query;
    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map((r) => this.mapSession(r)), error: null };
  }

  async getPreviousSessionWithSets(profileId: string, routineId: string): Promise<{ data: WorkoutSession | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('workout_sessions')
      .select(
        `
        *,
        routines (id, name),
        session_sets (
          id,
          workout_session_id,
          exercise_id,
          set_number,
          reps,
          weight,
          completed,
          rpe,
          rir,
          is_pr,
          exercises (*)
        )
      `
      )
      .eq('profile_id', profileId)
      .eq('routine_id', routineId)
      .eq('status', 'completed')
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapSessionWithSets(data) : null, error: null };
  }

  async getSessionsByHousehold(householdId: string, limit = 20): Promise<{ data: WorkoutSession[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('workout_sessions')
      .select(
        `
        *,
        routines (id, name),
        profiles (id, display_name)
      `
      )
      .eq('household_id', householdId)
      .eq('status', 'completed')
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return { data: [], error: error as unknown as Error };
    return {
      data: (data ?? []).map((r) => {
        const s = this.mapSession(r);
        const p = r['profiles'] as { display_name?: string } | null;
        if (p) (s as WorkoutSession & { profile_name?: string }).profile_name = p.display_name ?? undefined;
        return s;
      }),
      error: null,
    };
  }

  private mapSession(row: Record<string, unknown>): WorkoutSession {
    const r = row['routines'] as Record<string, unknown> | null;
    return {
      id: row['id'] as string,
      profile_id: row['profile_id'] as string,
      routine_id: (row['routine_id'] as string) ?? null,
      session_date: row['session_date'] as string,
      notes: (row['notes'] as string) ?? null,
      household_id: (row['household_id'] as string) ?? null,
      started_at: (row['started_at'] as string) ?? null,
      ended_at: (row['ended_at'] as string) ?? null,
      duration_seconds: row['duration_seconds'] != null ? Number(row['duration_seconds']) : null,
      status: (row['status'] as WorkoutSession['status']) ?? 'completed',
      created_at: row['created_at'] as string,
      routine: r ? { id: r['id'] as string, name: r['name'] as string } : undefined,
    };
  }

  private mapSessionWithSets(row: Record<string, unknown>): WorkoutSession {
    const session = this.mapSession(row);
    const sets = (row['session_sets'] as Record<string, unknown>[] | null) ?? [];
    (session as WorkoutSession & { sets?: WorkoutSetWithExercise[] }).sets = sets
      .sort((a, b) => Number(a['set_number']) - Number(b['set_number']))
      .map((s) => this.mapSetWithExercise(s));
    return session;
  }

  private mapSet(row: Record<string, unknown>): WorkoutSet {
    return {
      id: row['id'] as string,
      workout_session_id: row['workout_session_id'] as string,
      exercise_id: row['exercise_id'] as string,
      set_number: Number(row['set_number']),
      reps: row['reps'] != null ? Number(row['reps']) : null,
      weight: row['weight'] != null ? Number(row['weight']) : null,
      completed: (row['completed'] as boolean) ?? true,
      rpe: row['rpe'] != null ? Number(row['rpe']) : null,
      rir: row['rir'] != null ? Number(row['rir']) : null,
      is_pr: (row['is_pr'] as boolean) ?? false,
    };
  }

  private mapSetWithExercise(row: Record<string, unknown>): WorkoutSetWithExercise {
    const set = this.mapSet(row);
    const ex = row['exercises'] as Record<string, unknown> | null;
    return {
      ...set,
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
        : ({ id: '', name: '', muscle_group: null, description: null, image_url: null, equipment: null, is_custom: false, household_id: null, created_by: null, created_at: '' }),
    };
  }
}
