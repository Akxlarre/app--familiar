// =============================================================================
// FamilyApp — Nutrition stats (weekly summary, adherence, history)
// =============================================================================

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BodyLogService } from './body-log.service';
import { GOAL_MET_CALORIE_MARGIN } from '@core/constants/nutrition.constants';

export interface DaySummary {
  date: string;
  caloriesTotal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  caloriesTarget: number;
  goalMet: boolean;
}

export interface WeeklyAverage {
  caloriesAvg: number;
  proteinAvg: number;
  carbsAvg: number;
  fatAvg: number;
}

export interface WeightCaloriePoint {
  date: string;
  weightKg: number | null;
  caloriesTotal: number;
}

@Injectable({
  providedIn: 'root',
})
export class NutritionStatsService {
  private supabase = inject(SupabaseService);
  private bodyLog = inject(BodyLogService);

  /**
   * Resumen de calorías y macros por día en la semana (lun–dom).
   */
  async getWeeklySummary(
    profileId: string,
    weekStartDate: string
  ): Promise<{ data: DaySummary[]; error: Error | null }> {
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const { data: summaries, error } = await this.supabase.client
      .from('daily_nutrition_summaries')
      .select('*')
      .eq('profile_id', profileId)
      .gte('summary_date', startStr)
      .lte('summary_date', endStr)
      .order('summary_date');
    if (error) return { data: [], error: error as unknown as Error };

    const byDate = new Map(
      (summaries ?? []).map((s: Record<string, unknown>) => [
        s['summary_date'],
        {
          date: s['summary_date'] as string,
          caloriesTotal: Number(s['calories_total']),
          proteinG: Number(s['protein_g']),
          carbsG: Number(s['carbs_g']),
          fatG: Number(s['fat_g']),
          caloriesTarget: Number(s['calories_target']),
          goalMet: Boolean(s['goal_met']),
        },
      ])
    );
    let defaultTarget = 2000;
    const { data: profileRow } = await this.supabase.client
      .from('nutrition_profiles')
      .select('calories_target')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (profileRow) defaultTarget = Number((profileRow as Record<string, unknown>)['calories_target']);

    const result: DaySummary[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const existing = byDate.get(dateStr);
      result.push(
        existing ?? {
          date: dateStr,
          caloriesTotal: 0,
          proteinG: 0,
          carbsG: 0,
          fatG: 0,
          caloriesTarget: defaultTarget,
          goalMet: false,
        }
      );
    }
    return { data: result, error: null };
  }

  /**
   * Promedio diario de la semana.
   */
  async getWeeklyAverage(
    profileId: string,
    weekStartDate: string
  ): Promise<{ data: WeeklyAverage; error: Error | null }> {
    const { data: days, error } = await this.getWeeklySummary(
      profileId,
      weekStartDate
    );
    if (error) return { data: { caloriesAvg: 0, proteinAvg: 0, carbsAvg: 0, fatAvg: 0 }, error };
    const n = days.length || 1;
    return {
      data: {
        caloriesAvg: Math.round(
          days.reduce((s, d) => s + d.caloriesTotal, 0) / n
        ),
        proteinAvg: Math.round(
          (days.reduce((s, d) => s + d.proteinG, 0) / n) * 100
        ) / 100,
        carbsAvg: Math.round(
          (days.reduce((s, d) => s + d.carbsG, 0) / n) * 100
        ) / 100,
        fatAvg: Math.round(
          (days.reduce((s, d) => s + d.fatG, 0) / n) * 100
        ) / 100,
      },
      error: null,
    };
  }

  /**
   * Porcentaje de días en los últimos N días donde se cumplió el objetivo (±100 kcal).
   */
  async getGoalAdherence(
    profileId: string,
    days = 30
  ): Promise<{ data: number; error: Error | null }> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const { data: rows, error } = await this.supabase.client
      .from('daily_nutrition_summaries')
      .select('calories_total, calories_target, goal_met')
      .eq('profile_id', profileId)
      .gte('summary_date', startStr)
      .lte('summary_date', endStr);
    if (error) return { data: 0, error: error as unknown as Error };

    const list = (rows ?? []) as { calories_total: number; calories_target: number; goal_met: boolean }[];
    const met = list.filter(
      (r) =>
        r.goal_met ||
        Math.abs(r.calories_total - r.calories_target) <= GOAL_MET_CALORIE_MARGIN
    ).length;
    const total = list.length || 1;
    return { data: Math.round((met / total) * 100), error: null };
  }

  /**
   * Proteína diaria en los últimos N días (para gráfica de tendencia).
   */
  async getProteinHistory(
    profileId: string,
    days = 30
  ): Promise<{ data: { date: string; proteinG: number }[]; error: Error | null }> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const { data, error } = await this.supabase.client
      .from('daily_nutrition_summaries')
      .select('summary_date, protein_g')
      .eq('profile_id', profileId)
      .gte('summary_date', startStr)
      .lte('summary_date', endStr)
      .order('summary_date');
    if (error) return { data: [], error: error as unknown as Error };
    const list = (data ?? []).map((r: Record<string, unknown>) => ({
      date: r['summary_date'] as string,
      proteinG: Number(r['protein_g']),
    }));
    return { data: list, error: null };
  }

  /**
   * Peso corporal + calorías diarias superpuestos (para correlación).
   */
  async getWeightCalorieCorrelation(
    profileId: string,
    days = 30
  ): Promise<{ data: WeightCaloriePoint[]; error: Error | null }> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const [summariesRes, bodyLogsRes] = await Promise.all([
      this.supabase.client
        .from('daily_nutrition_summaries')
        .select('summary_date, calories_total')
        .eq('profile_id', profileId)
        .gte('summary_date', startStr)
        .lte('summary_date', endStr)
        .order('summary_date'),
      this.bodyLog.getBodyLogsByProfile(profileId, {
        fromDate: startStr,
        toDate: endStr,
      }),
    ]);
    if (summariesRes.error)
      return { data: [], error: summariesRes.error as unknown as Error };

    const weightByDate = new Map(
      (bodyLogsRes.data ?? []).map((l) => [l.date, l.weight_kg])
    );
    const result: WeightCaloriePoint[] = (summariesRes.data ?? []).map(
      (r: Record<string, unknown>) => ({
        date: r['summary_date'] as string,
        weightKg: weightByDate.get(r['summary_date'] as string) ?? null,
        caloriesTotal: Number(r['calories_total']),
      })
    );
    return { data: result, error: null };
  }
}
