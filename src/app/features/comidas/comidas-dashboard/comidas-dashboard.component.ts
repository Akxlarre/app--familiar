import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  inject,
  signal,
  computed,
  afterNextRender,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { MealPlanService } from '@core/services/meal-plan.service';
import { RecipeService } from '@core/services/recipe.service';
import type { MealPlanSlot, WeekGrid } from '@core/models/meals.model';

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MEAL_LABELS: Record<string, string> = {
  breakfast: '🌅 Desayuno',
  lunch: '☀️ Almuerzo',
  dinner: '🌙 Cena',
  snack: '🍎 Snack',
};

@Component({
  selector: 'app-comidas-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <main #container class="comidas-dash">

      <!-- ── HEADER ─────────────────────────────────────────────── -->
      <header class="comidas-dash__header">
        <div class="comidas-dash__header-text">
          <h1>Comidas</h1>
          <p class="text-muted">Plan de esta semana y accesos rápidos</p>
        </div>
        <div class="comidas-dash__header-actions">
          <a routerLink="recetario" class="btn btn-ghost">
            <i class="pi pi-book"></i> Recetario
          </a>
          <a routerLink="planificador" class="btn btn-primary">
            <i class="pi pi-calendar"></i> Planificar semana
          </a>
        </div>
      </header>

      <!-- ── BENTO GRID ─────────────────────────────────────────── -->
      <section #grid class="bento-grid" aria-label="Módulo de comidas">

        <!-- KPIs -->
        <article class="card card-tinted bento-1x1">
          <div class="card__icon"><i class="pi pi-book"></i></div>
          <div class="kpi">
            <span class="kpi__value">{{ stats().recipes }}</span>
            <span class="kpi__label">Recetas</span>
          </div>
        </article>

        <article class="card card-tinted bento-1x1">
          <div class="card__icon"><i class="pi pi-calendar-check"></i></div>
          <div class="kpi">
            <span class="kpi__value">{{ stats().planned }}</span>
            <span class="kpi__label">Comidas planificadas</span>
          </div>
        </article>

        <article class="card card-tinted bento-1x1">
          <div class="card__icon"><i class="pi pi-check-circle"></i></div>
          <div class="kpi">
            <span class="kpi__value">{{ stats().done }}</span>
            <span class="kpi__label">Ya cocinadas</span>
          </div>
        </article>

        <article class="card card-tinted bento-1x1">
          <div class="card__icon"><i class="pi pi-fire"></i></div>
          <div class="kpi">
            <span class="kpi__value">{{ stats().avgCal }}</span>
            <span class="kpi__label">kcal prom./día</span>
          </div>
        </article>

        <!-- MENÚ HOY — hero -->
        <article class="card card-accent bento-4x1 today-card">
          <header class="card__header">
            <div class="card__icon"><i class="pi pi-sun"></i></div>
            <div class="card__meta">
              <h2 class="card__title">Menú de hoy — {{ todayName() }}</h2>
              <span class="card__badge">{{ todayDate() }}</span>
            </div>
          </header>
          <div class="today-slots">
            @for (entry of todaySlots(); track entry.meal) {
              <div class="today-slot" [class.today-slot--done]="entry.done">
                <span class="today-slot__label">{{ entry.mealLabel }}</span>
                @if (entry.recipeName) {
                  <span class="today-slot__recipe">{{ entry.recipeName }}</span>
                } @else {
                  <span class="today-slot__empty">Sin planificar</span>
                }
                @if (entry.done) {
                  <i class="pi pi-check today-slot__check"></i>
                }
              </div>
            }
          </div>
        </article>

        <!-- RESUMEN SEMANA — 2x2 -->
        <article class="card bento-2x2 week-card">
          <header class="card__header">
            <div class="card__icon"><i class="pi pi-calendar"></i></div>
            <div class="card__meta">
              <h3 class="card__title">Esta semana</h3>
              <a routerLink="planificador" class="card__link">Ver planificador →</a>
            </div>
          </header>
          <div class="week-grid-mini">
            @for (day of weekDays(); track day.num) {
              <div class="week-day" [class.week-day--today]="day.isToday">
                <span class="week-day__name">{{ day.short }}</span>
                @for (slot of day.slots; track slot.meal) {
                  <div
                    class="week-day__dot"
                    [class.week-day__dot--filled]="slot.hasRecipe"
                    [class.week-day__dot--done]="slot.done"
                    [class.week-day__dot--free]="slot.free"
                    [title]="slot.label"
                  ></div>
                }
              </div>
            }
          </div>
          @if (loading()) {
            <div class="week-card__loading">
              <i class="pi pi-spin pi-spinner"></i> Cargando plan…
            </div>
          } @else if (!hasPlan()) {
            <div class="week-card__empty">
              <p>No hay plan activo para esta semana.</p>
              <a routerLink="planificador" class="btn btn-primary btn--sm">
                Crear plan →
              </a>
            </div>
          }
        </article>

        <!-- ACCESOS RÁPIDOS — 2x2 -->
        <article class="card bento-2x2 quick-access">
          <header class="card__header">
            <div class="card__icon"><i class="pi pi-bolt"></i></div>
            <h3 class="card__title">Accesos rápidos</h3>
          </header>
          <div class="quick-access__grid">
            <a routerLink="recetario" class="qa-item">
              <div class="qa-item__icon"><i class="pi pi-book"></i></div>
              <span>Recetario</span>
            </a>
            <a routerLink="planificador" class="qa-item">
              <div class="qa-item__icon"><i class="pi pi-calendar"></i></div>
              <span>Planificador</span>
            </a>
            <a routerLink="lista-compras" class="qa-item">
              <div class="qa-item__icon"><i class="pi pi-shopping-cart"></i></div>
              <span>Lista de compras</span>
            </a>
            <a routerLink="nutricion" class="qa-item">
              <div class="qa-item__icon"><i class="pi pi-chart-pie"></i></div>
              <span>Nutrición semanal</span>
            </a>
          </div>
        </article>

      </section>
    </main>
  `,
  styleUrl: './comidas-dashboard.component.scss',
})
export class ComidasDashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private gsap = inject(GsapAnimationsService);
  private mealPlanSvc = inject(MealPlanService);
  private recipeSvc = inject(RecipeService);

  private grid = viewChild<ElementRef<HTMLElement>>('grid');

  loading = signal(true);
  slots = signal<MealPlanSlot[]>([]);
  recipeCount = signal(0);
  hasPlan = signal(false);

  readonly todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay(); // 1=Lun…7=Dom

  todayName = computed(() => DAY_NAMES[this.todayDow - 1]);
  todayDate = computed(() =>
    new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
  );

  stats = computed(() => {
    const s = this.slots();
    const planned = s.filter((sl) => sl.slot_type === 'recipe' && sl.recipe_id).length;
    const done = s.filter((sl) => sl.is_done).length;
    const cals = s
      .filter((sl) => sl.recipe?.calories)
      .map((sl) => sl.recipe!.calories!)
      .reduce((a, b) => a + b, 0);
    const days = new Set(s.map((sl) => sl.day_of_week)).size || 1;
    return {
      recipes: this.recipeCount(),
      planned,
      done,
      avgCal: Math.round(cals / days),
    };
  });

  todaySlots = computed(() => {
    const todayEntries = this.slots().filter((s) => s.day_of_week === this.todayDow);
    return ['breakfast', 'lunch', 'dinner', 'snack'].map((meal) => {
      const slot = todayEntries.find((s) => s.meal_type === meal);
      return {
        meal,
        mealLabel: MEAL_LABELS[meal],
        recipeName: slot?.recipe?.name ?? null,
        done: slot?.is_done ?? false,
      };
    });
  });

  weekDays = computed(() => {
    const grid = this.mealPlanSvc.buildGrid(this.slots());
    return DAY_NAMES.map((name, i) => {
      const dow = i + 1;
      const daySlots = grid[dow] ?? {};
      return {
        num: dow,
        short: name.slice(0, 2),
        isToday: dow === this.todayDow,
        slots: ['breakfast', 'lunch', 'dinner'].map((meal) => {
          const s = daySlots[meal];
          return {
            meal,
            label: MEAL_LABELS[meal],
            hasRecipe: s?.slot_type === 'recipe' && !!s.recipe_id,
            done: s?.is_done ?? false,
            free: s?.slot_type === 'free' || s?.slot_type === 'out',
          };
        }),
      };
    });
  });

  constructor() {
    afterNextRender(() => {
      const g = this.grid();
      if (g) this.gsap.animateBentoGrid(g.nativeElement);
    });
  }

  async ngOnInit(): Promise<void> {
    const hid = this.auth.currentUser()?.householdId;
    if (!hid) { this.loading.set(false); return; }

    // Cargar en paralelo: plan activo + conteo de recetas
    const [planResult, recipesResult] = await Promise.all([
      this.mealPlanSvc.getActivePlan(hid),
      this.recipeSvc.getRecipes(hid, { limit: 1 }),
    ]);

    // Total de recetas (query solo para contar)
    const { data: allRecipes } = await this.recipeSvc.getRecipes(hid);
    this.recipeCount.set(allRecipes.length);

    if (planResult.data) {
      this.hasPlan.set(true);
      const { data: slots } = await this.mealPlanSvc.getSlots(planResult.data.id);
      this.slots.set(slots);
    }

    this.loading.set(false);
  }
}
