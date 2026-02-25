import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    inject,
    signal,
    computed,
    ElementRef,
    viewChild,
    afterNextRender,
} from '@angular/core';
import {
    FormArray,
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { RecipeService } from '@core/services/recipe.service';
import type { Recipe, RecipeMealType, RecipeDifficulty } from '@core/models/meals.model';

interface IngredientRow {
    name: string;
    quantity: number | null;
    unit: string;
}

const MEAL_TYPES: Array<{ value: RecipeMealType; label: string; icon: string }> = [
    { value: 'any', label: 'Cualquier', icon: '🍽️' },
    { value: 'breakfast', label: 'Desayuno', icon: '🌅' },
    { value: 'lunch', label: 'Almuerzo', icon: '☀️' },
    { value: 'dinner', label: 'Cena', icon: '🌙' },
    { value: 'snack', label: 'Snack', icon: '🍎' },
];

const DIFFICULTIES: Array<{ value: RecipeDifficulty; label: string; color: string }> = [
    { value: 'easy', label: 'Fácil', color: '#22c55e' },
    { value: 'medium', label: 'Media', color: '#f59e0b' },
    { value: 'hard', label: 'Difícil', color: '#ef4444' },
];

const COMMON_UNITS = ['g', 'kg', 'ml', 'L', 'taza', 'cdta', 'cda', 'unidad', 'pizca', 'al gusto'];

@Component({
    selector: 'app-receta-form',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
    template: `
    <div #container class="receta-form-page">

      <!-- BACK -->
      <a [routerLink]="isEdit() ? ['/app/comidas/recetario', recipeId()] : '/app/comidas/recetario'"
         class="back-link">
        <i class="pi pi-arrow-left"></i>
        {{ isEdit() ? 'Volver a la receta' : 'Volver al recetario' }}
      </a>

      <!-- HEADER -->
      <header class="form-page__header">
        <div>
          <h1>{{ isEdit() ? 'Editar receta' : 'Nueva receta' }}</h1>
          <p class="text-muted">Completa los datos de tu receta. Los ingredientes se agregan abajo.</p>
        </div>
      </header>

      @if (loadingEdit()) {
        <div class="form-page__loading">
          <i class="pi pi-spin pi-spinner"></i> Cargando receta…
        </div>
      } @else {
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="receta-form" novalidate>

        <!-- ── SECCIÓN 1: DATOS BÁSICOS ──────────────────────────────── -->
        <section class="form-section card">
          <h2 class="form-section__title">
            <i class="pi pi-info-circle"></i> Datos básicos
          </h2>

          <!-- Nombre -->
          <div class="field" [class.field--error]="touched('name') && form.get('name')?.invalid">
            <label class="field__label" for="rf-name">Nombre de la receta *</label>
            <input
              id="rf-name"
              type="text"
              class="field__input"
              formControlName="name"
              placeholder="Ej: Pasta con salsa de tomate"
              autocomplete="off"
            />
            @if (touched('name') && form.get('name')?.hasError('required')) {
              <span class="field__error">El nombre es obligatorio</span>
            }
          </div>

          <!-- Tipo de comida -->
          <div class="field">
            <label class="field__label">Tipo de comida</label>
            <div class="meal-type-grid">
              @for (mt of mealTypes; track mt.value) {
                <button
                  type="button"
                  class="meal-type-btn"
                  [class.meal-type-btn--active]="form.get('meal_type')?.value === mt.value"
                  (click)="form.get('meal_type')?.setValue(mt.value)"
                >
                  <span class="meal-type-btn__icon">{{ mt.icon }}</span>
                  <span>{{ mt.label }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Dificultad + Tiempo + Porciones -->
          <div class="field-row">
            <div class="field">
              <label class="field__label">Dificultad</label>
              <div class="diff-group">
                @for (d of difficulties; track d.value) {
                  <button
                    type="button"
                    class="diff-btn"
                    [class.diff-btn--active]="form.get('difficulty')?.value === d.value"
                    (click)="form.get('difficulty')?.setValue(d.value)"
                  >{{ d.label }}</button>
                }
              </div>
            </div>

            <div class="field">
              <label class="field__label" for="rf-prep">Tiempo preparación (min)</label>
              <input
                id="rf-prep"
                type="number"
                class="field__input"
                formControlName="prep_time_min"
                placeholder="30"
                min="1"
              />
            </div>

            <div class="field">
              <label class="field__label" for="rf-servings">Porciones *</label>
              <input
                id="rf-servings"
                type="number"
                class="field__input"
                formControlName="servings"
                min="1"
                max="50"
              />
            </div>
          </div>

          <!-- Tags -->
          <div class="field">
            <label class="field__label">Etiquetas</label>
            <div class="tags-input">
              <div class="tags-input__chips">
                @for (tag of tags(); track tag) {
                  <span class="tag-chip">
                    {{ tag }}
                    <button type="button" (click)="removeTag(tag)" class="tag-chip__remove">
                      <i class="pi pi-times"></i>
                    </button>
                  </span>
                }
                <input
                  #tagInput
                  type="text"
                  class="tags-input__field"
                  placeholder="Agregar tag + Enter"
                  (keydown.enter)="addTag(tagInput.value); tagInput.value = ''; $event.preventDefault()"
                  (keydown.comma)="addTag(tagInput.value); tagInput.value = ''; $event.preventDefault()"
                />
              </div>
            </div>
            <p class="field__hint">Ej: alto proteína, vegetariano, rápido — presiona Enter para agregar</p>
          </div>

          <!-- URL Fuente -->
          <div class="field">
            <label class="field__label" for="rf-source">URL de la receta original (opcional)</label>
            <input
              id="rf-source"
              type="url"
              class="field__input"
              formControlName="source_url"
              placeholder="https://..."
            />
          </div>
        </section>

        <!-- ── SECCIÓN 2: INGREDIENTES ──────────────────────────────── -->
        <section class="form-section card">
          <header class="form-section__header">
            <h2 class="form-section__title">
              <i class="pi pi-list"></i> Ingredientes
            </h2>
            <button type="button" class="btn btn-ghost btn--sm" (click)="addIngredient()">
              <i class="pi pi-plus"></i> Añadir
            </button>
          </header>

          <div formArrayName="ingredients" class="ingredients-list">
            @if (ingredientsArray.length === 0) {
              <p class="ingredients-empty">
                <i class="pi pi-info-circle"></i>
                No hay ingredientes. Haz clic en "Añadir" para empezar.
              </p>
            }
            @for (ing of ingredientsArray.controls; track $index; let i = $index) {
              <div [formGroupName]="i" class="ingredient-row">
                <div class="ingredient-row__qty">
                  <input
                    type="number"
                    formControlName="quantity"
                    class="field__input"
                    placeholder="100"
                    min="0"
                    step="0.1"
                    [attr.aria-label]="'Cantidad ingrediente ' + (i + 1)"
                  />
                </div>
                <div class="ingredient-row__unit">
                  <select formControlName="unit" class="field__select"
                          [attr.aria-label]="'Unidad ingrediente ' + (i + 1)">
                    @for (u of units; track u) {
                      <option [value]="u">{{ u }}</option>
                    }
                  </select>
                </div>
                <div class="ingredient-row__name">
                  <input
                    type="text"
                    formControlName="name"
                    class="field__input"
                    placeholder="Nombre del ingrediente"
                    [attr.aria-label]="'Nombre ingrediente ' + (i + 1)"
                  />
                </div>
                <button
                  type="button"
                  class="ingredient-row__remove"
                  (click)="removeIngredient(i)"
                  [attr.aria-label]="'Eliminar ingrediente ' + (i + 1)"
                >
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            }
          </div>
        </section>

        <!-- ── SECCIÓN 3: PREPARACIÓN ──────────────────────────────── -->
        <section class="form-section card">
          <h2 class="form-section__title">
            <i class="pi pi-file-edit"></i> Preparación
          </h2>
          <div class="field">
            <label class="field__label" for="rf-instructions">Instrucciones paso a paso</label>
            <textarea
              id="rf-instructions"
              class="field__input field__input--textarea"
              formControlName="instructions"
              rows="8"
              placeholder="1. Hervir agua con sal...&#10;2. Agregar la pasta..."
            ></textarea>
          </div>
        </section>

        <!-- ── SECCIÓN 4: MACROS ────────────────────────────────────── -->
        <section class="form-section card">
          <h2 class="form-section__title">
            <i class="pi pi-chart-pie"></i> Información nutricional
            <span class="form-section__subtitle">por porción — opcional</span>
          </h2>
          <div class="field-row field-row--4">
            <div class="field">
              <label class="field__label" for="rf-cal">Calorías (kcal)</label>
              <input id="rf-cal" type="number" class="field__input" formControlName="calories"
                     min="0" placeholder="350" />
            </div>
            <div class="field">
              <label class="field__label" for="rf-prot">Proteínas (g)</label>
              <input id="rf-prot" type="number" class="field__input" formControlName="protein"
                     min="0" step="0.1" placeholder="25" />
            </div>
            <div class="field">
              <label class="field__label" for="rf-carbs">Carbohidratos (g)</label>
              <input id="rf-carbs" type="number" class="field__input" formControlName="carbs"
                     min="0" step="0.1" placeholder="40" />
            </div>
            <div class="field">
              <label class="field__label" for="rf-fat">Grasas (g)</label>
              <input id="rf-fat" type="number" class="field__input" formControlName="fat"
                     min="0" step="0.1" placeholder="10" />
            </div>
          </div>

          <!-- Preview macros -->
          @if (caloriesPreview() > 0) {
            <div class="macros-preview">
              <div class="mp-item">
                <span class="mp-item__val">{{ caloriesPreview() }}</span>
                <span class="mp-item__lbl">kcal</span>
              </div>
              @if (form.get('protein')?.value) {
                <div class="mp-item">
                  <span class="mp-item__val">{{ form.get('protein')?.value | number:'1.0-1' }}g</span>
                  <span class="mp-item__lbl">Proteína</span>
                </div>
              }
              @if (form.get('carbs')?.value) {
                <div class="mp-item">
                  <span class="mp-item__val">{{ form.get('carbs')?.value | number:'1.0-1' }}g</span>
                  <span class="mp-item__lbl">Carbos</span>
                </div>
              }
              @if (form.get('fat')?.value) {
                <div class="mp-item">
                  <span class="mp-item__val">{{ form.get('fat')?.value | number:'1.0-1' }}g</span>
                  <span class="mp-item__lbl">Grasas</span>
                </div>
              }
            </div>
          }
        </section>

        <!-- ── ERROR GLOBAL ────────────────────────────────────────── -->
        @if (saveError()) {
          <div class="alert alert--error">
            <i class="pi pi-exclamation-triangle"></i>
            {{ saveError() }}
          </div>
        }

        <!-- ── ACCIONES ────────────────────────────────────────────── -->
        <div class="form-actions">
          <a [routerLink]="isEdit() ? ['/app/comidas/recetario', recipeId()] : '/app/comidas/recetario'"
             class="btn btn-ghost">
            Cancelar
          </a>
          @if (isEdit()) {
            <button type="button" class="btn btn-danger" (click)="onDelete()" [disabled]="saving()">
              <i class="pi pi-trash"></i> Eliminar
            </button>
          }
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            @if (saving()) {
              <i class="pi pi-spin pi-spinner"></i> Guardando…
            } @else {
              <i class="pi pi-check"></i>
              {{ isEdit() ? 'Guardar cambios' : 'Crear receta' }}
            }
          </button>
        </div>

      </form>
      }
    </div>

    <!-- CONFIRM DELETE MODAL -->
    @if (showDeleteConfirm()) {
      <div class="modal-backdrop" (click)="showDeleteConfirm.set(false)">
        <div class="confirm-modal" (click)="$event.stopPropagation()" role="alertdialog">
          <div class="confirm-modal__icon"><i class="pi pi-exclamation-triangle"></i></div>
          <h3>¿Eliminar esta receta?</h3>
          <p class="text-muted">Esta acción no se puede deshacer. Los slots del planificador que la usen quedarán vacíos.</p>
          <div class="confirm-modal__actions">
            <button class="btn btn-ghost" (click)="showDeleteConfirm.set(false)">Cancelar</button>
            <button class="btn btn-danger" (click)="confirmDelete()" [disabled]="saving()">
              <i class="pi pi-trash"></i> Sí, eliminar
            </button>
          </div>
        </div>
      </div>
    }
  `,
    styleUrl: './receta-form.component.scss',
})
export class RecetaFormComponent implements OnInit {
    private fb = inject(FormBuilder);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private auth = inject(AuthService);
    private gsap = inject(GsapAnimationsService);
    private recipeSvc = inject(RecipeService);

    private container = viewChild<ElementRef<HTMLElement>>('container');

    readonly mealTypes = MEAL_TYPES;
    readonly difficulties = DIFFICULTIES;
    readonly units = COMMON_UNITS;

    // ── State ─────────────────────────────────────────────────────────────────
    loadingEdit = signal(false);
    saving = signal(false);
    saveError = signal<string | null>(null);
    tags = signal<string[]>([]);
    showDeleteConfirm = signal(false);
    recipeId = signal<string | null>(null);

    isEdit = computed(() => !!this.recipeId());

    caloriesPreview = computed(() => {
        const v = this.form?.get('calories')?.value;
        return v ? Math.round(Number(v)) : 0;
    });

    // ── Form ──────────────────────────────────────────────────────────────────
    form: FormGroup = this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(120)]],
        meal_type: ['any'],
        difficulty: ['medium'],
        prep_time_min: [null],
        servings: [2, [Validators.required, Validators.min(1)]],
        source_url: [null],
        instructions: [null],
        calories: [null],
        protein: [null],
        carbs: [null],
        fat: [null],
        ingredients: this.fb.array([]),
    });

    get ingredientsArray(): FormArray {
        return this.form.get('ingredients') as FormArray;
    }

    constructor() {
        afterNextRender(() => {
            const c = this.container();
            if (c) this.gsap.animatePageEnter(c.nativeElement);
        });
    }

    async ngOnInit(): Promise<void> {
        const id = this.route.snapshot.paramMap.get('id');
        if (id && id !== 'nueva') {
            this.recipeId.set(id);
            await this.loadRecipe(id);
        }
    }

    private async loadRecipe(id: string): Promise<void> {
        this.loadingEdit.set(true);
        const { data } = await this.recipeSvc.getRecipe(id);
        if (!data) { this.loadingEdit.set(false); return; }

        // Patch form
        this.form.patchValue({
            name: data.name,
            meal_type: data.meal_type,
            difficulty: data.difficulty ?? 'medium',
            prep_time_min: data.prep_time_min,
            servings: data.servings,
            source_url: data.source_url,
            instructions: data.instructions,
            calories: data.calories,
            protein: data.protein,
            carbs: data.carbs,
            fat: data.fat,
        });
        this.tags.set([...data.tags]);

        // Patch ingredients
        (data.ingredients ?? []).forEach((ing) => {
            this.ingredientsArray.push(this.buildIngredientGroup({
                name: ing.name, quantity: ing.quantity, unit: ing.unit,
            }));
        });

        this.loadingEdit.set(false);
    }

    // ── Ingredients ───────────────────────────────────────────────────────────
    private buildIngredientGroup(val?: Partial<IngredientRow>): FormGroup {
        return this.fb.group({
            name: [val?.name ?? '', Validators.required],
            quantity: [val?.quantity ?? null],
            unit: [val?.unit ?? 'g'],
        });
    }

    addIngredient(): void {
        this.ingredientsArray.push(this.buildIngredientGroup());
    }

    removeIngredient(i: number): void {
        this.ingredientsArray.removeAt(i);
    }

    // ── Tags ──────────────────────────────────────────────────────────────────
    addTag(raw: string): void {
        const tag = raw.trim().toLowerCase().replace(/,$/, '');
        if (tag && !this.tags().includes(tag)) {
            this.tags.update((t) => [...t, tag]);
        }
    }

    removeTag(tag: string): void {
        this.tags.update((t) => t.filter((x) => x !== tag));
    }

    // ── Form helpers ──────────────────────────────────────────────────────────
    touched(field: string): boolean {
        return !!this.form.get(field)?.touched;
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    async onSubmit(): Promise<void> {
        this.form.markAllAsTouched();
        if (this.form.invalid) return;

        this.saving.set(true);
        this.saveError.set(null);

        const v = this.form.value;
        const ingredients = (v.ingredients as IngredientRow[]).map((ing, idx) => ({
            name: ing.name.trim(),
            quantity: Number(ing.quantity) || 0,
            unit: ing.unit,
            sortOrder: idx,
        }));

        const hid = this.auth.currentUser()?.householdId;
        const uid = this.auth.currentUser()?.id;

        if (this.isEdit()) {
            const { error } = await this.recipeSvc.updateRecipe(this.recipeId()!, {
                name: v.name,
                mealType: v.meal_type,
                difficulty: v.difficulty,
                prepTimeMin: v.prep_time_min ? Number(v.prep_time_min) : null,
                servings: Number(v.servings),
                tags: this.tags(),
                sourceUrl: v.source_url || null,
                instructions: v.instructions || null,
                calories: v.calories ? Number(v.calories) : null,
                protein: v.protein ? Number(v.protein) : null,
                carbs: v.carbs ? Number(v.carbs) : null,
                fat: v.fat ? Number(v.fat) : null,
            });
            if (error) { this.saveError.set(error.message); this.saving.set(false); return; }
            await this.recipeSvc.setIngredients(this.recipeId()!, ingredients);
            this.router.navigate(['/app/comidas/recetario', this.recipeId()]);
        } else {
            if (!hid) { this.saveError.set('No se encontró el hogar.'); this.saving.set(false); return; }
            const { data, error } = await this.recipeSvc.createRecipe({
                householdId: hid,
                name: v.name,
                mealType: v.meal_type,
                difficulty: v.difficulty,
                prepTimeMin: v.prep_time_min ? Number(v.prep_time_min) : undefined,
                servings: Number(v.servings),
                tags: this.tags(),
                sourceUrl: v.source_url || null,
                instructions: v.instructions || null,
                createdBy: uid,
            });
            if (error || !data) { this.saveError.set(error?.message ?? 'Error al crear.'); this.saving.set(false); return; }
            await this.recipeSvc.setIngredients(data.id, ingredients);
            this.router.navigate(['/app/comidas/recetario', data.id]);
        }

        this.saving.set(false);
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    onDelete(): void { this.showDeleteConfirm.set(true); }

    async confirmDelete(): Promise<void> {
        if (!this.recipeId()) return;
        this.saving.set(true);
        await this.recipeSvc.deleteRecipe(this.recipeId()!);
        this.router.navigate(['/app/comidas/recetario']);
    }
}
