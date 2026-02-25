import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '@core/services/auth.service';
import { SavedMealService } from '@core/services/saved-meal.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import type { SavedMeal } from '@core/models/nutrition.model';

@Component({
  selector: 'app-comidas-guardadas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputNumberModule,
    DialogModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <app-page-header
        title="Comidas guardadas"
        description="Recetas y combos que repites. Regístralas con un tap."
        parentHref="/app/nutricion"
        parentLabel="Nutrición"
      />

      @if (loading()) {
        <div class="h-48 rounded-xl bg-subtle animate-pulse"></div>
      } @else if (meals().length === 0) {
        <app-empty-state
          message="Sin comidas guardadas"
          subtitle="Desde el registro del día puedes guardar una comida como receta para reutilizarla."
          actionLabel="Ir al registro"
          (action)="goToLog()"
        />
      } @else {
        <ul class="flex flex-col gap-4">
          @for (meal of meals(); track meal.id) {
            <li class="rounded-xl border border-default bg-surface p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 class="font-semibold text-primary">{{ meal.name }}</h3>
                <p class="text-sm text-secondary tabular-nums">
                  {{ meal.total_calories }} kcal · P {{ meal.total_protein_g }}g · C {{ meal.total_carbs_g }}g · G {{ meal.total_fat_g }}g
                </p>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm">Porciones:</span>
                <p-inputNumber
                  [ngModel]="getPortions(meal.id)"
                  (ngModelChange)="setPortions(meal.id, $event)"
                  [min]="0.25"
                  [max]="10"
                  [step]="0.25"
                  [showButtons]="true"
                  inputStyleClass="w-24"
                />
                <button
                  pButton
                  label="Registrar hoy"
                  icon="pi pi-plus"
                  size="small"
                  (click)="logMeal(meal)"
                  [loading]="loggingId() === meal.id"
                ></button>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class ComidasGuardadasComponent implements OnInit {
  private auth = inject(AuthService);
  private savedMealService = inject(SavedMealService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly meals = signal<SavedMeal[]>([]);
  readonly loggingId = signal<string | null>(null);
  private portionsMap: Record<string, number> = {};

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
    const { data } = await this.savedMealService.getSavedMeals(user.id);
    this.loading.set(false);
    if (data) {
      this.meals.set(data);
      data.forEach((m) => {
        if (this.portionsMap[m.id] == null) this.portionsMap[m.id] = 1;
      });
    }
  }

  getPortions(mealId: string): number {
    return this.portionsMap[mealId] ?? 1;
  }

  setPortions(mealId: string, value: number): void {
    this.portionsMap[mealId] = value;
  }

  async logMeal(meal: SavedMeal): Promise<void> {
    const user = this.auth.currentUser();
    if (!user?.id || !user?.householdId) return;
    const portions = this.getPortions(meal.id);
    this.loggingId.set(meal.id);
    const today = new Date().toISOString().slice(0, 10);
    await this.savedMealService.logSavedMeal(
      meal.id,
      user.id,
      user.householdId,
      today,
      'lunch',
      portions
    );
    this.loggingId.set(null);
  }

  goToLog(): void {
    this.router.navigate(['/app/nutricion/log']);
  }
}
