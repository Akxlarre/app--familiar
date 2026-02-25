// =============================================================================
// FamilyApp — Meals Planning Module models
// Migración: 20260225100000_meals_module_v1.sql
// =============================================================================

import type { MealType } from './nutrition.model';

// --------------------------------------------------------------------------
// Enums / tipos base
// --------------------------------------------------------------------------

export type RecipeMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'any';
export type RecipeDifficulty = 'easy' | 'medium' | 'hard';
export type MealPlanStatus = 'draft' | 'active' | 'archived';
export type SlotType = 'recipe' | 'free' | 'out' | 'leftovers';

// --------------------------------------------------------------------------
// Recipe (recetario del hogar)
// --------------------------------------------------------------------------

export interface Recipe {
    id: string;
    household_id: string;
    name: string;
    instructions: string | null;
    image_path: string | null;
    /** Macros precalculados (se actualizan cuando se editan ingredientes) */
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    servings: number;
    // Campos añadidos en módulo Comidas v1
    created_by: string | null;
    prep_time_min: number | null;
    meal_type: RecipeMealType;
    difficulty: RecipeDifficulty | null;
    tags: string[];
    source_url: string | null;
    is_public: boolean;
    created_at: string;
    updated_at: string;
    // Joins opcionales
    ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
    id: string;
    recipe_id: string;
    /** food_id enlaza con catálogo de alimentos (para calcular macros auto) */
    food_id: string | null;
    name: string;
    quantity: number;
    unit: string;
    sort_order: number;
}

// --------------------------------------------------------------------------
// MealPlan (cabecera del plan semanal)
// --------------------------------------------------------------------------

export interface MealPlan {
    id: string;
    household_id: string;
    week_start_date: string | null; // ISO date, lunes de la semana
    status: MealPlanStatus;
    created_by: string | null;
    created_at: string;
    // Joins opcionales
    slots?: MealPlanSlot[];
}

// --------------------------------------------------------------------------
// MealPlanSlot (celda de la grilla semanal)
// --------------------------------------------------------------------------

export interface MealPlanSlot {
    id: string;
    plan_id: string;
    /** 1 = Lunes … 7 = Domingo */
    day_of_week: number;
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    slot_type: SlotType;
    recipe_id: string | null;
    /** null = toda la familia; UUID = slot personal de un miembro */
    profile_id: string | null;
    notes: string | null;
    is_done: boolean;
    created_at: string;
    updated_at: string;
    // Joins opcionales
    recipe?: Pick<Recipe, 'id' | 'name' | 'calories' | 'protein' | 'carbs' | 'fat' | 'prep_time_min' | 'meal_type'>;
}

// --------------------------------------------------------------------------
// Inputs para servicios
// --------------------------------------------------------------------------

export interface CreateRecipeInput {
    householdId: string;
    name: string;
    servings?: number;
    mealType?: RecipeMealType;
    difficulty?: RecipeDifficulty;
    prepTimeMin?: number;
    tags?: string[];
    instructions?: string;
    imagePath?: string;
    sourceUrl?: string;
    createdBy?: string | null;
}

export interface UpdateRecipeInput {
    name?: string;
    servings?: number;
    mealType?: RecipeMealType;
    difficulty?: RecipeDifficulty;
    prepTimeMin?: number | null;
    tags?: string[];
    instructions?: string | null;
    imagePath?: string | null;
    sourceUrl?: string | null;
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
}

export interface UpsertRecipeIngredientInput {
    foodId?: string | null;
    name: string;
    quantity: number;
    unit: string;
    sortOrder?: number;
}

export interface CreateMealPlanInput {
    householdId: string;
    weekStartDate?: string;
    createdBy?: string;
}

export interface UpsertSlotInput {
    planId: string;
    dayOfWeek: number;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    slotType: SlotType;
    recipeId?: string | null;
    profileId?: string | null;
    notes?: string | null;
}

// --------------------------------------------------------------------------
// Helpers para la grilla semanal
// --------------------------------------------------------------------------

/** Mapa de la grilla: day (1-7) → meal_type → slot */
export type WeekGrid = Record<number, Record<string, MealPlanSlot | undefined>>;

/** Resumen nutricional proyectado del plan semanal para un perfil */
export interface WeeklyNutritionSummary {
    profileId: string;
    totalCalories: number;
    totalProteinG: number;
    totalCarbsG: number;
    totalFatG: number;
    daysPlanned: number;
    avgCaloriesPerDay: number;
    avgProteinPerDay: number;
}
