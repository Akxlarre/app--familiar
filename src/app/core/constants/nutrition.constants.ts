// =============================================================================
// FamilyApp — Nutrition module constants
// =============================================================================

import type { ActivityLevel, MealType, NutritionGoal, BMICategory } from '@core/models/nutrition.model';

/** Factores de actividad para TDEE (Mifflin-St Jeor × factor). */
export const ACTIVITY_LEVEL_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Ajuste calórico medio por objetivo (kcal/día). Déficit -500, superávit +200 a +300. */
export const GOAL_CALORIE_ADJUSTMENTS: Record<NutritionGoal, number> = {
  deficit: -500,
  maintenance: 0,
  surplus: 250,
};

/** Rango de ajuste por objetivo para mostrar al usuario. */
export const GOAL_CALORIE_RANGES: Record<NutritionGoal, { min: number; max: number }> = {
  deficit: { min: -500, max: -300 },
  maintenance: { min: 0, max: 0 },
  surplus: { min: 200, max: 300 },
};

/** Etiquetas para tipo de comida. */
export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snacks',
  extra: 'Extra',
};

/** Etiquetas para nivel de actividad. */
export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario (poco o ningún ejercicio)',
  light: 'Ligero (1-3 días/semana)',
  moderate: 'Moderado (3-5 días/semana)',
  active: 'Activo (6-7 días/semana)',
  very_active: 'Muy activo (atleta, trabajo físico)',
};

/** Etiquetas para objetivo nutricional. */
export const NUTRITION_GOAL_LABELS: Record<NutritionGoal, string> = {
  deficit: 'Déficit (perder peso)',
  maintenance: 'Mantenimiento',
  surplus: 'Superávit (ganar músculo)',
};

/** Límites IMC para categorías (OMS). */
export const BMI_CATEGORIES: { category: BMICategory; min: number; max: number; label: string }[] = [
  { category: 'underweight', min: 0, max: 18.49, label: 'Bajo peso' },
  { category: 'normal', min: 18.5, max: 24.99, label: 'Normal' },
  { category: 'overweight', min: 25, max: 29.99, label: 'Sobrepeso' },
  { category: 'obese', min: 30, max: 999, label: 'Obesidad' },
];

/** IMC mínimo y máximo para rango de peso saludable. */
export const HEALTHY_BMI_MIN = 18.5;
export const HEALTHY_BMI_MAX = 24.9;

/** Proteína por kg según objetivo (g/kg). En déficit, mínimo 1.8 para retención muscular (literatura hipertrofia). */
export const PROTEIN_PER_KG: Record<NutritionGoal, { min: number; max: number }> = {
  deficit: { min: 1.8, max: 2.2 },
  maintenance: { min: 1.2, max: 1.6 },
  surplus: { min: 1.6, max: 2.2 },
};

/** Días mínimos entre recálculos automáticos de TDEE. */
export const RECALIBRATION_DAYS_MIN = 14;
export const RECALIBRATION_DAYS_MAX = 21;

/** Margen de calorías para considerar "objetivo cumplido" (± kcal). */
export const GOAL_MET_CALORIE_MARGIN = 100;

export function getMealTypeLabel(mealType: MealType): string {
  return MEAL_TYPE_LABELS[mealType] ?? mealType;
}

export function getActivityLevelLabel(level: ActivityLevel): string {
  return ACTIVITY_LEVEL_LABELS[level] ?? level;
}

export function getNutritionGoalLabel(goal: NutritionGoal): string {
  return NUTRITION_GOAL_LABELS[goal] ?? goal;
}

export function getBMICategoryLabel(category: BMICategory): string {
  return BMI_CATEGORIES.find((c) => c.category === category)?.label ?? category;
}
