import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@core/services/auth.service';
import { NutritionProfileService } from '@core/services/nutrition-profile.service';
import { FoodLogService, LogsByMeal } from '@core/services/food-log.service';
import { NutritionCalculatorService } from '@core/services/nutrition-calculator.service';
import { KpiCardComponent, type KpiData } from '@shared/components/kpi-card/kpi-card.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { PageHeaderTrailingDirective } from '@shared/components/page-header/page-header.directive';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { NutricionDashboardSkeletonComponent } from './nutricion-dashboard-skeleton.component';
import { MEAL_TYPE_LABELS } from '@core/constants/nutrition.constants';
import type { DailyNutritionSummary } from '@core/models/nutrition.model';
import type { MealType } from '@core/models/nutrition.model';

@Component({
  selector: 'app-nutricion-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    KpiCardComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    NutricionDashboardSkeletonComponent,
    PageHeaderTrailingDirective,
  ],
  template: `
    <div class="flex flex-col gap-6">
      @if (loading()) {
        <app-nutricion-dashboard-skeleton />
      } @else if (!hasProfile()) {
        <app-page-header
          title="Nutrición"
          description="Configura tu perfil para ver tu resumen del día."
        />
        <app-empty-state
          message="Sin perfil nutricional"
          subtitle="Configura tu perfil con tus datos corporales y objetivos para ver calorías y macros."
          actionLabel="Configurar perfil"
          actionIcon="pi pi-user"
          (action)="goToPerfil()"
        />
      } @else {
        <app-page-header
          title="Nutrición"
          [description]="'Hoy: ' + todayLabel()"
        >
          <div appPageHeaderTrailing class="flex gap-2">
            <a pButton icon="pi pi-list" label="Registro del día" [routerLink]="['/app/nutricion/log']" severity="secondary" size="small"></a>
            <a pButton icon="pi pi-user" label="Mi perfil" [routerLink]="['/app/nutricion/perfil']" severity="secondary" size="small"></a>
          </div>
        </app-page-header>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <app-kpi-card [data]="kpiCalories()" size="1x1" />
          <app-kpi-card [data]="kpiProtein()" size="1x1" />
          <app-kpi-card [data]="kpiBmi()" size="1x1" />
        </div>

        <section class="rounded-xl border border-default bg-surface p-4" aria-labelledby="calories-head">
          <h2 id="calories-head" class="font-semibold text-primary mb-2">Resumen calórico</h2>
          <div class="flex justify-between text-sm text-secondary mb-1">
            <span>{{ summary()?.calories_total ?? 0 }} kcal</span>
            <span>Objetivo: {{ summary()?.calories_target ?? 0 }} kcal</span>
          </div>
          <div
            class="h-4 rounded-full overflow-hidden bg-subtle"
            role="progressbar"
            [attr.aria-valuenow]="caloriesProgress()"
            aria-valuemin="0"
            aria-valuemax="100"
            [attr.aria-label]="'Calorías ' + (summary()?.calories_total ?? 0) + ' de ' + (summary()?.calories_target ?? 0)"
          >
            <div
              class="h-full transition-all duration-300 rounded-full"
              [class]="caloriesBarClass()"
              [style.width.%]="caloriesBarWidth()"
            ></div>
          </div>
        </section>

        <section class="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Macros del día">
          <div class="rounded-xl border border-default bg-surface p-4">
            <p class="text-sm font-medium text-primary mb-1">Proteína</p>
            <p class="text-lg tabular-nums">{{ summary()?.protein_g ?? 0 }} / {{ profile()?.protein_target_g ?? 0 }} g</p>
            <div class="mt-2 h-2 rounded-full bg-subtle overflow-hidden">
              <div
                class="h-full bg-primary rounded-full transition-all duration-300"
                [style.width.%]="proteinProgress()"
              ></div>
            </div>
          </div>
          <div class="rounded-xl border border-default bg-surface p-4">
            <p class="text-sm font-medium text-primary mb-1">Carbohidratos</p>
            <p class="text-lg tabular-nums">{{ summary()?.carbs_g ?? 0 }} / {{ profile()?.carbs_target_g ?? 0 }} g</p>
            <div class="mt-2 h-2 rounded-full bg-subtle overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300"
                [class]="carbsBarClass()"
                [style.width.%]="carbsProgress()"
              ></div>
            </div>
          </div>
          <div class="rounded-xl border border-default bg-surface p-4">
            <p class="text-sm font-medium text-primary mb-1">Grasas</p>
            <p class="text-lg tabular-nums">{{ summary()?.fat_g ?? 0 }} / {{ profile()?.fat_target_g ?? 0 }} g</p>
            <div class="mt-2 h-2 rounded-full bg-subtle overflow-hidden">
              <div
                class="h-full bg-accent rounded-full transition-all duration-300"
                [style.width.%]="fatProgress()"
              ></div>
            </div>
          </div>
        </section>

        <div class="rounded-xl border border-default bg-surface p-4" aria-live="polite">
          <p class="text-secondary text-sm">Calorías restantes hoy</p>
          <p class="text-2xl font-bold tabular-nums" [class.text-success]="remainingCalories() >= 0" [class.text-error]="remainingCalories() < 0">
            {{ remainingCalories() }} kcal
          </p>
          <p class="text-sm text-secondary">Para planificar la cena</p>
        </div>

        <section class="rounded-xl border border-default bg-surface p-4" aria-labelledby="meals-head">
          <h2 id="meals-head" class="font-semibold text-primary mb-3">Desglose por comida</h2>
          <div class="flex flex-col gap-3">
            @for (meal of mealTypes; track meal) {
              @if (logsByMeal()[meal]?.length) {
                <div class="rounded-lg bg-subtle/50 p-3">
                  <p class="font-medium text-primary">{{ getMealLabel(meal) }}</p>
                  <p class="text-sm text-secondary tabular-nums">
                    {{ subtotalCalories(meal) }} kcal ·
                    P {{ subtotalProtein(meal) }}g · C {{ subtotalCarbs(meal) }}g · G {{ subtotalFat(meal) }}g
                  </p>
                </div>
              }
            }
            @if (totalLogged() === 0) {
              <p class="text-secondary text-sm">Aún no has registrado comidas hoy.</p>
              <a pButton icon="pi pi-plus" label="Agregar alimento" [routerLink]="['/app/nutricion/log']" size="small"></a>
            }
          </div>
        </section>

        <a
          pButton
          icon="pi pi-plus"
          label="Agregar alimento"
          [routerLink]="['/app/nutricion/log']"
          class="fixed bottom-6 right-6 z-10 shadow-lg md:static md:shadow-none"
          aria-label="Agregar alimento al registro del día"
        ></a>
      }
    </div>
  `,
})
export class NutricionDashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private nutritionProfile = inject(NutritionProfileService);
  private foodLog = inject(FoodLogService);
  private calculator = inject(NutritionCalculatorService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly profile = signal<{ protein_target_g: number; carbs_target_g: number; fat_target_g: number; height_cm: number; weight_kg: number } | null>(null);
  readonly summary = signal<DailyNutritionSummary | null>(null);
  readonly logsByMeal = signal<LogsByMeal>({});
  readonly selectedDate = signal<string>(this.todayStr());

  readonly mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'extra'];

  readonly todayLabel = computed(() => {
    const d = this.selectedDate();
    return new Date(d + 'T12:00:00').toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  });

  readonly hasProfile = computed(() => this.profile() != null);

  readonly remainingCalories = computed(() => {
    const s = this.summary();
    if (!s) return 0;
    return s.calories_target - Math.round(s.calories_total);
  });

  readonly caloriesProgress = computed(() => {
    const s = this.summary();
    if (!s || s.calories_target <= 0) return 0;
    return Math.round((s.calories_total / s.calories_target) * 100);
  });

  readonly caloriesBarWidth = computed(() =>
    Math.min(this.caloriesProgress(), 100)
  );

  readonly caloriesBarClass = computed(() => {
    const p = this.caloriesProgress();
    if (p <= 90) return 'bg-success';
    if (p <= 110) return 'bg-warning';
    return 'bg-error';
  });

  readonly proteinProgress = computed(() => {
    const s = this.summary();
    const p = this.profile();
    if (!s || !p || p.protein_target_g <= 0) return 0;
    return Math.min(100, Math.round((s.protein_g / p.protein_target_g) * 100));
  });

  readonly carbsProgress = computed(() => {
    const s = this.summary();
    const p = this.profile();
    if (!s || !p || p.carbs_target_g <= 0) return 0;
    return Math.min(100, Math.round((s.carbs_g / p.carbs_target_g) * 100));
  });

  readonly carbsBarClass = computed(() => 'bg-primary');

  readonly fatProgress = computed(() => {
    const s = this.summary();
    const p = this.profile();
    if (!s || !p || p.fat_target_g <= 0) return 0;
    return Math.min(100, Math.round((s.fat_g / p.fat_target_g) * 100));
  });

  readonly kpiCalories = computed((): KpiData => {
    const s = this.summary();
    const total = Math.round(s?.calories_total ?? 0);
    const target = s?.calories_target ?? 0;
    return {
      id: 'cal',
      label: 'Calorías hoy',
      value: total,
      valueDisplay: `${total} / ${target}`,
      subtitle: 'kcal',
      icon: 'pi pi-bolt',
    };
  });

  readonly kpiProtein = computed((): KpiData => {
    const s = this.summary();
    const g = Math.round(s?.protein_g ?? 0);
    const target = this.profile()?.protein_target_g ?? 0;
    return {
      id: 'pro',
      label: 'Proteína',
      value: g,
      valueDisplay: `${g}${target ? ' / ' + target : ''} g`,
      icon: 'pi pi-apple',
    };
  });

  readonly kpiBmi = computed((): KpiData => {
    const p = this.profile();
    if (!p) return { id: 'bmi', label: 'IMC', value: 0, icon: 'pi pi-chart-line' };
    const bmi = this.calculator.calculateBMI(p.weight_kg, p.height_cm);
    const cat = this.calculator.getBMICategory(bmi);
    return {
      id: 'bmi',
      label: 'IMC',
      value: bmi,
      valueDisplay: bmi.toFixed(1),
      subtitle: cat,
      icon: 'pi pi-chart-line',
    };
  });

  readonly totalLogged = computed(() => {
    const byMeal = this.logsByMeal();
    return this.mealTypes.reduce((sum, m) => sum + (byMeal[m]?.length ?? 0), 0);
  });

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user?.id || !user?.householdId) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    const date = this.selectedDate();
    const [profileRes, summaryRes, logsRes] = await Promise.all([
      this.nutritionProfile.getByProfileId(user.id),
      this.foodLog.getDailySummary(user.id, date),
      this.foodLog.getLogsByDateGrouped(user.id, date),
    ]);
    this.loading.set(false);
    if (profileRes.data) this.profile.set(profileRes.data);
    if (summaryRes.data) this.summary.set(summaryRes.data);
    if (logsRes.data) this.logsByMeal.set(logsRes.data);
  }

  getMealLabel(meal: MealType): string {
    return MEAL_TYPE_LABELS[meal] ?? meal;
  }

  subtotalCalories(meal: MealType): number {
    const items = this.logsByMeal()[meal] ?? [];
    return Math.round(items.reduce((s, l) => s + l.calories, 0));
  }

  subtotalProtein(meal: MealType): number {
    const items = this.logsByMeal()[meal] ?? [];
    return Math.round(items.reduce((s, l) => s + l.protein_g, 0) * 100) / 100;
  }

  subtotalCarbs(meal: MealType): number {
    const items = this.logsByMeal()[meal] ?? [];
    return Math.round(items.reduce((s, l) => s + l.carbs_g, 0) * 100) / 100;
  }

  subtotalFat(meal: MealType): number {
    const items = this.logsByMeal()[meal] ?? [];
    return Math.round(items.reduce((s, l) => s + l.fat_g, 0) * 100) / 100;
  }

  goToPerfil(): void {
    this.router.navigate(['/app/nutricion/perfil']);
  }

  private todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
