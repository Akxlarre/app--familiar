// =============================================================================
// FamilyApp — Food log (daily entries + daily summary cache)
// =============================================================================

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { NutritionProfileService } from './nutrition-profile.service';
import { GOAL_MET_CALORIE_MARGIN } from '@core/constants/nutrition.constants';
import type {
  FoodLog,
  CreateFoodLogInput,
  UpdateFoodLogInput,
  DailyNutritionSummary,
  MealType,
} from '@core/models/nutrition.model';

export type LogsByMeal = Partial<Record<MealType, FoodLog[]>>;

@Injectable({
  providedIn: 'root',
})
export class FoodLogService {
  private supabase = inject(SupabaseService);
  private nutritionProfile = inject(NutritionProfileService);

  /**
   * Logs del día para el perfil. Opcionalmente con datos del alimento (join).
   */
  async getLogsByDate(
    profileId: string,
    date: string,
    options?: { withFood?: boolean }
  ): Promise<{ data: FoodLog[]; error: Error | null }> {
    let query = this.supabase.client
      .from('food_logs')
      .select(options?.withFood ? '*, food:foods(id, name, brand)' : '*')
      .eq('profile_id', profileId)
      .eq('log_date', date)
      .order('meal_type')
      .order('created_at', { ascending: true });
    const { data, error } = await query;
    if (error) return { data: [], error: error as unknown as Error };
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    return {
      data: rows.map((r) => this.mapLogRow(r)),
      error: null,
    };
  }

  /**
   * Logs del día agrupados por meal_type.
   */
  async getLogsByDateGrouped(
    profileId: string,
    date: string
  ): Promise<{ data: LogsByMeal; error: Error | null }> {
    const { data: list, error } = await this.getLogsByDate(profileId, date, {
      withFood: true,
    });
    if (error) return { data: {}, error };
    const grouped: LogsByMeal = {};
    for (const log of list) {
      const meal = log.meal_type;
      if (!grouped[meal]) grouped[meal] = [];
      grouped[meal]!.push(log);
    }
    return { data: grouped, error: null };
  }

  async createLog(input: CreateFoodLogInput): Promise<{
    data?: FoodLog;
    error: Error | null;
  }> {
    const { data, error } = await this.supabase.client
      .from('food_logs')
      .insert({
        profile_id: input.profileId,
        household_id: input.householdId,
        log_date: input.logDate,
        meal_type: input.mealType,
        food_id: input.foodId,
        quantity_g: input.quantityG,
        calories: input.calories,
        protein_g: input.proteinG,
        carbs_g: input.carbsG,
        fat_g: input.fatG,
        from_saved_meal_id: input.fromSavedMealId ?? null,
        from_inventory: input.fromInventory ?? false,
        pantry_item_id: input.pantryItemId ?? null,
      })
      .select()
      .single();
    if (error) return { error: error as unknown as Error };
    await this.upsertDailySummary(input.profileId, input.logDate);
    return { data: this.mapLogRow(data as Record<string, unknown>), error: null };
  }

  async updateLog(
    id: string,
    input: UpdateFoodLogInput
  ): Promise<{ data?: FoodLog; error: Error | null }> {
    const { data: existing } = await this.supabase.client
      .from('food_logs')
      .select('profile_id, log_date')
      .eq('id', id)
      .single();
    if (!existing) return { error: new Error('Log not found') };

    const payload: Record<string, unknown> = {};
    if (input.logDate !== undefined) payload['log_date'] = input.logDate;
    if (input.mealType !== undefined) payload['meal_type'] = input.mealType;
    if (input.quantityG !== undefined) payload['quantity_g'] = input.quantityG;
    if (input.calories !== undefined) payload['calories'] = input.calories;
    if (input.proteinG !== undefined) payload['protein_g'] = input.proteinG;
    if (input.carbsG !== undefined) payload['carbs_g'] = input.carbsG;
    if (input.fatG !== undefined) payload['fat_g'] = input.fatG;

    const { data, error } = await this.supabase.client
      .from('food_logs')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) return { error: error as unknown as Error };
    const profileId = existing.profile_id as string;
    const logDate = (input.logDate ?? existing.log_date) as string;
    await this.upsertDailySummary(profileId, logDate);
    return { data: this.mapLogRow(data as Record<string, unknown>), error: null };
  }

  async deleteLog(id: string): Promise<{ error: Error | null }> {
    const { data: existing } = await this.supabase.client
      .from('food_logs')
      .select('profile_id, log_date')
      .eq('id', id)
      .single();
    if (!existing) return { error: new Error('Log not found') };

    const { error } = await this.supabase.client.from('food_logs').delete().eq('id', id);
    if (error) return { error: error as unknown as Error };
    await this.upsertDailySummary(
      existing.profile_id as string,
      existing.log_date as string
    );
    return { error: null };
  }

  /**
   * Totales del día (desde cache o calculados).
   */
  async getDailySummary(
    profileId: string,
    date: string
  ): Promise<{ data: DailyNutritionSummary | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('daily_nutrition_summaries')
      .select('*')
      .eq('profile_id', profileId)
      .eq('summary_date', date)
      .maybeSingle();
    if (error) return { data: null, error: error as unknown as Error };
    if (data) return { data: this.mapSummaryRow(data as Record<string, unknown>), error: null };
    await this.upsertDailySummary(profileId, date);
    const { data: after } = await this.supabase.client
      .from('daily_nutrition_summaries')
      .select('*')
      .eq('profile_id', profileId)
      .eq('summary_date', date)
      .single();
    return {
      data: after ? this.mapSummaryRow(after as Record<string, unknown>) : null,
      error: null,
    };
  }

  /**
   * Calorías restantes hasta el objetivo del día.
   */
  async getRemainingCalories(
    profileId: string,
    date: string
  ): Promise<{ data: number | null; error: Error | null }> {
    const { data: summary, error } = await this.getDailySummary(profileId, date);
    if (error || !summary) return { data: null, error: error ?? null };
    const remaining = summary.calories_target - summary.calories_total;
    return { data: remaining, error: null };
  }

  /**
   * Recalcula y hace upsert de daily_nutrition_summaries para el día.
   */
  private async upsertDailySummary(profileId: string, date: string): Promise<void> {
    const { data: logs } = await this.supabase.client
      .from('food_logs')
      .select('calories, protein_g, carbs_g, fat_g')
      .eq('profile_id', profileId)
      .eq('log_date', date);
    const caloriesTotal = (logs ?? []).reduce((s, r) => s + Number(r.calories), 0);
    const proteinG = (logs ?? []).reduce((s, r) => s + Number(r.protein_g), 0);
    const carbsG = (logs ?? []).reduce((s, r) => s + Number(r.carbs_g), 0);
    const fatG = (logs ?? []).reduce((s, r) => s + Number(r.fat_g), 0);

    const { data: profile } = await this.nutritionProfile.getByProfileId(profileId);
    const caloriesTarget = profile?.calories_target ?? 2000;
    const goalMet =
      Math.abs(caloriesTotal - caloriesTarget) <= GOAL_MET_CALORIE_MARGIN;

    await this.supabase.client.from('daily_nutrition_summaries').upsert(
      {
        profile_id: profileId,
        summary_date: date,
        calories_total: Math.round(caloriesTotal * 100) / 100,
        protein_g: Math.round(proteinG * 100) / 100,
        carbs_g: Math.round(carbsG * 100) / 100,
        fat_g: Math.round(fatG * 100) / 100,
        calories_target: caloriesTarget,
        goal_met: goalMet,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id,summary_date' }
    );
  }

  private mapLogRow(row: Record<string, unknown>): FoodLog {
    const food = row['food'] as Record<string, unknown> | undefined;
    return {
      id: row['id'] as string,
      profile_id: row['profile_id'] as string,
      household_id: row['household_id'] as string,
      log_date: row['log_date'] as string,
      meal_type: row['meal_type'] as MealType,
      food_id: row['food_id'] as string,
      quantity_g: Number(row['quantity_g']),
      calories: Number(row['calories']),
      protein_g: Number(row['protein_g']),
      carbs_g: Number(row['carbs_g']),
      fat_g: Number(row['fat_g']),
      from_saved_meal_id: (row['from_saved_meal_id'] as string) ?? null,
      from_inventory: Boolean(row['from_inventory']),
      pantry_item_id: (row['pantry_item_id'] as string) ?? null,
      created_at: row['created_at'] as string,
      ...(food && {
        food: {
          id: food['id'] as string,
          name: food['name'] as string,
          brand: (food['brand'] as string) ?? undefined,
        },
      }),
    };
  }

  private mapSummaryRow(row: Record<string, unknown>): DailyNutritionSummary {
    return {
      id: row['id'] as string,
      profile_id: row['profile_id'] as string,
      summary_date: row['summary_date'] as string,
      calories_total: Number(row['calories_total']),
      protein_g: Number(row['protein_g']),
      carbs_g: Number(row['carbs_g']),
      fat_g: Number(row['fat_g']),
      calories_target: Number(row['calories_target']),
      goal_met: Boolean(row['goal_met']),
      updated_at: row['updated_at'] as string,
    };
  }
}
