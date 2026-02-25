import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { RecipeService } from '@core/services/recipe.service';
import type { Recipe, RecipeMealType } from '@core/models/meals.model';

const MEAL_TYPE_LABELS: Record<string, string> = {
  any: 'Cualquier comida',
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
};
const DIFFICULTY_LABELS: Record<string, string> = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };
const MEAL_TYPES: Array<{ value: RecipeMealType; label: string }> = [
  { value: 'any', label: 'Todas' },
  { value: 'breakfast', label: 'Desayuno' },
  { value: 'lunch', label: 'Almuerzo' },
  { value: 'dinner', label: 'Cena' },
  { value: 'snack', label: 'Snack' },
];

@Component({
  selector: 'app-recetario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, DecimalPipe],
  template: `
    <main #container class="recetario">

      <!-- HEADER -->
      <header class="recetario__header">
        <div>
          <h1>Recetario del Hogar</h1>
          <p class="text-muted">{{ recipes().length }} recetas guardadas</p>
        </div>
        <a routerLink="nueva" class="btn btn-primary">
          <i class="pi pi-plus"></i> Nueva receta
        </a>
      </header>

      <!-- FILTROS -->
      <nav class="recetario__filters" aria-label="Filtrar recetas">
        @for (t of mealTypes; track t.value) {
          <button
            class="filter-chip"
            [class.filter-chip--active]="activeFilter() === t.value"
            (click)="setFilter(t.value)"
          >{{ t.label }}</button>
        }
        <div class="filter-search">
          <i class="pi pi-search"></i>
          <input
            type="search"
            placeholder="Buscar receta…"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch($event)"
            aria-label="Buscar receta"
          />
        </div>
      </nav>

      <!-- ESTADOS -->
      @if (loading()) {
        <div class="recetario__state">
          <i class="pi pi-spin pi-spinner"></i>
          <p>Cargando recetas…</p>
        </div>
      } @else if (filtered().length === 0) {
        <div class="recetario__state">
          <span class="recetario__state-emoji">🍳</span>
          <h3>Aún no hay recetas aquí</h3>
          <p class="text-muted">Agrega tu primera receta para empezar a planificar la semana.</p>
          <a routerLink="nueva" class="btn btn-primary">Agregar receta</a>
        </div>
      } @else {
        <!-- GRID DE RECETAS -->
        <section #grid class="recipes-grid" aria-label="Lista de recetas">
          @for (recipe of filtered(); track recipe.id) {
            <article class="recipe-card">
              <!-- imagen o placeholder -->
              <div class="recipe-card__thumb">
                @if (recipe.image_path) {
                  <img [src]="recipe.image_path" [alt]="recipe.name" loading="lazy" />
                } @else {
                  <div class="recipe-card__thumb-placeholder">
                    <span>{{ recipe.name[0] }}</span>
                  </div>
                }
                <div class="recipe-card__meal-badge">{{ mealLabel(recipe.meal_type) }}</div>
              </div>

              <div class="recipe-card__body">
                <h3 class="recipe-card__name">{{ recipe.name }}</h3>

                <div class="recipe-card__meta">
                  @if (recipe.prep_time_min) {
                    <span class="meta-chip">
                      <i class="pi pi-clock"></i>{{ recipe.prep_time_min }} min
                    </span>
                  }
                  @if (recipe.difficulty) {
                    <span class="meta-chip">{{ diffLabel(recipe.difficulty) }}</span>
                  }
                  @if (recipe.protein) {
                    <span class="meta-chip macro">{{ recipe.protein | number:'1.0-0' }}g prot</span>
                  }
                </div>

                @if (recipe.tags.length > 0) {
                  <div class="recipe-card__tags">
                    @for (tag of recipe.tags.slice(0, 3); track tag) {
                      <span class="tag">{{ tag }}</span>
                    }
                  </div>
                }
              </div>

              <div class="recipe-card__footer">
                <a [routerLink]="['/app/comidas/recetario', recipe.id]" class="btn btn-ghost btn--sm">
                  Ver receta
                </a>
                <div class="macro-summary" title="Calorías por porción">
                  @if (recipe.calories) {
                    <span>🔥 {{ recipe.calories | number:'1.0-0' }} kcal</span>
                  }
                </div>
              </div>
            </article>
          }
        </section>
      }
    </main>
  `,
  styleUrl: './recetario.component.scss',
})
export class RecetarioComponent implements OnInit {
  private auth = inject(AuthService);
  private gsap = inject(GsapAnimationsService);
  private recipeSvc = inject(RecipeService);

  private container = viewChild<ElementRef<HTMLElement>>('container');

  readonly mealTypes = MEAL_TYPES;
  loading = signal(true);
  recipes = signal<Recipe[]>([]);
  activeFilter = signal<RecipeMealType>('any');
  searchQuery = '';
  filtered = signal<Recipe[]>([]);

  constructor() {
    afterNextRender(() => {
      const c = this.container();
      if (c) this.gsap.animatePageEnter(c.nativeElement);
    });
  }

  async ngOnInit(): Promise<void> {
    const hid = this.auth.currentUser()?.householdId;
    if (!hid) { this.loading.set(false); return; }
    const { data } = await this.recipeSvc.getRecipes(hid);
    this.recipes.set(data);
    this.applyFilter();
    this.loading.set(false);
  }

  setFilter(type: RecipeMealType): void {
    this.activeFilter.set(type);
    this.applyFilter();
  }

  onSearch(_q: string): void { this.applyFilter(); }

  private applyFilter(): void {
    let list = this.recipes();
    const f = this.activeFilter();
    if (f !== 'any') list = list.filter((r) => r.meal_type === f || r.meal_type === 'any');
    const q = this.searchQuery.toLowerCase().trim();
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q));
    this.filtered.set(list);
  }

  mealLabel(t: string): string { return MEAL_TYPE_LABELS[t] ?? t; }
  diffLabel(d: string): string { return DIFFICULTY_LABELS[d] ?? d; }
}
