// =============================================================================
// FamilyApp — Nutrition profile CRUD and recalibration
// =============================================================================

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BodyLogService } from './body-log.service';
import { NutritionCalculatorService } from './nutrition-calculator.service';
import type {
  NutritionProfile,
  CreateNutritionProfileInput,
  UpdateNutritionProfileInput,
} from '@core/models/nutrition.model';

@Injectable({
  providedIn: 'root',
})
export class NutritionProfileService {
  private supabase = inject(SupabaseService);
  private bodyLog = inject(BodyLogService);
  private calculator = inject(NutritionCalculatorService);

  async getByProfileId(profileId: string): Promise<{
    data: NutritionProfile | null;
    error: Error | null;
  }> {
    const { data, error } = await this.supabase.client
      .from('nutrition_profiles')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapRow(data) : null, error: null };
  }

  async create(input: CreateNutritionProfileInput): Promise<{
    data?: NutritionProfile;
    error: Error | null;
  }> {
    const age = this.calculator.calculateAge(input.birthdate);
    const bmr = this.calculator.calculateBMR(
      input.sex,
      input.weightKg,
      input.heightCm,
      age
    );
    const tdee = this.calculator.calculateTDEE(bmr, input.activityLevel);
    const caloriesTarget = this.calculator.calculateCalorieTarget(tdee, input.goal);
    const proteinTargetG = this.calculator.calculateProteinTarget(
      input.weightKg,
      input.goal
    );
    const macroTargets = this.calculator.calculateMacroTargets(
      caloriesTarget,
      input.weightKg,
      input.goal,
      {
        proteinPct: input.macroProteinPct ?? 30,
        carbsPct: input.macroCarbsPct ?? 40,
        fatPct: input.macroFatPct ?? 30,
      }
    );

    const { data, error } = await this.supabase.client
      .from('nutrition_profiles')
      .insert({
        profile_id: input.profileId,
        household_id: input.householdId,
        sex: input.sex,
        birthdate: input.birthdate,
        height_cm: input.heightCm,
        weight_kg: input.weightKg,
        activity_level: input.activityLevel,
        goal: input.goal,
        calories_target: caloriesTarget,
        protein_target_g: proteinTargetG,
        carbs_target_g: macroTargets.carbsG,
        fat_target_g: macroTargets.fatG,
        macro_protein_pct: input.macroProteinPct ?? 30,
        macro_carbs_pct: input.macroCarbsPct ?? 40,
        macro_fat_pct: input.macroFatPct ?? 30,
        is_manual_override: input.isManualOverride ?? false,
        last_recalibration: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();
    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async update(
    id: string,
    input: UpdateNutritionProfileInput
  ): Promise<{ data?: NutritionProfile; error: Error | null }> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.sex !== undefined) payload['sex'] = input.sex;
    if (input.birthdate !== undefined) payload['birthdate'] = input.birthdate;
    if (input.heightCm !== undefined) payload['height_cm'] = input.heightCm;
    if (input.weightKg !== undefined) payload['weight_kg'] = input.weightKg;
    if (input.activityLevel !== undefined)
      payload['activity_level'] = input.activityLevel;
    if (input.goal !== undefined) payload['goal'] = input.goal;
    if (input.caloriesTarget !== undefined)
      payload['calories_target'] = input.caloriesTarget;
    if (input.proteinTargetG !== undefined)
      payload['protein_target_g'] = input.proteinTargetG;
    if (input.carbsTargetG !== undefined)
      payload['carbs_target_g'] = input.carbsTargetG;
    if (input.fatTargetG !== undefined) payload['fat_target_g'] = input.fatTargetG;
    if (input.macroProteinPct !== undefined)
      payload['macro_protein_pct'] = input.macroProteinPct;
    if (input.macroCarbsPct !== undefined)
      payload['macro_carbs_pct'] = input.macroCarbsPct;
    if (input.macroFatPct !== undefined)
      payload['macro_fat_pct'] = input.macroFatPct;
    if (input.isManualOverride !== undefined)
      payload['is_manual_override'] = input.isManualOverride;
    if (input.lastRecalibration !== undefined)
      payload['last_recalibration'] = input.lastRecalibration;

    const { data, error } = await this.supabase.client
      .from('nutrition_profiles')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) return { error: error as unknown as Error };
    return { data: this.mapRow(data), error: null };
  }

  async delete(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client
      .from('nutrition_profiles')
      .delete()
      .eq('id', id);
    return { error: error ? (error as unknown as Error) : null };
  }

  /**
   * Recalcula TDEE y metas cuando cambia el peso (ej. desde módulo Cuidado Físico).
   * No aplica si is_manual_override es true.
   */
  async recalibrateFromWeight(
    profileId: string,
    newWeightKg: number
  ): Promise<{ data?: NutritionProfile; error: Error | null }> {
    const { data: profile, error: fetchError } = await this.getByProfileId(
      profileId
    );
    if (fetchError || !profile) return { error: fetchError ?? new Error('Profile not found') };
    if (profile.is_manual_override) return { data: profile, error: null };

    const age = this.calculator.calculateAge(profile.birthdate);
    const bmr = this.calculator.calculateBMR(
      profile.sex,
      newWeightKg,
      profile.height_cm,
      age
    );
    const tdee = this.calculator.calculateTDEE(bmr, profile.activity_level);
    const caloriesTarget = this.calculator.calculateCalorieTarget(
      tdee,
      profile.goal
    );
    const proteinTargetG = this.calculator.calculateProteinTarget(
      newWeightKg,
      profile.goal
    );
    const macroTargets = this.calculator.calculateMacroTargets(
      caloriesTarget,
      newWeightKg,
      profile.goal,
      {
        proteinPct: profile.macro_protein_pct,
        carbsPct: profile.macro_carbs_pct,
        fatPct: profile.macro_fat_pct,
      }
    );

    const today = new Date().toISOString().slice(0, 10);
    return this.update(profile.id, {
      weightKg: newWeightKg,
      caloriesTarget,
      proteinTargetG,
      carbsTargetG: macroTargets.carbsG,
      fatTargetG: macroTargets.fatG,
      lastRecalibration: today,
    });
  }

  /**
   * Sincroniza el peso del perfil nutricional con el último peso del body log si existe.
   */
  async syncWeightFromBodyLog(profileId: string): Promise<{
    data?: NutritionProfile;
    error: Error | null;
  }> {
    const { data: latestWeight, error: weightError } =
      await this.bodyLog.getLatestWeight(profileId);
    if (weightError || latestWeight == null) return { error: weightError ?? null };
    return this.recalibrateFromWeight(profileId, latestWeight);
  }

  private mapRow(row: Record<string, unknown>): NutritionProfile {
    return {
      id: row['id'] as string,
      profile_id: row['profile_id'] as string,
      household_id: row['household_id'] as string,
      sex: row['sex'] as NutritionProfile['sex'],
      birthdate: row['birthdate'] as string,
      height_cm: Number(row['height_cm']),
      weight_kg: Number(row['weight_kg']),
      activity_level: row['activity_level'] as NutritionProfile['activity_level'],
      goal: row['goal'] as NutritionProfile['goal'],
      calories_target: Number(row['calories_target']),
      protein_target_g: Number(row['protein_target_g']),
      carbs_target_g: Number(row['carbs_target_g']),
      fat_target_g: Number(row['fat_target_g']),
      macro_protein_pct: Number(row['macro_protein_pct']),
      macro_carbs_pct: Number(row['macro_carbs_pct']),
      macro_fat_pct: Number(row['macro_fat_pct']),
      is_manual_override: Boolean(row['is_manual_override']),
      last_recalibration: (row['last_recalibration'] as string) ?? null,
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
    };
  }
}
