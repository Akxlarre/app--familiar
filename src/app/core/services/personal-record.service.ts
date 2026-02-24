import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { PersonalRecord, RecordType } from '@core/models/fitness.model';

/** Epley: 1RM ≈ weight * (1 + reps/30) */
function estimated1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  return weight * (1 + reps / 30);
}

@Injectable({
  providedIn: 'root',
})
export class PersonalRecordService {
  private supabase = inject(SupabaseService);

  async getRecordsByProfile(profileId: string, householdId: string): Promise<{ data: PersonalRecord[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('personal_records')
      .select('*, exercises (id, name)')
      .eq('profile_id', profileId)
      .order('achieved_at', { ascending: false });
    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map((r) => this.mapRow(r)), error: null };
  }

  async getRecordsByHousehold(householdId: string, limit = 30): Promise<{ data: PersonalRecord[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('personal_records')
      .select('*, exercises (id, name)')
      .eq('household_id', householdId)
      .order('achieved_at', { ascending: false })
      .limit(limit);
    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map((r) => this.mapRow(r)), error: null };
  }

  async getRecordForExercise(
    profileId: string,
    exerciseId: string,
    recordType: RecordType
  ): Promise<{ data: PersonalRecord | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('personal_records')
      .select('*, exercises (id, name)')
      .eq('profile_id', profileId)
      .eq('exercise_id', exerciseId)
      .eq('record_type', recordType)
      .maybeSingle();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapRow(data) : null, error: null };
  }

  /**
   * Check if (weight, reps) is a new PR for max_weight or estimated_1rm and upsert.
   * Returns { isPr: true } if at least one record was updated/inserted.
   */
  async checkAndUpsertPr(
    profileId: string,
    exerciseId: string,
    weight: number,
    reps: number,
    setId: string
  ): Promise<{ isPr: boolean; error: Error | null }> {
    const householdId = await this.getHouseholdId(profileId);
    if (!householdId) return { isPr: false, error: null };

    let isPr = false;
    const volume = weight * reps;
    const e1rm = estimated1RM(weight, reps);

    const { data: maxWeightRec } = await this.getRecordForExercise(profileId, exerciseId, 'max_weight');
    if (!maxWeightRec || weight > maxWeightRec.value) {
      await this.upsertRecord(profileId, householdId, exerciseId, 'max_weight', weight, setId);
      isPr = true;
    }

    const { data: e1rmRec } = await this.getRecordForExercise(profileId, exerciseId, 'estimated_1rm');
    if (!e1rmRec || e1rm > e1rmRec.value) {
      await this.upsertRecord(profileId, householdId, exerciseId, 'estimated_1rm', Math.round(e1rm * 100) / 100, setId);
      isPr = true;
    }

    const { data: volRec } = await this.getRecordForExercise(profileId, exerciseId, 'max_volume');
    if (!volRec || volume > volRec.value) {
      await this.upsertRecord(profileId, householdId, exerciseId, 'max_volume', volume, setId);
      isPr = true;
    }

    return { isPr, error: null };
  }

  /** Compute estimated 1RM from weight and reps (Epley formula). */
  estimate1RM(weight: number, reps: number): number {
    return estimated1RM(weight, reps);
  }

  private async getHouseholdId(profileId: string): Promise<string | null> {
    const { data } = await this.supabase.client.from('profiles').select('household_id').eq('id', profileId).single();
    return (data?.household_id as string) ?? null;
  }

  private async upsertRecord(
    profileId: string,
    householdId: string,
    exerciseId: string,
    recordType: RecordType,
    value: number,
    setId: string
  ): Promise<void> {
    await this.supabase.client
      .from('personal_records')
      .upsert(
        {
          profile_id: profileId,
          household_id: householdId,
          exercise_id: exerciseId,
          record_type: recordType,
          value,
          set_id: setId,
          achieved_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id,exercise_id,record_type' }
      );
  }

  private mapRow(row: Record<string, unknown>): PersonalRecord {
    const ex = row['exercises'] as Record<string, unknown> | null;
    return {
      id: row['id'] as string,
      profile_id: row['profile_id'] as string,
      household_id: row['household_id'] as string,
      exercise_id: row['exercise_id'] as string,
      record_type: row['record_type'] as RecordType,
      value: Number(row['value']),
      set_id: (row['set_id'] as string) ?? null,
      achieved_at: row['achieved_at'] as string,
      exercise: ex ? { id: ex['id'] as string, name: ex['name'] as string } : undefined,
    };
  }
}
