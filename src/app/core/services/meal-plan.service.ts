// =============================================================================
// FamilyApp — Meal Plan Service
// Gestiona el plan semanal de comidas: cabecera + slots de la grilla.
// Integra con ShoppingListService para generar la lista de compras.
// =============================================================================

import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type {
    MealPlan,
    MealPlanSlot,
    CreateMealPlanInput,
    UpsertSlotInput,
    WeekGrid,
    WeeklyNutritionSummary,
} from '@core/models/meals.model';

@Injectable({ providedIn: 'root' })
export class MealPlanService {
    private readonly supabase = inject(SupabaseService);

    // --------------------------------------------------------------------------
    // Plan (cabecera)
    // --------------------------------------------------------------------------

    /** Obtiene el plan activo de la semana indicada (o the más reciente). */
    async getActivePlan(
        householdId: string,
        weekStartDate?: string
    ): Promise<{ data: MealPlan | null; error: Error | null }> {
        let q = this.supabase.client
            .from('meal_plans')
            .select('*')
            .eq('household_id', householdId)
            .in('status', ['draft', 'active'])
            .order('week_start_date', { ascending: false })
            .limit(1);

        if (weekStartDate) {
            q = q.eq('week_start_date', weekStartDate);
        }

        const { data, error } = await q.maybeSingle();
        if (error) return { data: null, error: error as unknown as Error };
        return { data: data ? this.mapPlan(data) : null, error: null };
    }

    /** Crea un plan nuevo en estado 'draft' para la semana indicada. */
    async createPlan(input: CreateMealPlanInput): Promise<{ data?: MealPlan; error: Error | null }> {
        const { data, error } = await this.supabase.client
            .from('meal_plans')
            .insert({
                household_id: input.householdId,
                week_start_date: input.weekStartDate ?? null,
                status: 'draft',
                created_by: input.createdBy ?? null,
            })
            .select()
            .single();

        if (error) return { error: error as unknown as Error };
        return { data: this.mapPlan(data), error: null };
    }

    /** Activa un plan (cambia status de 'draft' → 'active'). */
    async activatePlan(planId: string): Promise<{ error: Error | null }> {
        const { error } = await this.supabase.client
            .from('meal_plans')
            .update({ status: 'active', updated_at: new Date().toISOString() } as never)
            .eq('id', planId);
        return { error: error ? (error as unknown as Error) : null };
    }

    /** Archiva el plan activo anterior antes de crear uno nuevo. */
    async archiveOlderPlans(householdId: string, currentPlanId: string): Promise<void> {
        await this.supabase.client
            .from('meal_plans')
            .update({ status: 'archived' } as never)
            .eq('household_id', householdId)
            .in('status', ['active'])
            .neq('id', currentPlanId);
    }

    // --------------------------------------------------------------------------
    // Slots (celdas de la grilla)
    // --------------------------------------------------------------------------

    /** Carga todos los slots de un plan. */
    async getSlots(planId: string): Promise<{ data: MealPlanSlot[]; error: Error | null }> {
        const { data, error } = await this.supabase.client
            .from('meal_plan_slots')
            .select(`
        *,
        recipe:recipe_id (
          id, name, calories, protein, carbs, fat, prep_time_min, meal_type
        )
      `)
            .eq('plan_id', planId)
            .order('day_of_week', { ascending: true });

        return {
            data: data ? data.map((s) => this.mapSlot(s as Record<string, unknown>)) : [],
            error: error ? (error as unknown as Error) : null,
        };
    }

    /**
     * Construye el WeekGrid (mapa día × meal_type → slot) desde una lista de slots.
     * Útil para renderizar la grilla en el componente sin lógica extra.
     */
    buildGrid(slots: MealPlanSlot[]): WeekGrid {
        const grid: WeekGrid = {};
        for (let d = 1; d <= 7; d++) {
            grid[d] = {};
        }
        for (const slot of slots) {
            grid[slot.day_of_week] ??= {};
            grid[slot.day_of_week][slot.meal_type] = slot;
        }
        return grid;
    }

    /**
     * Upsert de un slot (crea si no existe, actualiza si ya existe).
     * Usa la restricción UNIQUE (plan_id, day_of_week, meal_type, profile_id).
     */
    async upsertSlot(input: UpsertSlotInput): Promise<{ data?: MealPlanSlot; error: Error | null }> {
        const { data, error } = await this.supabase.client
            .from('meal_plan_slots')
            .upsert(
                {
                    plan_id: input.planId,
                    day_of_week: input.dayOfWeek,
                    meal_type: input.mealType,
                    slot_type: input.slotType,
                    recipe_id: input.recipeId ?? null,
                    profile_id: input.profileId ?? null,
                    notes: input.notes ?? null,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'plan_id,day_of_week,meal_type,profile_id' }
            )
            .select()
            .single();

        if (error) return { error: error as unknown as Error };
        return { data: this.mapSlot(data as Record<string, unknown>), error: null };
    }

    /** Marca un slot como "ya cocinado/comido". */
    async markDone(slotId: string, done: boolean): Promise<{ error: Error | null }> {
        const { error } = await this.supabase.client
            .from('meal_plan_slots')
            .update({ is_done: done, updated_at: new Date().toISOString() } as never)
            .eq('id', slotId);
        return { error: error ? (error as unknown as Error) : null };
    }

    async deleteSlot(slotId: string): Promise<{ error: Error | null }> {
        const { error } = await this.supabase.client
            .from('meal_plan_slots')
            .delete()
            .eq('id', slotId);
        return { error: error ? (error as unknown as Error) : null };
    }

    // --------------------------------------------------------------------------
    // Resumen nutricional proyectado
    // --------------------------------------------------------------------------

    /**
     * Calcula el resumen nutricional de la semana a partir de los slots
     * que tienen receta con macros definidos.
     * Funciona en cliente (sin RPC) para v1.
     */
    calcWeeklySummary(slots: MealPlanSlot[], profileId: string): WeeklyNutritionSummary {
        let totalCal = 0, totalProt = 0, totalCarbs = 0, totalFat = 0, daysSet = new Set<number>();

        for (const slot of slots) {
            if (slot.slot_type !== 'recipe' || !slot.recipe) continue;
            if (slot.profile_id !== null && slot.profile_id !== profileId) continue;
            totalCal += slot.recipe.calories ?? 0;
            totalProt += slot.recipe.protein ?? 0;
            totalCarbs += slot.recipe.carbs ?? 0;
            totalFat += slot.recipe.fat ?? 0;
            daysSet.add(slot.day_of_week);
        }

        const days = daysSet.size || 1;
        return {
            profileId,
            totalCalories: Math.round(totalCal),
            totalProteinG: Math.round(totalProt),
            totalCarbsG: Math.round(totalCarbs),
            totalFatG: Math.round(totalFat),
            daysPlanned: daysSet.size,
            avgCaloriesPerDay: Math.round(totalCal / days),
            avgProteinPerDay: Math.round(totalProt / days),
        };
    }

    // --------------------------------------------------------------------------
    // Mappers
    // --------------------------------------------------------------------------

    private mapPlan(row: Record<string, unknown>): MealPlan {
        return {
            id: row['id'] as string,
            household_id: row['household_id'] as string,
            week_start_date: (row['week_start_date'] as string) ?? null,
            status: row['status'] as MealPlan['status'],
            created_by: (row['created_by'] as string) ?? null,
            created_at: row['created_at'] as string,
        };
    }

    private mapSlot(row: Record<string, unknown>): MealPlanSlot {
        const recipe = row['recipe'] as Record<string, unknown> | null;
        return {
            id: row['id'] as string,
            plan_id: row['plan_id'] as string,
            day_of_week: Number(row['day_of_week']),
            meal_type: row['meal_type'] as MealPlanSlot['meal_type'],
            slot_type: row['slot_type'] as MealPlanSlot['slot_type'],
            recipe_id: (row['recipe_id'] as string) ?? null,
            profile_id: (row['profile_id'] as string) ?? null,
            notes: (row['notes'] as string) ?? null,
            is_done: (row['is_done'] as boolean) ?? false,
            created_at: row['created_at'] as string,
            updated_at: row['updated_at'] as string,
            recipe: recipe
                ? {
                    id: recipe['id'] as string,
                    name: recipe['name'] as string,
                    calories: recipe['calories'] != null ? Number(recipe['calories']) : null,
                    protein: recipe['protein'] != null ? Number(recipe['protein']) : null,
                    carbs: recipe['carbs'] != null ? Number(recipe['carbs']) : null,
                    fat: recipe['fat'] != null ? Number(recipe['fat']) : null,
                    prep_time_min: recipe['prep_time_min'] != null ? Number(recipe['prep_time_min']) : null,
                    meal_type: recipe['meal_type'] as MealPlanSlot['meal_type'],
                }
                : undefined,
        };
    }
}
