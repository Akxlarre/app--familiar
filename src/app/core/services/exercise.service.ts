import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { Exercise } from '@core/models/fitness.model';
import type { CreateExerciseInput } from '@core/models/fitness.model';

@Injectable({
  providedIn: 'root',
})
export class ExerciseService {
  private supabase = inject(SupabaseService);

  async getExercises(filters?: {
    muscleGroup?: string;
    equipment?: string;
    search?: string;
    includeCustom?: boolean;
    householdId?: string;
  }): Promise<{ data: Exercise[]; error: Error | null }> {
    let query = this.supabase.client
      .from('exercises')
      .select('*')
      .order('name', { ascending: true });

    if (filters?.muscleGroup) {
      query = query.eq('muscle_group', filters.muscleGroup);
    }
    if (filters?.equipment) {
      query = query.eq('equipment', filters.equipment);
    }
    if (filters?.search?.trim()) {
      query = query.ilike('name', `%${filters.search.trim()}%`);
    }
    if (filters?.includeCustom !== true) {
      query = query.eq('is_custom', false);
    } else if (filters?.householdId) {
      query = query.or(`is_custom.eq.false,and(is_custom.eq.true,household_id.eq.${filters.householdId})`);
    }

    const { data, error } = await query;
    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map((r) => this.mapRow(r)), error: null };
  }

  async getExercise(id: string): Promise<{ data: Exercise | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('exercises')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapRow(data) : null, error: null };
  }

  async createCustom(input: CreateExerciseInput): Promise<{ data?: Exercise; error: Error | null }> {
    const { data: authData } = await this.supabase.client.auth.getUser();
    const userId = authData?.user?.id ?? null;

    const { data, error } = await this.supabase.client
      .from('exercises')
      .insert({
        name: input.name.trim(),
        muscle_group: input.muscle_group ?? null,
        equipment: input.equipment ?? null,
        description: input.description?.trim() ?? null,
        is_custom: true,
        household_id: input.householdId,
        created_by: userId,
      })
      .select()
      .single();
    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async updateCustom(
    id: string,
    updates: { name?: string; muscle_group?: string | null; equipment?: string | null; description?: string | null }
  ): Promise<{ data?: Exercise; error: Error | null }> {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload['name'] = updates.name.trim();
    if (updates.muscle_group !== undefined) payload['muscle_group'] = updates.muscle_group;
    if (updates.equipment !== undefined) payload['equipment'] = updates.equipment;
    if (updates.description !== undefined) payload['description'] = updates.description?.trim() ?? null;

    const { data, error } = await this.supabase.client
      .from('exercises')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async deleteCustom(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('exercises').delete().eq('id', id);
    return { error: error ? (error as unknown as Error) : null };
  }

  private mapRow(row: Record<string, unknown>): Exercise {
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      muscle_group: (row['muscle_group'] as string) ?? null,
      description: (row['description'] as string) ?? null,
      image_url: (row['image_url'] as string) ?? null,
      equipment: (row['equipment'] as string) ?? null,
      is_custom: (row['is_custom'] as boolean) ?? false,
      household_id: (row['household_id'] as string) ?? null,
      created_by: (row['created_by'] as string) ?? null,
      created_at: row['created_at'] as string,
    };
  }
}
