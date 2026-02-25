import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { RecipeService } from '@core/services/recipe.service';
import { MealPlanService } from '@core/services/meal-plan.service';
import { ShoppingListService } from '@core/services/shopping-list.service';
import type { ShoppingList, ShoppingListItem } from '../../../core/models/inventory.model';
import type { MealPlanSlot } from '@core/models/meals.model';

// ─── helpers ─────────────────────────────────────────────────────────────────
function getMondayOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=sun, 1=mon...
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Agrupa ingredientes similares y acumula cantidades */
interface MergedIngredient {
  key: string;   // name+unit lower
  name: string;
  totalQuantity: number;
  unit: string;
  recipeNames: string[];
  inList: boolean;
  listItemId?: string;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
};

@Component({
  selector: 'app-lista-comidas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DecimalPipe],
  template: `
    <div #container class="lista-comidas-page">

      <!-- BACK -->
      <a routerLink="/app/comidas" class="back-link">
        <i class="pi pi-arrow-left"></i> Comidas
      </a>

      <!-- HEADER ──────────────────────────────── -->
      <header class="page-header">
        <div class="page-header__text">
          <h1>Lista de compras semanal</h1>
          <p class="text-muted">Ingredientes del plan de la semana del {{ weekLabel() }}</p>
        </div>
        <div class="page-header__actions">
          <button class="btn btn-ghost btn--sm" (click)="prevWeek()">
            <i class="pi pi-chevron-left"></i>
          </button>
          <button class="btn btn-ghost btn--sm" (click)="goToday()">Hoy</button>
          <button class="btn btn-ghost btn--sm" (click)="nextWeek()">
            <i class="pi pi-chevron-right"></i>
          </button>
        </div>
      </header>

      <!-- ESTADO DE CARGA ──────────────────────── -->
      @if (loading()) {
        <div class="state state--loading">
          <i class="pi pi-spin pi-spinner"></i>
          <p>Cargando plan semanal…</p>
        </div>
      } @else if (noSlots()) {
        <div class="state state--empty card">
          <span class="state__emoji">📅</span>
          <h3>Sin recetas planificadas esta semana</h3>
          <p class="text-muted">Agrega recetas en el planificador para generar la lista de compras automáticamente.</p>
          <a routerLink="/app/comidas/planificador" class="btn btn-primary">
            <i class="pi pi-calendar"></i> Ir al Planificador
          </a>
        </div>
      } @else {

        <!-- SUMMARY BAR ──────────────────────── -->
        <div class="summary-bar card">
          <div class="summary-bar__stat">
            <span class="stat-val">{{ slotsWithRecipe().length }}</span>
            <span class="stat-lbl">comidas planificadas</span>
          </div>
          <div class="summary-bar__stat">
            <span class="stat-val">{{ mergedIngredients().length }}</span>
            <span class="stat-lbl">ingredientes únicos</span>
          </div>
          <div class="summary-bar__stat">
            <span class="stat-val">{{ pendingCount() }}</span>
            <span class="stat-lbl">pendientes de comprar</span>
          </div>
          <button class="btn btn-primary btn--push-right"
                  [disabled]="syncing() || pendingCount() === 0"
                  (click)="syncToShoppingList()">
            @if (syncing()) {
              <i class="pi pi-spin pi-spinner"></i> Sincronizando…
            } @else {
              <i class="pi pi-sync"></i> Agregar pendientes a lista
            }
          </button>
        </div>

        <!-- WEEK SLOTS ───────────────────────── -->
        <section class="week-slots card">
          <h2 class="section-title">
            <i class="pi pi-calendar"></i> Recetas de la semana
          </h2>
          <div class="slots-grid">
            @for (slot of slotsWithRecipe(); track slot.id) {
              <div class="slot-chip">
                <span class="slot-chip__day">{{ dayName(slot.day_of_week) }}</span>
                <span class="slot-chip__meal">{{ MEAL_LABELS[slot.meal_type] }}</span>
                <span class="slot-chip__name">{{ slot.recipe?.name ?? '—' }}</span>
              </div>
            }
          </div>
        </section>

        <!-- INGREDIENTES ─────────────────────── -->
        <section class="ingredients-section">
          <div class="ingredients-section__header">
            <h2 class="section-title">
              <i class="pi pi-list"></i> Ingredientes necesarios
            </h2>
            <div class="legend">
              <span class="legend-dot legend-dot--pending"></span> Pendiente
              <span class="legend-dot legend-dot--done" style="margin-left: var(--space-3)"></span> En lista
            </div>
          </div>

          @if (synced()) {
            <div class="alert alert--success">
              <i class="pi pi-check-circle"></i>
              ¡{{ lastSyncedCount() }} ingredientes agregados a tu lista de compras!
              <a routerLink="/app/inventario/lista-compras" class="alert__link">Ver lista →</a>
            </div>
          }

          <ul class="ingredients-list">
            @for (ing of mergedIngredients(); track ing.key) {
              <li class="ingredient-item" [class.ingredient-item--done]="ing.inList">
                <div class="ingredient-item__check">
                  @if (ing.inList) {
                    <i class="pi pi-check"></i>
                  }
                </div>
                <div class="ingredient-item__info">
                  <span class="ingredient-item__name">{{ ing.name }}</span>
                  <span class="ingredient-item__qty">
                    {{ ing.totalQuantity | number:'1.0-2' }} {{ ing.unit }}
                  </span>
                </div>
                <div class="ingredient-item__recipes text-muted">
                  @for (r of ing.recipeNames; track r; let last = $last) {
                    {{ r }}@if (!last){ · }
                  }
                </div>
              </li>
            }
          </ul>
        </section>

        <!-- LINK A LISTA GENERAL ─────────────── -->
        <div class="footer-link card">
          <i class="pi pi-shopping-cart"></i>
          <div>
            <p><strong>¿Quieres ver toda la lista de compras del hogar?</strong></p>
            <p class="text-muted">Incluye sugerencias de stock bajo y ítems manuales.</p>
          </div>
          <a routerLink="/app/inventario/lista-compras" class="btn btn-ghost">
            Ver lista completa →
          </a>
        </div>
      }
    </div>
  `,
  styleUrl: './lista-comidas.component.scss',
})
export class ListaComidasComponent implements OnInit {
  private auth = inject(AuthService);
  private gsap = inject(GsapAnimationsService);
  private mealPlan = inject(MealPlanService);
  private recipeSvc = inject(RecipeService);
  private listSvc = inject(ShoppingListService);

  private container = viewChild<ElementRef<HTMLElement>>('container');

  // ── State ─────────────────────────────────────────────────────────────────
  loading = signal(true);
  syncing = signal(false);
  synced = signal(false);
  lastSyncedCount = signal(0);

  currentMonday = signal<Date>(getMondayOfWeek(new Date()));

  slots = signal<MealPlanSlot[]>([]);
  list = signal<ShoppingList | null>(null);
  listItems = signal<ShoppingListItem[]>([]);

  // ── Computed ──────────────────────────────────────────────────────────────
  readonly MEAL_LABELS = MEAL_LABELS;

  weekLabel = computed(() => {
    const m = this.currentMonday();
    return m.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  });

  slotsWithRecipe = computed(() =>
    this.slots().filter((s) => s.recipe_id && s.recipe)
  );

  noSlots = computed(() => this.slotsWithRecipe().length === 0);

  mergedIngredients = computed((): MergedIngredient[] => {
    const map = new Map<string, MergedIngredient>();
    const listItemNames = new Set(
      this.listItems()
        .filter((i) => i.source === 'meal_plan')
        .map((i) => i.name.toLowerCase().trim())
    );

    for (const slot of this.slotsWithRecipe()) {
      const recipe = slot.recipe;
      if (!recipe) continue;
      const ingredients = (slot as any)._ingredients as Array<{ name: string; quantity: number; unit: string }> ?? [];

      for (const ing of ingredients) {
        const key = `${ing.name.toLowerCase().trim()}|${ing.unit.toLowerCase().trim()}`;
        if (map.has(key)) {
          const existing = map.get(key)!;
          existing.totalQuantity += ing.quantity;
          if (!existing.recipeNames.includes(recipe.name)) {
            existing.recipeNames.push(recipe.name);
          }
        } else {
          map.set(key, {
            key,
            name: ing.name,
            totalQuantity: ing.quantity,
            unit: ing.unit,
            recipeNames: [recipe.name],
            inList: listItemNames.has(ing.name.toLowerCase().trim()),
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  });

  pendingCount = computed(() =>
    this.mergedIngredients().filter((i) => !i.inList).length
  );

  constructor() {
    afterNextRender(() => {
      const c = this.container();
      if (c) this.gsap.animatePageEnter(c.nativeElement);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadWeek();
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  prevWeek(): void {
    const d = new Date(this.currentMonday());
    d.setDate(d.getDate() - 7);
    this.currentMonday.set(d);
    this.loadWeek();
  }

  nextWeek(): void {
    const d = new Date(this.currentMonday());
    d.setDate(d.getDate() + 7);
    this.currentMonday.set(d);
    this.loadWeek();
  }

  goToday(): void {
    this.currentMonday.set(getMondayOfWeek(new Date()));
    this.loadWeek();
  }

  // ── Load ──────────────────────────────────────────────────────────────────
  private async loadWeek(): Promise<void> {
    this.loading.set(true);
    this.synced.set(false);

    const hid = this.auth.currentUser()?.householdId;
    if (!hid) { this.loading.set(false); return; }

    // 1. Obtener el plan de la semana (o el más reciente si no hay uno exacto)
    const monday = fmtDate(this.currentMonday());
    const planRes = await this.mealPlan.getActivePlan(hid, monday);
    if (planRes.error || !planRes.data) {
      this.slots.set([]);
      this.loading.set(false);
      return;
    }

    // 2. Obtener slots del plan
    const slotsRes = await this.mealPlan.getSlots(planRes.data.id);
    const rawSlots = slotsRes.data;

    // 3. Para cada slot con receta → cargar ingredientes y adjuntarlos
    const enrichedSlots: MealPlanSlot[] = [];
    for (const slot of rawSlots) {
      if (!slot.recipe_id) { enrichedSlots.push(slot); continue; }
      const { data: recipe } = await this.recipeSvc.getRecipe(slot.recipe_id);
      if (recipe) {
        (slot as any)._ingredients = recipe.ingredients ?? [];
        slot.recipe = {
          id: recipe.id,
          name: recipe.name,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          prep_time_min: recipe.prep_time_min,
          meal_type: recipe.meal_type,
        };
      }
      enrichedSlots.push(slot);
    }
    this.slots.set(enrichedSlots);

    // 3. Cargar la lista de compras activa del hogar
    const listRes = await this.listSvc.ensureActiveList(hid);
    if (!listRes.error && listRes.data) {
      this.list.set(listRes.data);
      const itemsRes = await this.listSvc.getItems(listRes.data.id);
      if (!itemsRes.error) this.listItems.set(itemsRes.data);
    }

    this.loading.set(false);
  }

  // ── Sync ──────────────────────────────────────────────────────────────────
  async syncToShoppingList(): Promise<void> {
    const list = this.list();
    if (!list) return;

    this.syncing.set(true);
    const pending = this.mergedIngredients().filter((i) => !i.inList);
    let added = 0;

    for (const ing of pending) {
      const res = await this.listSvc.addItem({
        listId: list.id,
        name: ing.name,
        quantity: ing.totalQuantity,
        unit: ing.unit,
        source: 'meal_plan',
      });
      if (!res.error && res.data) {
        this.listItems.update((arr) => [...arr, res.data!]);
        added++;
      }
    }

    this.lastSyncedCount.set(added);
    this.synced.set(true);
    this.syncing.set(false);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  dayName(dow: number): string {
    const names = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return names[dow] ?? '';
  }
}
