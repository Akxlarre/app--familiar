import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { FitnessGoal } from '@core/models/fitness.model';

export interface CreateFitnessGoalInput {
  profileId: string;
  householdId: string;
  type: FitnessGoal['type'];
  exerciseId?: string | null;
  targetValue: number;
  currentValue?: number;
  deadline?: string | null;
  isShared?: boolean;
}

export interface UpdateFitnessGoalInput {
  target_value?: number;
  current_value?: number;
  deadline?: string | null;
  achieved_at?: string | null;
  is_shared?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class FitnessGoalService {
  private supabase = inject(SupabaseService);

  async getGoalsByProfile(profileId: string): Promise<{ data: FitnessGoal[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('fitness_goals')
      .select('*, exercises (id, name)')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });
    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map((r) => this.mapRow(r)), error: null };
  }

  async getGoalsByHousehold(householdId: string): Promise<{ data: FitnessGoal[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('fitness_goals')
      .select('*, exercises (id, name)')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });
    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map((r) => this.mapRow(r)), error: null };
  }

  async createGoal(input: CreateFitnessGoalInput): Promise<{ data?: FitnessGoal; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('fitness_goals')
      .insert({
        profile_id: input.profileId,
        household_id: input.householdId,
        type: input.type,
        exercise_id: input.exerciseId ?? null,
        target_value: input.targetValue,
        current_value: input.currentValue ?? 0,
        deadline: input.deadline ?? null,
        is_shared: input.isShared ?? false,
        updated_at: new Date().toISOString(),
      })
      .select('*, exercises (id, name)')
      .single();
    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async updateGoal(id: string, input: UpdateFitnessGoalInput): Promise<{ data?: FitnessGoal; error: Error | null }> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.target_value !== undefined) payload['target_value'] = input.target_value;
    if (input.current_value !== undefined) payload['current_value'] = input.current_value;
    if (input.deadline !== undefined) payload['deadline'] = input.deadline;
    if (input.achieved_at !== undefined) payload['achieved_at'] = input.achieved_at;
    if (input.is_shared !== undefined) payload['is_shared'] = input.is_shared;

    const { data, error } = await this.supabase.client
      .from('fitness_goals')
      .update(payload)
      .eq('id', id)
      .select('*, exercises (id, name)')
      .single();
    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async deleteGoal(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('fitness_goals').delete().eq('id', id);
    return { error: error ? (error as unknown as Error) : null };
  }

  private mapRow(row: Record<string, unknown>): FitnessGoal {
    const ex = row['exercises'] as Record<string, unknown> | null;
    return {
      id: row['id'] as string,
      profile_id: row['profile_id'] as string,
      household_id: row['household_id'] as string,
      type: row['type'] as FitnessGoal['type'],
      exercise_id: (row['exercise_id'] as string) ?? null,
      target_value: Number(row['target_value']),
      current_value: Number(row['current_value'] ?? 0),
      deadline: (row['deadline'] as string) ?? null,
      achieved_at: (row['achieved_at'] as string) ?? null,
      is_shared: (row['is_shared'] as boolean) ?? false,
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
      exercise: ex ? { id: ex['id'] as string, name: ex['name'] as string } : undefined,
    };
  }
}
