// =============================================================================
// FamilyApp — Food database (hybrid: own DB + Open Food Facts fallback)
// =============================================================================

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { Food, CreateFoodInput, OpenFoodFactsProduct } from '@core/models/nutrition.model';

const OPEN_FOOD_FACTS_SEARCH = 'https://world.openfoodfacts.org/api/v2/search';
const OPEN_FOOD_FACTS_PRODUCT = 'https://world.openfoodfacts.org/api/v2/product';

@Injectable({
  providedIn: 'root',
})
export class FoodDatabaseService {
  private supabase = inject(SupabaseService);

  /**
   * Búsqueda en base propia por nombre (ilike). Incluye alimentos globales (household_id null) y del hogar.
   */
  async searchFoods(
    query: string,
    householdId: string,
    limit = 20
  ): Promise<{ data: Food[]; error: Error | null }> {
    const q = query.trim();
    if (!q) return { data: [], error: null };

    const { data, error } = await this.supabase.client
      .from('foods')
      .select('*')
      .or(`household_id.is.null,household_id.eq.${householdId}`)
      .ilike('name', `%${q}%`)
      .limit(limit)
      .order('name');
    if (error) return { data: [], error: error as unknown as Error };
    return { data: (data ?? []).map((r) => this.mapFoodRow(r)), error: null };
  }

  /**
   * Obtiene un alimento por código de barras (base propia).
   */
  async getFoodByBarcode(
    barcode: string,
    householdId: string
  ): Promise<{ data: Food | null; error: Error | null }> {
    const code = String(barcode).trim();
    if (!code) return { data: null, error: null };

    const { data, error } = await this.supabase.client
      .from('foods')
      .select('*')
      .eq('barcode', code)
      .or(`household_id.is.null,household_id.eq.${householdId}`)
      .maybeSingle();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapFoodRow(data) : null, error: null };
  }

  /**
   * Busca en Open Food Facts por texto (search) o por código de barras (product).
   * Retorna productos en formato normalizado para importar.
   */
  async searchOpenFoodFacts(
    queryOrBarcode: string
  ): Promise<{ data: OpenFoodFactsProduct[]; error: Error | null }> {
    const q = String(queryOrBarcode).trim();
    if (!q) return { data: [], error: null };

    const looksLikeBarcode = /^\d+$/.test(q);
    if (looksLikeBarcode) {
      const res = await this.fetchProductByBarcode(q);
      if (res.error) return { data: [], error: res.error };
      return { data: res.data ? [res.data] : [], error: null };
    }

    try {
      const url = `${OPEN_FOOD_FACTS_SEARCH}?q=${encodeURIComponent(q)}&page_size=20`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`OFF search failed: ${response.status}`);
      const json = (await response.json()) as { products?: unknown[] };
      const products = (json.products ?? []).filter(
        (p): p is OpenFoodFactsProduct =>
          p != null &&
          typeof p === 'object' &&
          'code' in p &&
          (typeof (p as OpenFoodFactsProduct).product_name === 'string' ||
            typeof (p as OpenFoodFactsProduct).product_name === 'undefined')
      );
      return { data: products.slice(0, 20), error: null };
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err : new Error('Open Food Facts search failed'),
      };
    }
  }

  /**
   * Obtiene un producto de Open Food Facts por código de barras.
   */
  async fetchProductByBarcode(
    barcode: string
  ): Promise<{ data: OpenFoodFactsProduct | null; error: Error | null }> {
    try {
      const url = `${OPEN_FOOD_FACTS_PRODUCT}/${barcode}.json`;
      const response = await fetch(url);
      if (!response.ok) return { data: null, error: null };
      const json = (await response.json()) as { product?: OpenFoodFactsProduct };
      const product = json.product;
      if (!product?.code) return { data: null, error: null };
      return { data: product, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Open Food Facts fetch failed'),
      };
    }
  }

  /**
   * Convierte un producto OFF a CreateFoodInput y lo guarda en la base propia.
   * energy_100g en OFF viene en kJ -> kcal = kJ / 4.184.
   */
  async importFromOpenFoodFacts(
    offProduct: OpenFoodFactsProduct,
    householdId: string | null,
    createdBy: string | null
  ): Promise<{ data?: Food; error: Error | null }> {
    const nut = offProduct.nutriments ?? {};
    const energyKj = nut.energy_100g;
    const calories100 =
      typeof energyKj === 'number' ? Math.round(energyKj / 4.184) : 0;
    const input: CreateFoodInput = {
      householdId,
      name: offProduct.product_name ?? 'Sin nombre',
      brand: offProduct.brands?.trim() || null,
      barcode: offProduct.code || null,
      calories100: calories100 || 0,
      protein100: typeof nut.proteins_100g === 'number' ? nut.proteins_100g : 0,
      carbs100:
        typeof nut.carbohydrates_100g === 'number' ? nut.carbohydrates_100g : 0,
      fat100: typeof nut.fat_100g === 'number' ? nut.fat_100g : 0,
      fiber100:
        typeof nut.fiber_100g === 'number' ? nut.fiber_100g : null,
      sugar100:
        typeof nut.sugars_100g === 'number' ? nut.sugars_100g : null,
      sodium100:
        typeof nut.sodium_100g === 'number' ? nut.sodium_100g : null,
      saturatedFat100:
        typeof (nut as Record<string, unknown>)['saturated-fat_100g'] === 'number'
          ? (nut as Record<string, number>)['saturated-fat_100g']
          : null,
      source: 'openfoodfacts',
      createdBy,
    };
    return this.createFood(input);
  }

  /**
   * Crea un alimento en la base (ingreso manual o importado).
   */
  async createFood(input: CreateFoodInput): Promise<{
    data?: Food;
    error: Error | null;
  }> {
    const { data, error } = await this.supabase.client
      .from('foods')
      .insert({
        household_id: input.householdId ?? null,
        name: input.name.trim(),
        brand: input.brand?.trim() ?? null,
        barcode: input.barcode?.trim() ?? null,
        calories_100: input.calories100,
        protein_100: input.protein100,
        carbs_100: input.carbs100,
        fat_100: input.fat100,
        fiber_100: input.fiber100 ?? null,
        sugar_100: input.sugar100 ?? null,
        sodium_100: input.sodium100 ?? null,
        saturated_fat_100: input.saturatedFat100 ?? null,
        serving_size_g: input.servingSizeG ?? 100,
        source: input.source ?? 'manual',
        created_by: input.createdBy ?? null,
      })
      .select()
      .single();
    if (error) return { error: error as unknown as Error };
    return { data: this.mapFoodRow(data), error: null };
  }

  /**
   * Incrementa report_count para marcar datos incorrectos.
   */
  async reportFood(foodId: string): Promise<{ error: Error | null }> {
    const { data: row } = await this.supabase.client
      .from('foods')
      .select('report_count')
      .eq('id', foodId)
      .single();
    const next = (Number(row?.report_count) || 0) + 1;
    const { error } = await this.supabase.client
      .from('foods')
      .update({ report_count: next, updated_at: new Date().toISOString() })
      .eq('id', foodId);
    return { error: error ? (error as unknown as Error) : null };
  }

  /**
   * Alimentos usados recientemente por el usuario (desde food_logs).
   */
  async getRecentFoods(
    profileId: string,
    limit = 10
  ): Promise<{ data: Food[]; error: Error | null }> {
    const { data: logs, error: logsError } = await this.supabase.client
      .from('food_logs')
      .select('food_id')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(limit * 3);
    if (logsError) return { data: [], error: logsError as unknown as Error };
    const foodIds = [...new Set((logs ?? []).map((l) => l.food_id))].slice(0, limit);
    if (foodIds.length === 0) return { data: [], error: null };

    const { data: foods, error } = await this.supabase.client
      .from('foods')
      .select('*')
      .in('id', foodIds);
    if (error) return { data: [], error: error as unknown as Error };
    const byId = new Map((foods ?? []).map((f) => [f.id, this.mapFoodRow(f)]));
    const ordered = foodIds.map((id) => byId.get(id)).filter(Boolean) as Food[];
    return { data: ordered, error: null };
  }

  /**
   * Alimentos más usados en los últimos 7 días (frecuentes).
   */
  async getFrequentFoods(
    profileId: string,
    limit = 10
  ): Promise<{ data: Food[]; error: Error | null }> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const from = fromDate.toISOString().slice(0, 10);

    const { data: logs, error: logsError } = await this.supabase.client
      .from('food_logs')
      .select('food_id')
      .eq('profile_id', profileId)
      .gte('log_date', from);
    if (logsError) return { data: [], error: logsError as unknown as Error };

    const countByFood = new Map<string, number>();
    for (const row of logs ?? []) {
      const id = row.food_id as string;
      countByFood.set(id, (countByFood.get(id) ?? 0) + 1);
    }
    const sorted = [...countByFood.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
    if (sorted.length === 0) return { data: [], error: null };

    const { data: foods, error } = await this.supabase.client
      .from('foods')
      .select('*')
      .in('id', sorted);
    if (error) return { data: [], error: error as unknown as Error };
    const byId = new Map((foods ?? []).map((f) => [f.id, this.mapFoodRow(f)]));
    const ordered = sorted.map((id) => byId.get(id)).filter(Boolean) as Food[];
    return { data: ordered, error: null };
  }

  async getFood(id: string): Promise<{ data: Food | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('foods')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return { data: null, error: error as unknown as Error };
    return { data: data ? this.mapFoodRow(data) : null, error: null };
  }

  private mapFoodRow(row: Record<string, unknown>): Food {
    return {
      id: row['id'] as string,
      household_id: (row['household_id'] as string) ?? null,
      name: row['name'] as string,
      brand: (row['brand'] as string) ?? null,
      barcode: (row['barcode'] as string) ?? null,
      calories_100: Number(row['calories_100']),
      protein_100: Number(row['protein_100']),
      carbs_100: Number(row['carbs_100']),
      fat_100: Number(row['fat_100']),
      fiber_100: row['fiber_100'] != null ? Number(row['fiber_100']) : null,
      sugar_100: row['sugar_100'] != null ? Number(row['sugar_100']) : null,
      sodium_100: row['sodium_100'] != null ? Number(row['sodium_100']) : null,
      saturated_fat_100:
        row['saturated_fat_100'] != null ? Number(row['saturated_fat_100']) : null,
      serving_size_g: Number(row['serving_size_g'] ?? 100),
      source: (row['source'] as Food['source']) ?? 'manual',
      verified: Boolean(row['verified']),
      report_count: Number(row['report_count'] ?? 0),
      created_by: (row['created_by'] as string) ?? null,
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
    };
  }
}
