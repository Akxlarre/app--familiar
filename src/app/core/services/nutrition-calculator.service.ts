// =============================================================================
// FamilyApp — Nutrition calculator (pure logic, no Supabase)
// =============================================================================

import { Injectable } from '@angular/core';
import type { ActivityLevel, BiologicalSex, NutritionGoal } from '@core/models/nutrition.model';
import type { BMICategory } from '@core/models/nutrition.model';
import {
  ACTIVITY_LEVEL_FACTORS,
  GOAL_CALORIE_ADJUSTMENTS,
  HEALTHY_BMI_MIN,
  HEALTHY_BMI_MAX,
  BMI_CATEGORIES,
  PROTEIN_PER_KG,
  RECALIBRATION_DAYS_MIN,
  RECALIBRATION_DAYS_MAX,
} from '@core/constants/nutrition.constants';

export interface MacroTargets {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface HealthyWeightRange {
  minKg: number;
  maxKg: number;
}

@Injectable({
  providedIn: 'root',
})
export class NutritionCalculatorService {
  /**
   * IMC = peso (kg) / (estatura en m)²
   */
  calculateBMI(weightKg: number, heightCm: number): number {
    if (heightCm <= 0) return 0;
    const heightM = heightCm / 100;
    return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  }

  /**
   * Edad en años desde birthdate (YYYY-MM-DD).
   */
  calculateAge(birthdate: string): number {
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return Math.max(0, age);
  }

  /**
   * TMB con fórmula Mifflin-St Jeor (más precisa que Harris-Benedict).
   * Hombre: 10×peso + 6.25×altura - 5×edad + 5
   * Mujer: 10×peso + 6.25×altura - 5×edad - 161
   */
  calculateBMR(
    sex: BiologicalSex,
    weightKg: number,
    heightCm: number,
    age: number
  ): number {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return Math.round(sex === 'male' ? base + 5 : base - 161);
  }

  /**
   * TDEE = TMB × factor de actividad.
   */
  calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
    const factor = ACTIVITY_LEVEL_FACTORS[activityLevel] ?? 1.2;
    return Math.round(bmr * factor);
  }

  /**
   * Meta calórica diaria: TDEE + ajuste por objetivo.
   * Déficit: TDEE - 300 a -500 kcal (nunca devolver TDEE como meta).
   * Mantenimiento: TDEE. Superávit: TDEE + 200 a +300 kcal.
   */
  calculateCalorieTarget(tdee: number, goal: NutritionGoal): number {
    const adjustment = GOAL_CALORIE_ADJUSTMENTS[goal];
    const target =
      goal === 'deficit'
        ? tdee + (adjustment ?? -500)
        : goal === 'surplus'
          ? tdee + (adjustment ?? 250)
          : tdee + (adjustment ?? 0);
    return Math.max(800, Math.round(target));
  }

  /**
   * Proteína objetivo en g/día según peso y objetivo.
   * Déficit: 1.8–2.2 g/kg (retención muscular). Mantenimiento: 1.2–1.6. Superávit: 1.6–2.2.
   */
  calculateProteinTarget(weightKg: number, goal: NutritionGoal): number {
    const range = PROTEIN_PER_KG[goal] ?? { min: 1.2, max: 1.6 };
    const perKg = (range.min + range.max) / 2;
    return Math.round(weightKg * perKg);
  }

  /**
   * Metas de macros en gramos. La suma de calorías (proteína×4 + grasa×9 + carbs×4)
   * coincide con la meta calórica (salvo redondeo).
   * - Proteína: fija por peso y objetivo (prioridad 1).
   * - Grasa: % sobre el total calórico (salud hormonal) (prioridad 2).
   * - Carbohidratos: rellenan el resto hasta alcanzar la meta (prioridad 3).
   * Calorías por gramo: proteína 4, carbs 4, grasa 9.
   */
  calculateMacroTargets(
    calorieTarget: number,
    weightKg: number,
    goal: NutritionGoal,
    macroPercentages: { proteinPct?: number; carbsPct?: number; fatPct?: number }
  ): MacroTargets {
    const proteinG = this.calculateProteinTarget(weightKg, goal);
    const proteinCal = proteinG * 4;

    const fatPct = (macroPercentages.fatPct ?? 30) / 100;
    const fatCal = calorieTarget * fatPct;
    const fatG = fatCal / 9;

    const carbsCal = calorieTarget - proteinCal - fatCal;
    const carbsG = Math.max(0, carbsCal / 4);

    return {
      proteinG: Math.round(proteinG),
      fatG: Math.round(fatG),
      carbsG: Math.round(carbsG),
    };
  }

  /**
   * Categoría IMC según OMS.
   */
  getBMICategory(bmi: number): BMICategory {
    const found = BMI_CATEGORIES.find((c) => bmi >= c.min && bmi <= c.max);
    return found?.category ?? 'normal';
  }

  /**
   * Rango de peso saludable (IMC 18.5–24.9) aplicado a la estatura.
   */
  getHealthyWeightRange(heightCm: number): HealthyWeightRange {
    if (heightCm <= 0) return { minKg: 0, maxKg: 0 };
    const heightM = heightCm / 100;
    const minKg = Math.round(HEALTHY_BMI_MIN * heightM * heightM * 10) / 10;
    const maxKg = Math.round(HEALTHY_BMI_MAX * heightM * heightM * 10) / 10;
    return { minKg, maxKg };
  }

  /**
   * Indica si conviene recalibrar objetivos (han pasado 2–3 semanas desde lastRecalibration).
   */
  shouldRecalibrate(lastRecalibration: string | null): boolean {
    if (!lastRecalibration) return true;
    const last = new Date(lastRecalibration);
    const today = new Date();
    const days = (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    return days >= RECALIBRATION_DAYS_MIN && days <= RECALIBRATION_DAYS_MAX * 1.5;
  }

  /**
   * Calorías y macros para una cantidad dada de un alimento (por 100g).
   */
  scaleNutrients(
    per100: { calories: number; protein: number; carbs: number; fat: number },
    quantityG: number
  ): { calories: number; proteinG: number; carbsG: number; fatG: number } {
    const factor = quantityG / 100;
    return {
      calories: Math.round(per100.calories * factor),
      proteinG: Math.round(per100.protein * factor * 100) / 100,
      carbsG: Math.round(per100.carbs * factor * 100) / 100,
      fatG: Math.round(per100.fat * factor * 100) / 100,
    };
  }
}
