// =============================================================================
// FamilyApp — Nutrition module models
// =============================================================================

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'extra';

export type NutritionGoal = 'deficit' | 'maintenance' | 'surplus';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type FoodSource = 'manual' | 'openfoodfacts' | 'verified';

export type BiologicalSex = 'male' | 'female';

export type BMICategory = 'underweight' | 'normal' | 'overweight' | 'obese';

// -----------------------------------------------------------------------------
// Core entities
// -----------------------------------------------------------------------------

export interface Food {
  id: string;
  household_id: string | null;
  name: string;
  brand: string | null;
  barcode: string | null;
  calories_100: number;
  protein_100: number;
  carbs_100: number;
  fat_100: number;
  fiber_100: number | null;
  sugar_100: number | null;
  sodium_100: number | null;
  saturated_fat_100: number | null;
  serving_size_g: number;
  source: FoodSource;
  verified: boolean;
  report_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodAlias {
  id: string;
  food_id: string;
  alias: string;
  created_at: string;
}

export interface NutritionProfile {
  id: string;
  profile_id: string;
  household_id: string;
  sex: BiologicalSex;
  birthdate: string;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  goal: NutritionGoal;
  calories_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
  macro_protein_pct: number;
  macro_carbs_pct: number;
  macro_fat_pct: number;
  is_manual_override: boolean;
  last_recalibration: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodLog {
  id: string;
  profile_id: string;
  household_id: string;
  log_date: string;
  meal_type: MealType;
  food_id: string;
  quantity_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  from_saved_meal_id: string | null;
  from_inventory: boolean;
  pantry_item_id: string | null;
  created_at: string;
  food?: Pick<Food, 'id' | 'name' | 'brand'>;
}

export interface SavedMealItem {
  id: string;
  saved_meal_id: string;
  food_id: string;
  quantity_g: number;
  sort_order: number;
  food?: Pick<Food, 'id' | 'name' | 'brand' | 'calories_100' | 'protein_100' | 'carbs_100' | 'fat_100'>;
}

export interface SavedMeal {
  id: string;
  profile_id: string;
  household_id: string;
  name: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  created_at: string;
  updated_at: string;
  items?: SavedMealItem[];
}

export interface DailyNutritionSummary {
  id: string;
  profile_id: string;
  summary_date: string;
  calories_total: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories_target: number;
  goal_met: boolean;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Input / filter types
// -----------------------------------------------------------------------------

export interface CreateNutritionProfileInput {
  profileId: string;
  householdId: string;
  sex: BiologicalSex;
  birthdate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
  macroProteinPct?: number;
  macroCarbsPct?: number;
  macroFatPct?: number;
  isManualOverride?: boolean;
}

export interface UpdateNutritionProfileInput {
  sex?: BiologicalSex;
  birthdate?: string;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: ActivityLevel;
  goal?: NutritionGoal;
  caloriesTarget?: number;
  proteinTargetG?: number;
  carbsTargetG?: number;
  fatTargetG?: number;
  macroProteinPct?: number;
  macroCarbsPct?: number;
  macroFatPct?: number;
  isManualOverride?: boolean;
  lastRecalibration?: string | null;
}

export interface CreateFoodInput {
  householdId: string | null;
  name: string;
  brand?: string | null;
  barcode?: string | null;
  calories100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100?: number | null;
  sugar100?: number | null;
  sodium100?: number | null;
  saturatedFat100?: number | null;
  servingSizeG?: number;
  source?: FoodSource;
  createdBy?: string | null;
}

export interface CreateFoodLogInput {
  profileId: string;
  householdId: string;
  logDate: string;
  mealType: MealType;
  foodId: string;
  quantityG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fromSavedMealId?: string | null;
  fromInventory?: boolean;
  pantryItemId?: string | null;
}

export interface UpdateFoodLogInput {
  logDate?: string;
  mealType?: MealType;
  quantityG?: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

export interface SavedMealItemInput {
  foodId: string;
  quantityG: number;
  sortOrder?: number;
}

export interface CreateSavedMealInput {
  profileId: string;
  householdId: string;
  name: string;
  items: SavedMealItemInput[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
}

export interface UpdateSavedMealInput {
  name?: string;
  items?: SavedMealItemInput[];
  totalCalories?: number;
  totalProteinG?: number;
  totalCarbsG?: number;
  totalFatG?: number;
}

// -----------------------------------------------------------------------------
// API / external types (Open Food Facts)
// -----------------------------------------------------------------------------

export interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  brands?: string;
  nutriments?: {
    energy_100g?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    sodium_100g?: number;
    'saturated-fat_100g'?: number;
  };
  serving_quantity?: number;
  serving_size?: string;
}
