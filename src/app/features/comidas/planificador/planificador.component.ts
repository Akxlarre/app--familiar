import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    afterNextRender,
    inject,
    signal,
    computed,
    ElementRef,
    viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { MealPlanService } from '@core/services/meal-plan.service';
import { RecipeService } from '@core/services/recipe.service';
import type {
    MealPlan,
    MealPlanSlot,
    Recipe,
    WeekGrid,
    UpsertSlotInput,
} from '@core/models/meals.model';

// ─── Constantes ──────────────────────────────────────────────────────────────
const DOW_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MEAL_COLS: Array<{ key: string; label: string; icon: string }> = [
    { key: 'breakfast', label: 'Desayuno', icon: 'pi-sun' },
    { key: 'lunch', label: 'Almuerzo', icon: 'pi-cloud-sun' },
    { key: 'dinner', label: 'Cena', icon: 'pi-moon' },
];

/** Devuelve el lunes de la semana de una fecha */
function getMonday(d: Date = new Date()): Date {
    const day = d.getDay(); // 0=Dom
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(monday.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function isoDate(d: Date): string {
    return d.toISOString().split('T')[0];
}

// ─── Interfaz del modal de pick ───────────────────────────────────────────────
interface SlotPickTarget {
    dayOfWeek: number;
    mealType: string;
    currentSlot?: MealPlanSlot;
}

@Component({
    selector: 'app-planificador',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, DecimalPipe],
    template: `
    <main #container class="planificador">

      <!-- ── HEADER ──────────────────────────────────────────────────── -->
      <header class="planificador__header">
        <div>
          <h1>Planificador Semanal</h1>
          <p class="text-muted">Semana del {{ weekLabel() }}</p>
        </div>
        <div class="planificador__actions">
          <!-- Nav de semana -->
          <button class="btn btn-ghost btn--icon" (click)="prevWeek()" title="Semana anterior">
            <i class="pi pi-chevron-left"></i>
          </button>
          <button class="btn btn-ghost btn--icon" (click)="nextWeek()" title="Semana siguiente">
            <i class="pi pi-chevron-right"></i>
          </button>

          @if (plan()) {
            <span class="status-badge" [class.status-badge--active]="plan()!.status === 'active'">
              {{ plan()!.status === 'draft' ? 'Borrador' : 'Activo' }}
            </span>
            @if (plan()!.status === 'draft') {
              <button class="btn btn-primary" (click)="activatePlan()">
                <i class="pi pi-check"></i> Activar plan
              </button>
            }
          } @else {
            <button class="btn btn-primary" (click)="createPlan()" [disabled]="saving()">
              <i class="pi pi-plus"></i> Crear plan para esta semana
            </button>
          }
        </div>
      </header>

      <!-- ── RESUMEN NUTRICIONAL ─────────────────────────────────────── -->
      @if (plan() && summary().daysPlanned > 0) {
        <div class="nutrition-strip">
          <div class="ns-item">
            <span class="ns-item__val">{{ summary().avgCaloriesPerDay }}</span>
            <span class="ns-item__lbl">kcal/día</span>
          </div>
          <div class="ns-sep"></div>
          <div class="ns-item">
            <span class="ns-item__val">{{ summary().avgProteinPerDay }}g</span>
            <span class="ns-item__lbl">prot/día</span>
          </div>
          <div class="ns-sep"></div>
          <div class="ns-item">
            <span class="ns-item__val">{{ summary().daysPlanned }}/7</span>
            <span class="ns-item__lbl">días planificados</span>
          </div>
          <div class="ns-sep"></div>
          <a routerLink="/app/comidas/lista-compras" class="btn btn-ghost btn--sm">
            <i class="pi pi-shopping-cart"></i> Ver lista de compras
          </a>
        </div>
      }

      <!-- ── ESTADOS ─────────────────────────────────────────────────── -->
      @if (loading()) {
        <div class="planificador__state">
          <i class="pi pi-spin pi-spinner"></i>
          <p>Cargando plan…</p>
        </div>
      } @else {

        <!-- ── GRILLA ──────────────────────────────────────────────────── -->
        <div class="grid-wrapper">
          <table class="week-grid" role="grid" aria-label="Planificador de comidas semanal">
            <thead>
              <tr>
                <th class="grid-corner" scope="col"></th>
                @for (day of days(); track day.dow) {
                  <th
                    class="grid-day-header"
                    [class.grid-day-header--today]="day.isToday"
                    scope="col"
                  >
                    <span class="day-name">{{ day.name }}</span>
                    <span class="day-date">{{ day.dateStr }}</span>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (meal of mealCols; track meal.key) {
                <tr class="grid-row">
                  <th class="grid-meal-header" scope="row">
                    <i [class]="'pi ' + meal.icon"></i>
                    <span>{{ meal.label }}</span>
                  </th>
                  @for (day of days(); track day.dow) {
                    @let slot = getSlot(day.dow, meal.key);
                    <td
                      class="grid-cell"
                      [class.grid-cell--filled]="slot && slot.slot_type === 'recipe'"
                      [class.grid-cell--done]="slot?.is_done"
                      [class.grid-cell--free]="slot?.slot_type === 'free' || slot?.slot_type === 'out'"
                      [class.grid-cell--today]="day.isToday"
                    >
                      @if (!plan()) {
                        <!-- sin plan activo: celda bloqueada -->
                        <div class="cell-locked">
                          <i class="pi pi-lock"></i>
                        </div>
                      } @else if (slot?.slot_type === 'recipe' && slot!.recipe) {
                        <!-- Slot con receta -->
                        <div class="cell-recipe">
                          <span class="cell-recipe__name">{{ slot!.recipe!.name }}</span>
                          @if (slot!.recipe!.calories) {
                            <span class="cell-recipe__cal">{{ slot!.recipe!.calories | number:'1.0-0' }} kcal</span>
                          }
                          <div class="cell-recipe__actions">
                            <button
                              class="cell-btn cell-btn--done"
                              [class.cell-btn--active]="slot!.is_done"
                              (click)="toggleDone(slot!)"
                              [title]="slot!.is_done ? 'Marcar como pendiente' : 'Marcar como cocinado'"
                            ><i [class]="'pi ' + (slot!.is_done ? 'pi-check-circle' : 'pi-circle')"></i></button>
                            <button
                              class="cell-btn"
                              (click)="openPick(day.dow, meal.key, slot)"
                              title="Cambiar receta"
                            ><i class="pi pi-pencil"></i></button>
                            <button
                              class="cell-btn cell-btn--danger"
                              (click)="clearSlot(slot!)"
                              title="Quitar receta"
                            ><i class="pi pi-trash"></i></button>
                          </div>
                        </div>
                      } @else if (slot?.slot_type === 'free' || slot?.slot_type === 'out') {
                        <!-- Libre / fuera de casa -->
                        <div class="cell-free" (click)="openPick(day.dow, meal.key, slot)">
                          <i class="pi pi-ellipsis-h"></i>
                          <span>{{ slot!.slot_type === 'out' ? 'Fuera' : 'Libre' }}</span>
                        </div>
                      } @else {
                        <!-- Celda vacía -->
                        <button
                          class="cell-empty"
                          (click)="openPick(day.dow, meal.key)"
                          [attr.aria-label]="'Agregar ' + meal.label + ' del ' + day.name"
                        >
                          <i class="pi pi-plus"></i>
                        </button>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- ── LEYENDA ─────────────────────────────────────────────────── -->
        <div class="legend">
          <span class="legend-item legend-item--filled">Receta planificada</span>
          <span class="legend-item legend-item--done">Ya cocinado</span>
          <span class="legend-item legend-item--free">Libre / Fuera</span>
          <span class="legend-item legend-item--empty">Sin planificar</span>
        </div>
      }
    </main>

    <!-- ── MODAL PICK ──────────────────────────────────────────────────── -->
    @if (pickTarget()) {
      <div class="modal-backdrop" (click)="closePick()">
        <div class="pick-modal" (click)="$event.stopPropagation()" role="dialog" aria-label="Seleccionar receta">

          <header class="pick-modal__header">
            <h2>Seleccionar para {{ pickMealLabel() }}</h2>
            <button class="btn-icon-close" (click)="closePick()"><i class="pi pi-times"></i></button>
          </header>

          <!-- Opciones de tipo de slot -->
          <div class="pick-modal__types">
            <button class="slot-type-btn" (click)="setSlotType('free')">
              <i class="pi pi-clock"></i> Libre
            </button>
            <button class="slot-type-btn" (click)="setSlotType('out')">
              <i class="pi pi-map-marker"></i> Fuera de casa
            </button>
            <button class="slot-type-btn" (click)="setSlotType('leftovers')">
              <i class="pi pi-refresh"></i> Sobras
            </button>
          </div>

          <div class="pick-modal__divider">o elige una receta</div>

          <!-- Búsqueda de recetas -->
          <div class="pick-modal__search">
            <i class="pi pi-search"></i>
            <input
              #searchInput
              type="search"
              placeholder="Buscar receta…"
              (input)="filterPickRecipes(searchInput.value)"
              aria-label="Buscar receta"
            />
          </div>

          <!-- Lista de recetas -->
          <ul class="pick-modal__list">
            @for (r of pickRecipes(); track r.id) {
              <li>
                <button class="pick-recipe-item" (click)="selectRecipe(r)">
                  <div class="pick-recipe-item__thumb">
                    @if (r.image_path) {
                      <img [src]="r.image_path" [alt]="r.name" />
                    } @else {
                      <span>{{ r.name[0] }}</span>
                    }
                  </div>
                  <div class="pick-recipe-item__info">
                    <span class="pick-recipe-item__name">{{ r.name }}</span>
                    <span class="pick-recipe-item__meta">
                      @if (r.prep_time_min) { {{ r.prep_time_min }}min · }
                      @if (r.calories) { {{ r.calories | number:'1.0-0' }} kcal }
                    </span>
                  </div>
                  <i class="pi pi-chevron-right"></i>
                </button>
              </li>
            } @empty {
              <li class="pick-modal__empty">
                <span>😅</span> No hay recetas. 
                <a routerLink="/app/comidas/recetario" (click)="closePick()">Ir al recetario</a>
              </li>
            }
          </ul>

          @if (saving()) {
            <div class="pick-modal__saving">
              <i class="pi pi-spin pi-spinner"></i> Guardando…
            </div>
          }
        </div>
      </div>
    }
  `,
    styleUrl: './planificador.component.scss',
})
export class PlanificadorComponent implements OnInit {
    private auth = inject(AuthService);
    private gsap = inject(GsapAnimationsService);
    private mealPlanSvc = inject(MealPlanService);
    private recipeSvc = inject(RecipeService);

    private container = viewChild<ElementRef<HTMLElement>>('container');

    // ── State ─────────────────────────────────────────────────────────────────
    loading = signal(true);
    saving = signal(false);
    plan = signal<MealPlan | null>(null);
    slots = signal<MealPlanSlot[]>([]);
    allRecipes = signal<Recipe[]>([]);
    pickTarget = signal<SlotPickTarget | null>(null);
    pickQuery = signal('');
    currentMonday = signal<Date>(getMonday());

    // ── Computed ──────────────────────────────────────────────────────────────
    readonly mealCols = MEAL_COLS;

    days = computed(() => {
        const monday = this.currentMonday();
        return DOW_NAMES.map((name, i) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const today = new Date();
            const isToday =
                date.getFullYear() === today.getFullYear() &&
                date.getMonth() === today.getMonth() &&
                date.getDate() === today.getDate();
            return {
                dow: i + 1,
                name,
                shortName: name.slice(0, 3),
                isToday,
                dateStr: date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
            };
        });
    });

    weekLabel = computed(() => {
        const monday = this.currentMonday();
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return `${monday.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })} al ${sunday.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    });

    grid = computed<WeekGrid>(() => this.mealPlanSvc.buildGrid(this.slots()));

    summary = computed(() => {
        const pid = this.auth.currentUser()?.id ?? '';
        return this.mealPlanSvc.calcWeeklySummary(this.slots(), pid);
    });

    pickRecipes = computed(() => {
        const q = this.pickQuery().toLowerCase();
        if (!q) return this.allRecipes();
        return this.allRecipes().filter((r) => r.name.toLowerCase().includes(q));
    });

    pickMealLabel = computed(() => {
        const t = this.pickTarget();
        if (!t) return '';
        const meal = MEAL_COLS.find((m) => m.key === t.mealType);
        const day = DOW_NAMES[t.dayOfWeek - 1];
        return `${meal?.label ?? t.mealType} — ${day}`;
    });

    constructor() {
        afterNextRender(() => {
            const c = this.container();
            if (c) this.gsap.animatePageEnter(c.nativeElement);
        });
    }

    async ngOnInit(): Promise<void> {
        await this.loadWeek();
    }

    private async loadWeek(): Promise<void> {
        this.loading.set(true);
        const hid = this.auth.currentUser()?.householdId;
        if (!hid) { this.loading.set(false); return; }

        const weekStart = isoDate(this.currentMonday());
        const [planResult, recipesResult] = await Promise.all([
            this.mealPlanSvc.getActivePlan(hid, weekStart),
            this.recipeSvc.getRecipes(hid),
        ]);

        this.allRecipes.set(recipesResult.data);

        if (planResult.data) {
            this.plan.set(planResult.data);
            const { data: slots } = await this.mealPlanSvc.getSlots(planResult.data.id);
            this.slots.set(slots);
        } else {
            this.plan.set(null);
            this.slots.set([]);
        }
        this.loading.set(false);
    }

    // ── Navegación de semana ──────────────────────────────────────────────────
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

    // ── Plan actions ──────────────────────────────────────────────────────────
    async createPlan(): Promise<void> {
        const hid = this.auth.currentUser()?.householdId;
        const uid = this.auth.currentUser()?.id;
        if (!hid) return;
        this.saving.set(true);
        const { data } = await this.mealPlanSvc.createPlan({
            householdId: hid,
            weekStartDate: isoDate(this.currentMonday()),
            createdBy: uid,
        });
        if (data) this.plan.set(data);
        this.saving.set(false);
    }

    async activatePlan(): Promise<void> {
        const p = this.plan();
        if (!p) return;
        await this.mealPlanSvc.activatePlan(p.id);
        this.plan.set({ ...p, status: 'active' });
    }

    // ── Grid helpers ──────────────────────────────────────────────────────────
    getSlot(dow: number, meal: string): MealPlanSlot | undefined {
        return this.grid()[dow]?.[meal];
    }

    async toggleDone(slot: MealPlanSlot): Promise<void> {
        const newVal = !slot.is_done;
        await this.mealPlanSvc.markDone(slot.id, newVal);
        this.slots.update((list) =>
            list.map((s) => (s.id === slot.id ? { ...s, is_done: newVal } : s))
        );
    }

    async clearSlot(slot: MealPlanSlot): Promise<void> {
        await this.mealPlanSvc.deleteSlot(slot.id);
        this.slots.update((list) => list.filter((s) => s.id !== slot.id));
    }

    // ── Pick modal ────────────────────────────────────────────────────────────
    openPick(dow: number, mealType: string, slot?: MealPlanSlot): void {
        this.pickTarget.set({ dayOfWeek: dow, mealType, currentSlot: slot });
        this.pickQuery.set('');
    }

    closePick(): void { this.pickTarget.set(null); }

    filterPickRecipes(q: string): void { this.pickQuery.set(q); }

    async setSlotType(type: 'free' | 'out' | 'leftovers'): Promise<void> {
        const target = this.pickTarget();
        const plan = this.plan();
        if (!target || !plan) return;
        await this.saveSlot({ planId: plan.id, dayOfWeek: target.dayOfWeek, mealType: target.mealType as never, slotType: type, recipeId: null });
        this.closePick();
    }

    async selectRecipe(recipe: Recipe): Promise<void> {
        const target = this.pickTarget();
        const plan = this.plan();
        if (!target || !plan) return;
        this.saving.set(true);
        await this.saveSlot({
            planId: plan.id,
            dayOfWeek: target.dayOfWeek,
            mealType: target.mealType as never,
            slotType: 'recipe',
            recipeId: recipe.id,
        });
        this.saving.set(false);
        this.closePick();
    }

    private async saveSlot(input: UpsertSlotInput): Promise<void> {
        const { data } = await this.mealPlanSvc.upsertSlot(input);
        if (!data) return;
        // Merge recipe object from allRecipes for display
        const recipe = this.allRecipes().find((r) => r.id === data.recipe_id);
        const enriched: MealPlanSlot = recipe
            ? { ...data, recipe: { id: recipe.id, name: recipe.name, calories: recipe.calories, protein: recipe.protein, carbs: recipe.carbs, fat: recipe.fat, prep_time_min: recipe.prep_time_min, meal_type: recipe.meal_type } }
            : data;
        this.slots.update((list) => {
            const idx = list.findIndex((s) => s.id === enriched.id);
            return idx >= 0
                ? list.map((s, i) => (i === idx ? enriched : s))
                : [...list, enriched];
        });
    }
}
