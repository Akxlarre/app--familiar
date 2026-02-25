// =============================================================================
// FamilyApp — Saved meals (recipes / combos)
// =============================================================================

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { FoodLogService } from './food-log.service';
import type {
  SavedMeal,
  SavedMealItem,
  CreateSavedMealInput,
  UpdateSavedMealInput,
  MealType,
} from '@core/models/nutrition.model';

@Injectable({
  providedIn: 'root',
})
export class SavedMealService {
  private supabase = inject(SupabaseService);
  private foodLog = inject(FoodLogService);

  async getSavedMeals(profileId: string): Promise<{
    data: SavedMeal[];
    error: Error | null;
  }> {
    const { data, error } = await this.supabase.client
      .from('saved_meals')
      .select('*')
      .eq('profile_id', profileId)
      .order('name');
    if (error) return { data: [], error: error as unknown as Error };
    const meals = (data ?? []).map((r) => this.mapMealRow(r as Record<string, unknown>));
    for (const meal of meals) {
      meal.items = await this.getItems(meal.id);
    }
    return { data: meals, error: null };
  }

  async getSavedMeal(
    id: string
  ): Promise<{ data: SavedMeal | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('saved_meals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return { data: null, error: error as unknown as Error };
    if (!data) return { data: null, error: null };
    const meal = this.mapMealRow(data as Record<string, unknown>);
    meal.items = await this.getItems(meal.id);
    return { data: meal, error: null };
  }

  async createSavedMeal(input: CreateSavedMealInput): Promise<{
    data?: SavedMeal;
    error: Error | null;
  }> {
    const { data: meal, error: mealError } = await this.supabase.client
      .from('saved_meals')
      .insert({
        profile_id: input.profileId,
        household_id: input.householdId,
        name: input.name.trim(),
        total_calories: input.totalCalories,
        total_protein_g: input.totalProteinG,
        total_carbs_g: input.totalCarbsG,
        total_fat_g: input.totalFatG,
      })
      .select()
      .single();
    if (mealError) return { error: mealError as unknown as Error };
    const savedMealId = (meal as Record<string, unknown>)['id'] as string;
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      await this.supabase.client.from('saved_meal_items').insert({
        saved_meal_id: savedMealId,
        food_id: item.foodId,
        quantity_g: item.quantityG,
        sort_order: item.sortOrder ?? i,
      });
    }
    const { data: full } = await this.getSavedMeal(savedMealId);
    return { data: full ?? undefined, error: null };
  }

  async updateSavedMeal(
    id: string,
    input: UpdateSavedMealInput
  ): Promise<{ data?: SavedMeal; error: Error | null }> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.name !== undefined) payload['name'] = input.name.trim();
    if (input.totalCalories !== undefined)
      payload['total_calories'] = input.totalCalories;
    if (input.totalProteinG !== undefined)
      payload['total_protein_g'] = input.totalProteinG;
    if (input.totalCarbsG !== undefined)
      payload['total_carbs_g'] = input.totalCarbsG;
    if (input.totalFatG !== undefined) payload['total_fat_g'] = input.totalFatG;

    const { error: updateError } = await this.supabase.client
      .from('saved_meals')
      .update(payload)
      .eq('id', id);
    if (updateError) return { error: updateError as unknown as Error };

    if (input.items !== undefined) {
      await this.supabase.client
        .from('saved_meal_items')
        .delete()
        .eq('saved_meal_id', id);
      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i];
        await this.supabase.client.from('saved_meal_items').insert({
          saved_meal_id: id,
          food_id: item.foodId,
          quantity_g: item.quantityG,
          sort_order: item.sortOrder ?? i,
        });
      }
    }
    const { data: full } = await this.getSavedMeal(id);
    return { data: full ?? undefined, error: null };
  }

  async deleteSavedMeal(id: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client
      .from('saved_meals')
      .delete()
      .eq('id', id);
    return { error: error ? (error as unknown as Error) : null };
  }

  /**
   * Registra la comida guardada en el día y tipo de comida indicados, escalando por porciones.
   * Crea un food_log por cada ítem de la receta con cantidades y macros escalados.
   */
  async logSavedMeal(
    savedMealId: string,
    profileId: string,
    householdId: string,
    date: string,
    mealType: MealType,
    portions: number
  ): Promise<{ data?: number; error: Error | null }> {
    const { data: meal, error: mealError } = await this.getSavedMealWithFoods(
      savedMealId
    );
    if (mealError || !meal) return { error: mealError ?? new Error('Saved meal not found') };

    let count = 0;
    for (const item of meal.items ?? []) {
      const food = item.food;
      if (!food || !('calories_100' in food)) continue;
      const q = (item.quantity_g * portions) / 100;
      const calories = Math.round((food.calories_100 ?? 0) * item.quantity_g * portions / 100);
      const proteinG = Math.round((food.protein_100 ?? 0) * item.quantity_g * portions / 100 * 100) / 100;
      const carbsG = Math.round((food.carbs_100 ?? 0) * item.quantity_g * portions / 100 * 100) / 100;
      const fatG = Math.round((food.fat_100 ?? 0) * item.quantity_g * portions / 100 * 100) / 100;
      const { error } = await this.foodLog.createLog({
        profileId,
        householdId,
        logDate: date,
        mealType,
        foodId: item.food_id,
        quantityG: item.quantity_g * portions,
        calories,
        proteinG,
        carbsG,
        fatG,
        fromSavedMealId: savedMealId,
      });
      if (!error) count++;
    }
    return { data: count, error: null };
  }

  /**
   * Obtiene la comida guardada con ítems y datos de alimentos (para escalar macros).
   */
  private async getSavedMealWithFoods(
    id: string
  ): Promise<{ data: SavedMeal | null; error: Error | null }> {
    const { data: meal, error } = await this.supabase.client
      .from('saved_meals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return { data: null, error: error as unknown as Error };
    if (!meal) return { data: null, error: null };

    const { data: itemRows } = await this.supabase.client
      .from('saved_meal_items')
      .select('*, food:foods(id, name, brand, calories_100, protein_100, carbs_100, fat_100)')
      .eq('saved_meal_id', id)
      .order('sort_order');
    const items = (itemRows ?? []).map((r) => this.mapItemRow(r as Record<string, unknown>));
    const result: SavedMeal = this.mapMealRow(meal as Record<string, unknown>);
    result.items = items;
    return { data: result, error: null };
  }

  private async getItems(savedMealId: string): Promise<SavedMealItem[]> {
    const { data } = await this.supabase.client
      .from('saved_meal_items')
      .select('*, food:foods(id, name, brand)')
      .eq('saved_meal_id', savedMealId)
      .order('sort_order');
    return (data ?? []).map((r) => this.mapItemRow(r as Record<string, unknown>));
  }

  private mapMealRow(row: Record<string, unknown>): SavedMeal {
    return {
      id: row['id'] as string,
      profile_id: row['profile_id'] as string,
      household_id: row['household_id'] as string,
      name: row['name'] as string,
      total_calories: Number(row['total_calories']),
      total_protein_g: Number(row['total_protein_g']),
      total_carbs_g: Number(row['total_carbs_g']),
      total_fat_g: Number(row['total_fat_g']),
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
    };
  }

  private mapItemRow(row: Record<string, unknown>): SavedMealItem {
    const food = row['food'] as Record<string, unknown> | undefined;
    return {
      id: row['id'] as string,
      saved_meal_id: row['saved_meal_id'] as string,
      food_id: row['food_id'] as string,
      quantity_g: Number(row['quantity_g']),
      sort_order: Number(row['sort_order'] ?? 0),
      ...(food && {
        food: {
          id: food['id'] as string,
          name: food['name'] as string,
          brand: (food['brand'] as string) ?? undefined,
          calories_100: Number(food['calories_100'] ?? 0),
          protein_100: Number(food['protein_100'] ?? 0),
          carbs_100: Number(food['carbs_100'] ?? 0),
          fat_100: Number(food['fat_100'] ?? 0),
        },
      }),
    };
  }
}
