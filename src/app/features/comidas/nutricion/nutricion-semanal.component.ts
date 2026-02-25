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
import { DecimalPipe, PercentPipe } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { MealPlanService } from '@core/services/meal-plan.service';
import type { MealPlanSlot, WeeklyNutritionSummary } from '@core/models/meals.model';

// ─── helpers ─────────────────────────────────────────────────────────────────
function getMondayOfWeek(d: Date): Date {
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function fmtDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

const DOW_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_COLORS: Record<string, string> = {
    breakfast: 'var(--color-primary)',
    lunch: '#06b6d4',
    dinner: '#8b5cf6',
    snack: '#f59e0b',
};

interface DayBar {
    dow: number;
    label: string;
    totalKcal: number;
    segments: Array<{ mealType: string; kcal: number; color: string }>;
}

const GOAL_KCAL = 2000; // kcal/día referencia (configurable en v2)

@Component({
    selector: 'app-nutricion-semanal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, DecimalPipe, PercentPipe],
    template: `
    <div #container class="nutricion-page">

      <!-- BACK -->
      <a routerLink="/app/comidas" class="back-link">
        <i class="pi pi-arrow-left"></i> Comidas
      </a>

      <!-- HEADER -->
      <header class="page-header">
        <div class="page-header__text">
          <h1>Nutrición semanal</h1>
          <p class="text-muted">Estimación basada en las recetas del plan — semana del {{ weekLabel() }}</p>
        </div>
        <div class="page-header__nav">
          <button class="btn btn-ghost btn--sm" (click)="prevWeek()">
            <i class="pi pi-chevron-left"></i>
          </button>
          <button class="btn btn-ghost btn--sm" (click)="goToday()">Hoy</button>
          <button class="btn btn-ghost btn--sm" (click)="nextWeek()">
            <i class="pi pi-chevron-right"></i>
          </button>
        </div>
      </header>

      <!-- LOADING -->
      @if (loading()) {
        <div class="state">
          <i class="pi pi-spin pi-spinner"></i>
          <p>Calculando macros…</p>
        </div>
      } @else if (!summary() || summary()!.daysPlanned === 0) {
        <!-- EMPTY -->
        <div class="state card">
          <span class="state__emoji">🥗</span>
          <h3>Sin datos nutricionales esta semana</h3>
          <p class="text-muted">
            Agrega recetas con macros al planificador para ver el resumen aquí.
          </p>
          <a routerLink="/app/comidas/planificador" class="btn btn-primary">
            <i class="pi pi-calendar"></i> Ir al Planificador
          </a>
        </div>
      } @else {

        <!-- ── KPI STRIP ─────────────────────────────── -->
        <div class="kpi-strip">
          <div class="kpi-card kpi-card--calories">
            <span class="kpi-card__icon">🔥</span>
            <div class="kpi-card__vals">
              <span class="kpi-card__main">{{ summary()!.totalCalories | number:'1.0-0' }}</span>
              <span class="kpi-card__sub">kcal totales</span>
            </div>
            <div class="kpi-card__avg">
              <span class="kpi-card__avg-val">{{ summary()!.avgCaloriesPerDay | number:'1.0-0' }}</span>
              <span class="kpi-card__avg-lbl">kcal / día</span>
            </div>
          </div>

          <div class="kpi-card">
            <span class="kpi-card__icon">💪</span>
            <div class="kpi-card__vals">
              <span class="kpi-card__main">{{ summary()!.totalProteinG | number:'1.0-0' }}g</span>
              <span class="kpi-card__sub">proteína total</span>
            </div>
            <div class="kpi-card__avg">
              <span class="kpi-card__avg-val">{{ summary()!.avgProteinPerDay | number:'1.0-0' }}g</span>
              <span class="kpi-card__avg-lbl">prot / día</span>
            </div>
          </div>

          <div class="kpi-card">
            <span class="kpi-card__icon">🌾</span>
            <div class="kpi-card__vals">
              <span class="kpi-card__main">{{ summary()!.totalCarbsG | number:'1.0-0' }}g</span>
              <span class="kpi-card__sub">carbohidratos</span>
            </div>
          </div>

          <div class="kpi-card">
            <span class="kpi-card__icon">🫒</span>
            <div class="kpi-card__vals">
              <span class="kpi-card__main">{{ summary()!.totalFatG | number:'1.0-0' }}g</span>
              <span class="kpi-card__sub">grasas</span>
            </div>
          </div>
        </div>

        <!-- ── DOS COLUMNAS: DONUT + BARRAS POR DÍA ── -->
        <div class="charts-row">

          <!-- DONUT: DISTRIBUCIÓN DE MACROS -->
          <section class="card donut-card">
            <h2 class="section-title">
              <i class="pi pi-chart-pie"></i> Distribución de macros
            </h2>
            <div class="donut-wrap">
              <div class="donut" [style.background]="donutGradient()">
                <div class="donut__hole">
                  <span class="donut__total">{{ summary()!.totalCalories | number:'1.0-0' }}</span>
                  <span class="donut__lbl">kcal</span>
                </div>
              </div>
            </div>
            <ul class="macro-legend">
              @for (m of macroSlices(); track m.label) {
                <li class="macro-legend__item">
                  <span class="macro-legend__dot" [style.background]="m.color"></span>
                  <span class="macro-legend__label">{{ m.label }}</span>
                  <span class="macro-legend__pct">{{ m.pct | percent:'1.0-0' }}</span>
                  <span class="macro-legend__g text-muted">{{ m.grams | number:'1.0-0' }}g</span>
                </li>
              }
            </ul>
          </section>

          <!-- BARRAS POR DÍA -->
          <section class="card bars-card">
            <h2 class="section-title">
              <i class="pi pi-chart-bar"></i> Calorías por día
            </h2>
            <div class="bars-chart">
              @for (day of dayBars(); track day.dow) {
                <div class="day-col">
                  <div class="day-col__bar-wrap">
                    @if (day.totalKcal === 0) {
                      <div class="day-col__empty"></div>
                    } @else {
                      <div class="day-col__bar"
                           [style.height.%]="barHeightPct(day.totalKcal)"
                           [title]="day.totalKcal + ' kcal'">
                        @for (seg of day.segments; track seg.mealType) {
                          <div class="day-col__segment"
                               [style.flex]="seg.kcal"
                               [style.background]="seg.color"
                               [title]="seg.mealType + ': ' + seg.kcal + ' kcal'">
                          </div>
                        }
                      </div>
                    }
                    <!-- goal line marker -->
                    <div class="goal-line" [style.bottom.%]="goalLinePct()"></div>
                  </div>
                  <span class="day-col__label">{{ day.label }}</span>
                  @if (day.totalKcal > 0) {
                    <span class="day-col__kcal">{{ day.totalKcal | number:'1.0-0' }}</span>
                  }
                </div>
              }
            </div>
            <!-- Leyenda de comidas -->
            <div class="meal-legend">
              @for (m of mealLegend; track m.key) {
                <span class="meal-legend__item">
                  <span class="meal-legend__dot" [style.background]="m.color"></span>
                  {{ m.label }}
                </span>
              }
              <span class="meal-legend__item meal-legend__item--goal">
                <span class="meal-legend__line"></span>
                {{ GOAL_KCAL }} kcal (meta)
              </span>
            </div>
          </section>
        </div>

        <!-- ── PROGRESO SEMANAL ─────────────────────── -->
        <section class="card progress-card">
          <h2 class="section-title">
            <i class="pi pi-check-circle"></i> Días planificados
          </h2>
          <div class="days-progress">
            @for (d of allDays; track d.dow) {
              <div class="day-pip" [class.day-pip--active]="hasDataForDay(d.dow)">
                <span class="day-pip__label">{{ d.label }}</span>
                @if (hasDataForDay(d.dow)) {
                  <i class="pi pi-check"></i>
                }
              </div>
            }
          </div>
          <p class="text-muted" style="margin-top: var(--space-3)">
            {{ summary()!.daysPlanned }} de 7 días con comidas planificadas.
          </p>
        </section>

        <!-- DISCLAIMER -->
        <p class="disclaimer text-muted">
          <i class="pi pi-info-circle"></i>
          Los valores son estimaciones calculadas a partir de los macros registrados en las recetas.
          Los días/comidas sin macros no se incluyen en el cálculo.
        </p>
      }
    </div>
  `,
    styleUrl: './nutricion-semanal.component.scss',
})
export class NutricionSemanalComponent implements OnInit {
    private auth = inject(AuthService);
    private gsap = inject(GsapAnimationsService);
    private mealPlan = inject(MealPlanService);

    private container = viewChild<ElementRef<HTMLElement>>('container');

    // ── Constants ─────────────────────────────────────────────────────────────
    readonly GOAL_KCAL = GOAL_KCAL;
    readonly allDays = DOW_NAMES.map((label, i) => ({ label, dow: i + 1 }));
    readonly mealLegend = [
        { key: 'breakfast', label: 'Desayuno', color: MEAL_COLORS['breakfast'] },
        { key: 'lunch', label: 'Almuerzo', color: MEAL_COLORS['lunch'] },
        { key: 'dinner', label: 'Cena', color: MEAL_COLORS['dinner'] },
        { key: 'snack', label: 'Snack', color: MEAL_COLORS['snack'] },
    ];

    // ── State ─────────────────────────────────────────────────────────────────
    loading = signal(true);
    currentMonday = signal<Date>(getMondayOfWeek(new Date()));
    slots = signal<MealPlanSlot[]>([]);

    // ── Derived ───────────────────────────────────────────────────────────────
    weekLabel = computed(() =>
        this.currentMonday().toLocaleDateString('es-CL', {
            day: 'numeric', month: 'long', year: 'numeric',
        })
    );

    summary = computed((): WeeklyNutritionSummary | null => {
        const uid = this.auth.currentUser()?.id;
        if (!uid || this.slots().length === 0) return null;
        return this.mealPlan.calcWeeklySummary(this.slots(), uid);
    });

    // Macro slices for donut (kcal equivalents: prot*4, carbs*4, fat*9)
    macroSlices = computed(() => {
        const s = this.summary();
        if (!s) return [];
        const protKcal = s.totalProteinG * 4;
        const carbsKcal = s.totalCarbsG * 4;
        const fatKcal = s.totalFatG * 9;
        const total = protKcal + carbsKcal + fatKcal || 1;
        return [
            { label: 'Proteína', color: '#22c55e', grams: s.totalProteinG, pct: protKcal / total },
            { label: 'Carbohidratos', color: '#f59e0b', grams: s.totalCarbsG, pct: carbsKcal / total },
            { label: 'Grasas', color: '#8b5cf6', grams: s.totalFatG, pct: fatKcal / total },
        ];
    });

    donutGradient = computed((): string => {
        const slices = this.macroSlices();
        if (!slices.length) return 'conic-gradient(var(--border-default) 0deg 360deg)';
        let angle = 0;
        const parts = slices.map((s) => {
            const deg = s.pct * 360;
            const part = `${s.color} ${angle}deg ${angle + deg}deg`;
            angle += deg;
            return part;
        });
        return `conic-gradient(${parts.join(', ')})`;
    });

    // Per-day bars
    dayBars = computed((): DayBar[] => {
        const slotList = this.slots();
        return DOW_NAMES.map((label, i) => {
            const dow = i + 1;
            const day = slotList.filter((s) => s.day_of_week === dow && s.recipe);
            const segments = MEAL_ORDER
                .map((mt) => {
                    const s = day.find((sl) => sl.meal_type === mt);
                    return { mealType: mt, kcal: s?.recipe?.calories ?? 0, color: MEAL_COLORS[mt] ?? '#ccc' };
                })
                .filter((sg) => sg.kcal > 0);
            const totalKcal = segments.reduce((acc, sg) => acc + sg.kcal, 0);
            return { dow, label, totalKcal, segments };
        });
    });

    maxDayKcal = computed(() =>
        Math.max(GOAL_KCAL * 1.2, ...this.dayBars().map((d) => d.totalKcal))
    );

    barHeightPct(kcal: number): number {
        return Math.min(100, (kcal / this.maxDayKcal()) * 100);
    }

    goalLinePct(): number {
        return Math.min(100, (GOAL_KCAL / this.maxDayKcal()) * 100);
    }

    hasDataForDay(dow: number): boolean {
        return this.slots().some((s) => s.day_of_week === dow && s.recipe?.calories);
    }

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
        this.slots.set([]);

        const hid = this.auth.currentUser()?.householdId;
        if (!hid) { this.loading.set(false); return; }

        const monday = fmtDate(this.currentMonday());
        const planRes = await this.mealPlan.getActivePlan(hid, monday);
        if (planRes.error || !planRes.data) { this.loading.set(false); return; }

        const slotsRes = await this.mealPlan.getSlots(planRes.data.id);
        this.slots.set(slotsRes.data);

        this.loading.set(false);
    }
}
