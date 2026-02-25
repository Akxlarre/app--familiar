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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { RecipeService } from '@core/services/recipe.service';
import type { Recipe } from '@core/models/meals.model';

@Component({
    selector: 'app-receta-detalle',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, DecimalPipe],
    template: `
    <div #container class="detalle">

      <!-- BACK -->
      <a routerLink="/app/comidas/recetario" class="back-link">
        <i class="pi pi-arrow-left"></i> Recetario
      </a>

      @if (loading()) {
        <div class="detalle__loading">
          <i class="pi pi-spin pi-spinner"></i> Cargando receta…
        </div>
      } @else if (!recipe()) {
        <div class="detalle__not-found">
          <span>😕</span>
          <h2>Receta no encontrada</h2>
          <a routerLink="/app/comidas/recetario" class="btn btn-primary">Volver al recetario</a>
        </div>
      } @else {
        <article class="recipe">

          <!-- HERO -->
          <header class="recipe__hero">
            @if (recipe()!.image_path) {
              <img class="recipe__hero-img" [src]="recipe()!.image_path" [alt]="recipe()!.name" />
            } @else {
              <div class="recipe__hero-placeholder">
                <span>{{ recipe()!.name[0] }}</span>
              </div>
            }
            <div class="recipe__hero-overlay">
              <span class="recipe__meal-badge">{{ recipe()!.meal_type }}</span>
              @if (recipe()!.difficulty) {
                <span class="recipe__diff-badge">{{ recipe()!.difficulty }}</span>
              }
            </div>
          </header>

          <!-- MAIN CONTENT -->
          <div class="recipe__content">

            <!-- TÍTULO + META -->
            <div class="recipe__top">
              <div>
                <h1 class="recipe__title">{{ recipe()!.name }}</h1>
                <div class="recipe__chips">
                  @if (recipe()!.prep_time_min) {
                    <span class="chip"><i class="pi pi-clock"></i> {{ recipe()!.prep_time_min }} min</span>
                  }
                  <span class="chip"><i class="pi pi-users"></i> {{ recipe()!.servings }} porciones</span>
                  @for (tag of recipe()!.tags; track tag) {
                    <span class="chip chip--primary">{{ tag }}</span>
                  }
                </div>
              </div>
              <a routerLink="editar" class="btn btn-ghost">
                <i class="pi pi-pencil"></i> Editar
              </a>
            </div>

            <!-- MACROS -->
            @if (recipe()!.calories) {
              <section class="macros-bar" aria-label="Información nutricional por porción">
                <h2 class="section-title">Macros por porción</h2>
                <div class="macros-bar__row">
                  <div class="macro-item">
                    <span class="macro-item__val">{{ recipe()!.calories | number:'1.0-0' }}</span>
                    <span class="macro-item__lbl">kcal</span>
                  </div>
                  @if (recipe()!.protein) {
                    <div class="macro-item">
                      <span class="macro-item__val">{{ recipe()!.protein | number:'1.0-1' }}g</span>
                      <span class="macro-item__lbl">Proteína</span>
                    </div>
                  }
                  @if (recipe()!.carbs) {
                    <div class="macro-item">
                      <span class="macro-item__val">{{ recipe()!.carbs | number:'1.0-1' }}g</span>
                      <span class="macro-item__lbl">Carbos</span>
                    </div>
                  }
                  @if (recipe()!.fat) {
                    <div class="macro-item">
                      <span class="macro-item__val">{{ recipe()!.fat | number:'1.0-1' }}g</span>
                      <span class="macro-item__lbl">Grasas</span>
                    </div>
                  }
                </div>
              </section>
            }

            <!-- DOS COLUMNAS: ingredientes + preparación -->
            <div class="recipe__body">

              <!-- INGREDIENTES -->
              <section class="card ingredients-card" aria-label="Ingredientes">
                <h2 class="section-title">
                  <i class="pi pi-list"></i> Ingredientes
                </h2>
                @if ((recipe()!.ingredients ?? []).length === 0) {
                  <p class="text-muted">Sin ingredientes registrados aún.</p>
                } @else {
                  <ul class="ingredients-list">
                    @for (ing of recipe()!.ingredients ?? []; track ing.id) {
                      <li class="ingredient-item">
                        <span class="ingredient-item__qty">{{ ing.quantity }} {{ ing.unit }}</span>
                        <span class="ingredient-item__name">{{ ing.name }}</span>
                      </li>
                    }
                  </ul>
                }
              </section>

              <!-- PREPARACIÓN -->
              <section class="card instructions-card" aria-label="Preparación">
                <h2 class="section-title">
                  <i class="pi pi-file-edit"></i> Preparación
                </h2>
                @if (recipe()!.instructions) {
                  <div class="instructions-text">{{ recipe()!.instructions }}</div>
                } @else {
                  <p class="text-muted">Sin instrucciones registradas aún.</p>
                }
              </section>
            </div>

            <!-- SOURCE URL -->
            @if (recipe()!.source_url) {
              <div class="source-link">
                <i class="pi pi-link"></i>
                <a [href]="recipe()!.source_url" target="_blank" rel="noopener">
                  Ver receta original
                </a>
              </div>
            }

          </div>
        </article>
      }
    </div>
  `,
    styleUrl: './receta-detalle.component.scss',
})
export class RecetaDetalleComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private gsap = inject(GsapAnimationsService);
    private recipeSvc = inject(RecipeService);

    private container = viewChild<ElementRef<HTMLElement>>('container');

    loading = signal(true);
    recipe = signal<Recipe | null>(null);

    constructor() {
        afterNextRender(() => {
            const c = this.container();
            if (c) this.gsap.animatePageEnter(c.nativeElement);
        });
    }

    async ngOnInit(): Promise<void> {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) { this.loading.set(false); return; }
        const { data } = await this.recipeSvc.getRecipe(id);
        this.recipe.set(data);
        this.loading.set(false);
    }
}
