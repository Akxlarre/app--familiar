import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  input,
  model,
  output,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { FoodDatabaseService } from '@core/services/food-database.service';
import { FoodLogService } from '@core/services/food-log.service';
import { SavedMealService } from '@core/services/saved-meal.service';
import { NutritionCalculatorService } from '@core/services/nutrition-calculator.service';
import { ProductService } from '@core/services/product.service';
import type { Product } from '@core/models/inventory.model';
import type { Food, SavedMeal, MealType } from '@core/models/nutrition.model';
import { NuevoAlimentoDialogComponent } from './nuevo-alimento-dialog.component';

@Component({
  selector: 'app-buscar-alimento-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    NuevoAlimentoDialogComponent,
  ],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      header="Agregar alimento"
      [modal]="true"
      appendTo="body"
      [style]="{ width: '90vw', maxWidth: '500px' }"
      (onHide)="onHide()"
      [draggable]="false"
      [resizable]="false"
      role="dialog"
      aria-labelledby="dialog-title"
      aria-modal="true"
    >
      <ng-template pTemplate="header">
        <h2 id="dialog-title" class="font-semibold text-lg">Agregar alimento</h2>
      </ng-template>

      <div class="flex gap-2 border-b border-default mb-3" role="tablist">
        <button type="button" role="tab" [attr.aria-selected]="activeTab() === 0" (click)="activeTab.set(0)" class="px-3 py-2 rounded-t" [class.border-b-2]="activeTab() === 0" [class.border-primary]="activeTab() === 0">Recientes</button>
        <button type="button" role="tab" [attr.aria-selected]="activeTab() === 1" (click)="activeTab.set(1)" class="px-3 py-2 rounded-t" [class.border-b-2]="activeTab() === 1" [class.border-primary]="activeTab() === 1">Buscar</button>
        <button type="button" role="tab" [attr.aria-selected]="activeTab() === 2" (click)="activeTab.set(2)" class="px-3 py-2 rounded-t" [class.border-b-2]="activeTab() === 2" [class.border-primary]="activeTab() === 2">Comidas guardadas</button>
      </div>
      @if (activeTab() === 0) {
          @if (recentLoading()) {
            <div class="h-24 bg-subtle rounded animate-pulse"></div>
          } @else {
            <ul class="flex flex-col gap-2 max-h-64 overflow-auto">
              @for (f of recentFoods(); track f.id) {
                <li>
                  <button
                    type="button"
                    class="w-full text-left px-3 py-2 rounded border border-default hover:bg-subtle"
                    (click)="selectFood(f)"
                  >
                    {{ f.name }}@if (f.brand) { <span class="text-secondary">— {{ f.brand }}</span> }
                  </button>
                </li>
              }
              @if (recentFoods().length === 0) {
                <li class="text-secondary text-sm">Sin alimentos recientes</li>
              }
            </ul>
          }
      }
      @if (activeTab() === 1) {
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchInput()"
            placeholder="Nombre del alimento..."
            class="w-full rounded border border-default px-3 py-2 mb-2"
            aria-label="Buscar alimento"
          />
          @if (searchLoading()) {
            <div class="h-24 bg-subtle rounded animate-pulse"></div>
          } @else {
            <ul class="flex flex-col gap-2 max-h-64 overflow-auto">
              @for (f of searchResults(); track f.id) {
                <li>
                  <button
                    type="button"
                    class="w-full text-left px-3 py-2 rounded border border-default hover:bg-subtle"
                    (click)="selectFood(f)"
                  >
                    {{ f.name }}@if (f.brand) { <span class="text-secondary">— {{ f.brand }}</span> }
                  </button>
                </li>
              }
              @if (searchQuery() && !searchLoading() && searchResults().length === 0) {
                <li class="text-secondary text-sm">No encontrado. <button type="button" class="underline" (click)="openNewFood()">Agregar manualmente</button></li>
              }
            </ul>
          }
      }
      @if (activeTab() === 2) {
          @if (savedLoading()) {
            <div class="h-24 bg-subtle rounded animate-pulse"></div>
          } @else {
            <ul class="flex flex-col gap-2 max-h-64 overflow-auto">
              @for (m of savedMeals(); track m.id) {
                <li>
                  <button
                    type="button"
                    class="w-full text-left px-3 py-2 rounded border border-default hover:bg-subtle"
                    (click)="selectSavedMeal(m)"
                  >
                    {{ m.name }} — {{ m.total_calories }} kcal
                  </button>
                </li>
              }
              @if (savedMeals().length === 0) {
                <li class="text-secondary text-sm">Sin comidas guardadas</li>
              }
            </ul>
          }
      }

      @if (selectedFood()) {
        <div class="mt-4 p-3 rounded-lg bg-subtle/50 border border-default">
          <p class="font-medium">{{ selectedFood()!.name }}</p>
          <label class="block text-sm mt-2">Cantidad (g)</label>
          <p-inputNumber
            [(ngModel)]="quantityG"
            [min]="1"
            [max]="10000"
            [step]="10"
            inputStyleClass="w-full"
            (ngModelChange)="updatePreview()"
          />
          <p class="text-sm text-secondary mt-2 tabular-nums" aria-live="polite">
            {{ previewCalories() }} kcal · P {{ previewProtein() }}g · C {{ previewCarbs() }}g · G {{ previewFat() }}g
          </p>
          <div class="flex gap-2 mt-2">
            <button pButton label="Agregar" icon="pi pi-check" (click)="confirmAdd()" [loading]="adding()"></button>
            <button pButton label="Cancelar" severity="secondary" (click)="clearSelection()"></button>
          </div>
        </div>
      }

      @if (matchingPantryProduct(); as product) {
        <div class="mt-4 p-3 rounded-lg border border-default bg-surface" role="status" aria-live="polite">
          <p class="text-sm text-primary mb-2">¿Descontar 1 de <strong>{{ product.name }}</strong> del inventario?</p>
          <div class="flex gap-2">
            <button pButton label="Sí" size="small" (click)="deductFromInventory()" [loading]="deductingInventory()"></button>
            <button pButton label="No" severity="secondary" size="small" (click)="dismissInventorySuggestion()"></button>
          </div>
        </div>
      }

      @if (selectedSavedMeal()) {
        <div class="mt-4 p-3 rounded-lg bg-subtle/50 border border-default">
          <p class="font-medium">{{ selectedSavedMeal()!.name }}</p>
          <label class="block text-sm mt-2">Porciones</label>
          <p-inputNumber
            [(ngModel)]="savedMealPortions"
            [min]="0.25"
            [max]="10"
            [step]="0.25"
            inputStyleClass="w-full"
          />
          <div class="flex gap-2 mt-2">
            <button pButton label="Registrar" icon="pi pi-check" (click)="confirmSavedMeal()" [loading]="adding()"></button>
            <button pButton label="Cancelar" severity="secondary" (click)="clearSavedMealSelection()"></button>
          </div>
        </div>
      }

      <ng-template pTemplate="footer">
        <button pButton label="Cerrar" severity="secondary" (click)="visible.set(false)"></button>
      </ng-template>
    </p-dialog>

    <app-nuevo-alimento-dialog
      [(visible)]="showNewFoodDialog"
      [householdId]="householdId() ?? ''"
      (created)="onNewFoodCreated($event)"
    />
  `,
})
export class BuscarAlimentoDialogComponent {
  private foodDb = inject(FoodDatabaseService);
  private foodLog = inject(FoodLogService);
  private savedMealService = inject(SavedMealService);
  private calculator = inject(NutritionCalculatorService);
  private productService = inject(ProductService);

  visible = model.required<boolean>();
  mealType = input.required<MealType>();
  logDate = input.required<string>();
  profileId = input.required<string>();
  householdId = input.required<string>();

  readonly added = output<void>();

  readonly recentFoods = signal<Food[]>([]);
  readonly recentLoading = signal(false);
  readonly searchQuery = signal('');
  readonly searchResults = signal<Food[]>([]);
  readonly searchLoading = signal(false);
  readonly savedMeals = signal<SavedMeal[]>([]);
  readonly savedLoading = signal(false);
  readonly selectedFood = signal<Food | null>(null);
  readonly selectedSavedMeal = signal<SavedMeal | null>(null);
  readonly adding = signal(false);
  quantityG = 100;
  savedMealPortions = 1;
  readonly previewCalories = signal(0);
  readonly previewProtein = signal(0);
  readonly previewCarbs = signal(0);
  readonly previewFat = signal(0);
  readonly showNewFoodDialog = signal(false);
  readonly activeTab = signal(0);
  /** Producto unitario del inventario que coincide por código de barras (sugerencia de descuento). */
  readonly matchingPantryProduct = signal<Product | null>(null);
  readonly deductingInventory = signal(false);
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.loadTabs();
      }
    });
  }

  async loadTabs(): Promise<void> {
    const pid = this.profileId();
    const hid = this.householdId();
    if (!pid || !hid) return;
    this.recentLoading.set(true);
    this.savedLoading.set(true);
    const [recentRes, savedRes] = await Promise.all([
      this.foodDb.getRecentFoods(pid, 10),
      this.savedMealService.getSavedMeals(pid),
    ]);
    this.recentLoading.set(false);
    this.savedLoading.set(false);
    if (recentRes.data) this.recentFoods.set(recentRes.data);
    if (savedRes.data) this.savedMeals.set(savedRes.data);
  }

  onTabChange(_index: number): void {
    this.clearSelection();
    this.clearSavedMealSelection();
  }

  onSearchInput(): void {
    const q = this.searchQuery().trim();
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    if (!q) {
      this.searchResults.set([]);
      return;
    }
    this.searchDebounce = setTimeout(() => this.doSearch(), 300);
  }

  private async doSearch(): Promise<void> {
    const q = this.searchQuery().trim();
    const hid = this.householdId();
    if (!q || !hid) return;
    this.searchLoading.set(true);
    const { data } = await this.foodDb.searchFoods(q, hid, 20);
    this.searchResults.set(data ?? []);
    if ((data?.length ?? 0) === 0) {
      const offRes = await this.foodDb.searchOpenFoodFacts(q);
      if (offRes.data?.length && offRes.data[0]) {
        const imported = await this.foodDb.importFromOpenFoodFacts(
          offRes.data[0],
          hid,
          this.profileId()
        );
        if (imported.data) this.searchResults.set([imported.data]);
      }
    }
    this.searchLoading.set(false);
  }

  selectFood(food: Food): void {
    this.selectedSavedMeal.set(null);
    this.selectedFood.set(food);
    this.quantityG = 100;
    this.updatePreview();
  }

  selectSavedMeal(meal: SavedMeal): void {
    this.selectedFood.set(null);
    this.selectedSavedMeal.set(meal);
    this.savedMealPortions = 1;
  }

  updatePreview(): void {
    const food = this.selectedFood();
    if (!food) return;
    const scaled = this.calculator.scaleNutrients(
      {
        calories: food.calories_100,
        protein: food.protein_100,
        carbs: food.carbs_100,
        fat: food.fat_100,
      },
      this.quantityG
    );
    this.previewCalories.set(scaled.calories);
    this.previewProtein.set(scaled.proteinG);
    this.previewCarbs.set(scaled.carbsG);
    this.previewFat.set(scaled.fatG);
  }

  clearSelection(): void {
    this.selectedFood.set(null);
  }

  clearSavedMealSelection(): void {
    this.selectedSavedMeal.set(null);
  }

  async confirmAdd(): Promise<void> {
    const food = this.selectedFood();
    const pid = this.profileId();
    const hid = this.householdId();
    if (!food || !pid || !hid) return;
    this.adding.set(true);
    const scaled = this.calculator.scaleNutrients(
      {
        calories: food.calories_100,
        protein: food.protein_100,
        carbs: food.carbs_100,
        fat: food.fat_100,
      },
      this.quantityG
    );
    const { error } = await this.foodLog.createLog({
      profileId: pid,
      householdId: hid,
      logDate: this.logDate(),
      mealType: this.mealType(),
      foodId: food.id,
      quantityG: this.quantityG,
      calories: scaled.calories,
      proteinG: scaled.proteinG,
      carbsG: scaled.carbsG,
      fatG: scaled.fatG,
    });
    this.adding.set(false);
    if (!error) {
      await this.checkMatchingPantryProduct(food);
      const match = this.matchingPantryProduct();
      if (!match) {
        this.clearSelection();
        this.added.emit();
      }
    }
  }

  private async checkMatchingPantryProduct(food: { barcode: string | null }): Promise<void> {
    const hid = this.householdId();
    if (!hid || !food.barcode?.trim()) return;
    const { data: products } = await this.productService.getProducts({
      householdId: hid,
      search: food.barcode.trim(),
    });
    const unitProduct = (products ?? []).find(
      (p) => (p.barcode ?? '').trim() === food.barcode?.trim() && (p.unit === 'unidad' || p.unit === 'unit') && p.quantity > 0
    );
    if (unitProduct) this.matchingPantryProduct.set(unitProduct);
  }

  async deductFromInventory(): Promise<void> {
    const product = this.matchingPantryProduct();
    if (!product) return;
    this.deductingInventory.set(true);
    await this.productService.updateProduct(product.id, {
      quantity: Math.max(0, product.quantity - 1),
    });
    this.deductingInventory.set(false);
    this.matchingPantryProduct.set(null);
    this.clearSelection();
    this.added.emit();
  }

  dismissInventorySuggestion(): void {
    this.matchingPantryProduct.set(null);
    this.clearSelection();
    this.added.emit();
  }

  async confirmSavedMeal(): Promise<void> {
    const meal = this.selectedSavedMeal();
    const pid = this.profileId();
    const hid = this.householdId();
    if (!meal || !pid || !hid) return;
    this.adding.set(true);
    await this.savedMealService.logSavedMeal(
      meal.id,
      pid,
      hid,
      this.logDate(),
      this.mealType(),
      this.savedMealPortions
    );
    this.adding.set(false);
    this.clearSavedMealSelection();
    this.added.emit();
  }

  openNewFood(): void {
    this.showNewFoodDialog.set(true);
  }

  onNewFoodCreated(food: Food): void {
    this.showNewFoodDialog.set(false);
    this.searchResults.update((list) => [...list, food]);
    this.selectFood(food);
  }

  onHide(): void {
    this.clearSelection();
    this.clearSavedMealSelection();
    this.searchQuery.set('');
    this.searchResults.set([]);
  }
}
