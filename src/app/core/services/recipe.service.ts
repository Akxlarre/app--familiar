// =============================================================================
// FamilyApp — Recipe Service
// Gestiona el recetario del hogar: CRUD de recetas e ingredientes.
// =============================================================================

import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type {
    Recipe,
    RecipeIngredient,
    CreateRecipeInput,
    UpdateRecipeInput,
    UpsertRecipeIngredientInput,
    RecipeMealType,
} from '@core/models/meals.model';

@Injectable({ providedIn: 'root' })
export class RecipeService {
    private readonly supabase = inject(SupabaseService);

    // --------------------------------------------------------------------------
    // Recetas
    // --------------------------------------------------------------------------

    /** Todas las recetas del hogar, con filtros opcionales. */
    async getRecipes(
        householdId: string,
        opts: {
            mealType?: RecipeMealType;
            maxPrepTime?: number;
            tags?: string[];
            limit?: number;
        } = {}
    ): Promise<{ data: Recipe[]; error: Error | null }> {
        let q = this.supabase.client
            .from('recipes')
            .select('*')
            .eq('household_id', householdId)
            .order('name', { ascending: true });

        if (opts.mealType && opts.mealType !== 'any') {
            q = q.in('meal_type', [opts.mealType, 'any']);
        }
        if (opts.maxPrepTime) {
            q = q.or(`prep_time_min.is.null,prep_time_min.lte.${opts.maxPrepTime}`);
        }
        if (opts.tags?.length) {
            // Filtra recetas que contengan al menos uno de los tags solicitados
            q = q.contains('tags', opts.tags);
        }
        if (opts.limit) {
            q = q.limit(opts.limit);
        }

        const { data, error } = await q;
        return {
            data: data ? data.map((r) => this.mapRecipe(r)) : [],
            error: error ? (error as unknown as Error) : null,
        };
    }

    /** Receta única con sus ingredientes. */
    async getRecipe(id: string): Promise<{ data: Recipe | null; error: Error | null }> {
        const { data, error } = await this.supabase.client
            .from('recipes')
            .select('*, recipe_ingredients(*)')
            .eq('id', id)
            .single();

        if (error) return { data: null, error: error as unknown as Error };
        const recipe = this.mapRecipe(data);
        recipe.ingredients = (data['recipe_ingredients'] as unknown[]).map((i) =>
            this.mapIngredient(i as Record<string, unknown>)
        );
        return { data: recipe, error: null };
    }

    /** Crea una receta vacía (los ingredientes se añaden luego). */
    async createRecipe(input: CreateRecipeInput): Promise<{ data?: Recipe; error: Error | null }> {
        const { data, error } = await this.supabase.client
            .from('recipes')
            .insert({
                household_id: input.householdId,
                name: input.name,
                servings: input.servings ?? 2,
                meal_type: input.mealType ?? 'any',
                difficulty: input.difficulty ?? 'medium',
                prep_time_min: input.prepTimeMin ?? null,
                tags: input.tags ?? [],
                instructions: input.instructions ?? null,
                image_path: input.imagePath ?? null,
                source_url: input.sourceUrl ?? null,
                created_by: input.createdBy ?? null,
            })
            .select()
            .single();

        if (error) return { error: error as unknown as Error };
        return { data: this.mapRecipe(data), error: null };
    }

    async updateRecipe(
        id: string,
        input: UpdateRecipeInput
    ): Promise<{ data?: Recipe; error: Error | null }> {
        const patch: Record<string, unknown> = {};
        if (input.name !== undefined) patch['name'] = input.name;
        if (input.servings !== undefined) patch['servings'] = input.servings;
        if (input.mealType !== undefined) patch['meal_type'] = input.mealType;
        if (input.difficulty !== undefined) patch['difficulty'] = input.difficulty;
        if (input.prepTimeMin !== undefined) patch['prep_time_min'] = input.prepTimeMin;
        if (input.tags !== undefined) patch['tags'] = input.tags;
        if (input.instructions !== undefined) patch['instructions'] = input.instructions;
        if (input.imagePath !== undefined) patch['image_path'] = input.imagePath;
        if (input.sourceUrl !== undefined) patch['source_url'] = input.sourceUrl;
        if (input.calories !== undefined) patch['calories'] = input.calories;
        if (input.protein !== undefined) patch['protein'] = input.protein;
        if (input.carbs !== undefined) patch['carbs'] = input.carbs;
        if (input.fat !== undefined) patch['fat'] = input.fat;
        patch['updated_at'] = new Date().toISOString();

        const { data, error } = await this.supabase.client
            .from('recipes')
            .update(patch)
            .eq('id', id)
            .select()
            .single();

        if (error) return { error: error as unknown as Error };
        return { data: this.mapRecipe(data), error: null };
    }

    async deleteRecipe(id: string): Promise<{ error: Error | null }> {
        const { error } = await this.supabase.client.from('recipes').delete().eq('id', id);
        return { error: error ? (error as unknown as Error) : null };
    }

    // --------------------------------------------------------------------------
    // Ingredientes
    // --------------------------------------------------------------------------

    async getIngredients(recipeId: string): Promise<{ data: RecipeIngredient[]; error: Error | null }> {
        const { data, error } = await this.supabase.client
            .from('recipe_ingredients')
            .select('*, foods(id, name, calories_100, protein_100, carbs_100, fat_100, serving_size_g)')
            .eq('recipe_id', recipeId)
            .order('sort_order', { ascending: true });

        return {
            data: data ? data.map((i) => this.mapIngredient(i as Record<string, unknown>)) : [],
            error: error ? (error as unknown as Error) : null,
        };
    }

    /** Reemplaza todos los ingredientes de una receta (elimina y re-inserta). */
    async setIngredients(
        recipeId: string,
        ingredients: UpsertRecipeIngredientInput[]
    ): Promise<{ error: Error | null }> {
        // Borrar los existentes
        const { error: delError } = await this.supabase.client
            .from('recipe_ingredients')
            .delete()
            .eq('recipe_id', recipeId);
        if (delError) return { error: delError as unknown as Error };

        if (ingredients.length === 0) return { error: null };

        const rows = ingredients.map((item, idx) => ({
            recipe_id: recipeId,
            food_id: item.foodId ?? null,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            sort_order: item.sortOrder ?? idx,
        }));

        const { error: insError } = await this.supabase.client
            .from('recipe_ingredients')
            .insert(rows);
        return { error: insError ? (insError as unknown as Error) : null };
    }

    // --------------------------------------------------------------------------
    // Mappers
    // --------------------------------------------------------------------------

    private mapRecipe(row: Record<string, unknown>): Recipe {
        return {
            id: row['id'] as string,
            household_id: row['household_id'] as string,
            name: row['name'] as string,
            instructions: (row['instructions'] as string) ?? null,
            image_path: (row['image_path'] as string) ?? null,
            calories: row['calories'] != null ? Number(row['calories']) : null,
            protein: row['protein'] != null ? Number(row['protein']) : null,
            carbs: row['carbs'] != null ? Number(row['carbs']) : null,
            fat: row['fat'] != null ? Number(row['fat']) : null,
            servings: Number(row['servings'] ?? 2),
            created_by: (row['created_by'] as string) ?? null,
            prep_time_min: row['prep_time_min'] != null ? Number(row['prep_time_min']) : null,
            meal_type: (row['meal_type'] as Recipe['meal_type']) ?? 'any',
            difficulty: (row['difficulty'] as Recipe['difficulty']) ?? null,
            tags: (row['tags'] as string[]) ?? [],
            source_url: (row['source_url'] as string) ?? null,
            is_public: (row['is_public'] as boolean) ?? false,
            created_at: row['created_at'] as string,
            updated_at: row['updated_at'] as string,
        };
    }

    private mapIngredient(row: Record<string, unknown>): RecipeIngredient {
        return {
            id: row['id'] as string,
            recipe_id: row['recipe_id'] as string,
            food_id: (row['food_id'] as string) ?? null,
            name: row['name'] as string,
            quantity: Number(row['quantity']),
            unit: row['unit'] as string,
            sort_order: Number(row['sort_order'] ?? 0),
        };
    }
}
