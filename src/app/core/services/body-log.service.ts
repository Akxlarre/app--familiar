import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { BodyLog } from '@core/models/fitness.model';
import type { CreateBodyLogInput } from '@core/models/fitness.model';

export interface UpdateBodyLogInput {
  date?: string;
  weight_kg?: number | null;
  waist_cm?: number | null;
  hips_cm?: number | null;
  chest_cm?: number | null;
  arms_cm?: number | null;
  legs_cm?: number | null;
  notes?: string | null;
  photo_url?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class BodyLogService {
  private supabase = inject(SupabaseService);

  async getBodyLogsByProfile(
    profileId: string,
    options?: { fromDate?: string; toDate?: string; limit?: number }
  ): Promise<{ data: BodyLog[]; error: Error | null }> {
    let query = this.supabase.client
      .from('body_logs')
      .select('*')
      .eq('profile_id', profileId)
      .order('date', { ascending: false })
      .limit(options?.limit ?? 100);
    if (options?.fromDate) query = query.gte('date', options.fromDate);
    if (options?.toDate) query = query.lte('date', options.toDate);
    const { data, error } = await query;
    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map((r) => this.mapRow(r)), error: null };
  }

  async getBodyLog(id: string): Promise<{ data: BodyLog | null; error: Error | null }> {
    const { data, error } = await this.supabase.client.from('body_logs').select('*').eq('id', id).maybeSingle();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapRow(data) : null, error: null };
  }

  async createBodyLog(input: CreateBodyLogInput): Promise<{ data?: BodyLog; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('body_logs')
      .insert({
        profile_id: input.profileId,
        household_id: input.householdId,
        date: input.date,
        weight_kg: input.weightKg ?? null,
        waist_cm: input.waistCm ?? null,
        hips_cm: input.hipsCm ?? null,
        chest_cm: input.chestCm ?? null,
        arms_cm: input.armsCm ?? null,
        legs_cm: input.legsCm ?? null,
        notes: input.notes?.trim() ?? null,
        photo_url: input.photoUrl ?? null,
      })
      .select()
      .single();
    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async updateBodyLog(id: string, input: UpdateBodyLogInput): Promise<{ data?: BodyLog; error: Error | null }> {
    const payload: Record<string, unknown> = {};
    if (input.date !== undefined) payload['date'] = input.date;
    if (input.weight_kg !== undefined) payload['weight_kg'] = input.weight_kg;
    if (input.waist_cm !== undefined) payload['waist_cm'] = input.waist_cm;
    if (input.hips_cm !== undefined) payload['hips_cm'] = input.hips_cm;
    if (input.chest_cm !== undefined) payload['chest_cm'] = input.chest_cm;
    if (input.arms_cm !== undefined) payload['arms_cm'] = input.arms_cm;
    if (input.legs_cm !== undefined) payload['legs_cm'] = input.legs_cm;
    if (input.notes !== undefined) payload['notes'] = input.notes?.trim() ?? null;
    if (input.photo_url !== undefined) payload['photo_url'] = input.photo_url;

    const { data, error } = await this.supabase.client.from('body_logs').update(payload).eq('id', id).select().single();
    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async deleteBodyLog(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('body_logs').delete().eq('id', id);
    return { error: error ? (error as unknown as Error) : null };
  }

  async getLatestWeight(profileId: string): Promise<{ data: number | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('body_logs')
      .select('weight_kg')
      .eq('profile_id', profileId)
      .not('weight_kg', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data?.weight_kg != null ? Number(data.weight_kg) : null, error: null };
  }

  private mapRow(row: Record<string, unknown>): BodyLog {
    return {
      id: row['id'] as string,
      profile_id: row['profile_id'] as string,
      household_id: row['household_id'] as string,
      date: row['date'] as string,
      weight_kg: row['weight_kg'] != null ? Number(row['weight_kg']) : null,
      waist_cm: row['waist_cm'] != null ? Number(row['waist_cm']) : null,
      hips_cm: row['hips_cm'] != null ? Number(row['hips_cm']) : null,
      chest_cm: row['chest_cm'] != null ? Number(row['chest_cm']) : null,
      arms_cm: row['arms_cm'] != null ? Number(row['arms_cm']) : null,
      legs_cm: row['legs_cm'] != null ? Number(row['legs_cm']) : null,
      notes: (row['notes'] as string) ?? null,
      photo_url: (row['photo_url'] as string) ?? null,
      created_at: row['created_at'] as string,
    };
  }
}
