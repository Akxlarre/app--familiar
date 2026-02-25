import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@core/services/auth.service';
import { FoodLogService, LogsByMeal } from '@core/services/food-log.service';
import { NutritionProfileService } from '@core/services/nutrition-profile.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { MEAL_TYPE_LABELS } from '@core/constants/nutrition.constants';
import type { FoodLog, MealType } from '@core/models/nutrition.model';
import { BuscarAlimentoDialogComponent } from './buscar-alimento-dialog.component';

@Component({
  selector: 'app-food-log-diario',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ButtonModule,
    PageHeaderComponent,
    EmptyStateComponent,
    BuscarAlimentoDialogComponent,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <app-page-header
        title="Registro del día"
        [description]="dateLabel()"
        parentHref="/app/nutricion"
        parentLabel="Nutrición"
      />

      @if (!profileId()) {
        <app-empty-state
          message="Configura tu perfil"
          subtitle="Necesitas un perfil nutricional para registrar comidas."
          actionLabel="Ir a perfil"
          (action)="goToPerfil()"
        />
      } @else {
        <div class="flex flex-wrap items-center gap-4">
          <label for="log-date" class="text-sm font-medium text-primary">Fecha</label>
          <input
            id="log-date"
            type="date"
            [value]="selectedDate()"
            (change)="onDateChange($event)"
            class="rounded border border-default px-3 py-2"
            aria-label="Seleccionar fecha"
          />
          <p class="text-sm text-secondary tabular-nums">
            Total: {{ totalCalories() }} kcal ·
            P {{ totalProtein() }}g · C {{ totalCarbs() }}g · G {{ totalFat() }}g
          </p>
        </div>

        @for (meal of mealTypes; track meal) {
          <section class="rounded-xl border border-default bg-surface p-4" [attr.aria-labelledby]="'meal-' + meal">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 [id]="'meal-' + meal" class="font-semibold text-primary">
                {{ getMealLabel(meal) }}
              </h2>
              <span class="text-sm text-secondary tabular-nums">
                {{ subtotalCalories(meal) }} kcal
              </span>
              <button
                pButton
                icon="pi pi-plus"
                label="Agregar"
                size="small"
                severity="secondary"
                (click)="openAddDialog(meal)"
                [attr.aria-label]="'Agregar alimento a ' + getMealLabel(meal)"
              ></button>
            </div>
            <ul class="flex flex-col gap-2">
              @for (log of logsByMeal()[meal] ?? []; track log.id) {
                <li class="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-default last:border-0">
                  <span class="font-medium">{{ log.food?.name ?? 'Alimento' }}</span>
                  <span class="text-sm text-secondary tabular-nums">
                    {{ log.quantity_g }}g · {{ log.calories }} kcal
                  </span>
                  <button
                    pButton
                    icon="pi pi-trash"
                    severity="danger"
                    [rounded]="true"
                    [text]="true"
                    size="small"
                    (click)="deleteLog(log.id)"
                    [attr.aria-label]="'Eliminar ' + (log.food?.name ?? 'alimento')"
                  ></button>
                </li>
              }
              @if (!(logsByMeal()[meal]?.length)) {
                <li class="text-secondary text-sm py-2">Sin alimentos registrados</li>
              }
            </ul>
          </section>
        }

        <app-buscar-alimento-dialog
          [(visible)]="showSearchDialog"
          [mealType]="selectedMealType()"
          [logDate]="selectedDate()"
          [profileId]="profileId()!"
          [householdId]="householdId()!"
          (added)="onFoodAdded()"
        />
      }
    </div>
  `,
})
export class FoodLogDiarioComponent implements OnInit {
  private auth = inject(AuthService);
  private foodLog = inject(FoodLogService);
  private nutritionProfile = inject(NutritionProfileService);
  private router = inject(Router);

  readonly selectedDate = signal<string>(this.todayStr());
  readonly logsByMeal = signal<LogsByMeal>({});
  readonly profileId = signal<string | null>(null);
  readonly householdId = signal<string | null>(null);
  readonly showSearchDialog = signal(false);
  readonly selectedMealType = signal<MealType>('breakfast');

  readonly mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'extra'];

  readonly dateLabel = computed(() => {
    const d = this.selectedDate();
    return new Date(d + 'T12:00:00').toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  });

  readonly totalCalories = computed(() =>
    Math.round(this.sumByMeal((logs) => logs.reduce((s, l) => s + l.calories, 0)))
  );
  readonly totalProtein = computed(() =>
    Math.round(this.sumByMeal((logs) => logs.reduce((s, l) => s + l.protein_g, 0)) * 100) / 100
  );
  readonly totalCarbs = computed(() =>
    Math.round(this.sumByMeal((logs) => logs.reduce((s, l) => s + l.carbs_g, 0)) * 100) / 100
  );
  readonly totalFat = computed(() =>
    Math.round(this.sumByMeal((logs) => logs.reduce((s, l) => s + l.fat_g, 0)) * 100) / 100
  );

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user?.id || !user?.householdId) return;
    this.profileId.set(user.id);
    this.householdId.set(user.householdId);
    const profileRes = await this.nutritionProfile.getByProfileId(user.id);
    if (!profileRes.data) {
      this.profileId.set(null);
      return;
    }
    const { data } = await this.foodLog.getLogsByDateGrouped(user.id, this.selectedDate());
    if (data) this.logsByMeal.set(data);
  }

  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.value) {
      this.selectedDate.set(input.value);
      this.load();
    }
  }

  getMealLabel(meal: MealType): string {
    return MEAL_TYPE_LABELS[meal] ?? meal;
  }

  subtotalCalories(meal: MealType): number {
    const items = this.logsByMeal()[meal] ?? [];
    return Math.round(items.reduce((s, l) => s + l.calories, 0));
  }

  openAddDialog(meal: MealType): void {
    this.selectedMealType.set(meal);
    this.showSearchDialog.set(true);
  }

  async onFoodAdded(): Promise<void> {
    this.showSearchDialog.set(false);
    await this.load();
  }

  async deleteLog(id: string): Promise<void> {
    await this.foodLog.deleteLog(id);
    await this.load();
  }

  private sumByMeal(fn: (logs: FoodLog[]) => number): number {
    return this.mealTypes.reduce(
      (sum, meal) => sum + fn(this.logsByMeal()[meal] ?? []),
      0
    );
  }

  goToPerfil(): void {
    this.router.navigate(['/app/nutricion/perfil']);
  }

  private todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
