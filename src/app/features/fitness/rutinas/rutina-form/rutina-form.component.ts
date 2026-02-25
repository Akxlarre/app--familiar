import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { RoutineService } from '@core/services/routine.service';
import { ExerciseService } from '@core/services/exercise.service';
import { AuthService } from '@core/services/auth.service';
import type { Exercise } from '@core/models/fitness.model';
import type { RoutineExerciseWithExercise } from '@core/models/fitness.model';

interface FormExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number | null;
  targetWeight: number | null;
}

const DAYS_OPTIONS = [
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
  { value: '0', label: 'Domingo' },
];

@Component({
  selector: 'app-rutina-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DialogModule,
    DragDropModule,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <a [routerLink]="['/app/fitness/rutinas']" class="text-primary text-sm hover:underline">← Rutinas</a>
      <h1 class="text-2xl font-bold text-primary">{{ isEdit() ? 'Editar rutina' : 'Nueva rutina' }}</h1>

      <form (ngSubmit)="save()" class="flex flex-col gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Nombre *</label>
          <input pInputText [(ngModel)]="name" name="name" class="w-full" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Descripción</label>
          <input pInputText [(ngModel)]="description" name="description" class="w-full" placeholder="Opcional" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Días de la semana</label>
          <div class="flex flex-wrap gap-3">
            @for (d of daysOptions; track d.value) {
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  [value]="d.value"
                  [checked]="activeDays.includes(d.value)"
                  (change)="toggleDay(d.value)"
                />
                <span>{{ d.label }}</span>
              </label>
            }
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium">Ejercicios</label>
            <button type="button" pButton icon="pi pi-plus" label="Agregar" size="small" (click)="openExercisePicker()"></button>
          </div>
          <div cdkDropList (cdkDropListDropped)="drop($event)" class="flex flex-col gap-2">
            @for (item of formExercises(); track item.exerciseId + $index) {
              <div
                cdkDrag
                class="flex items-center gap-2 rounded-lg border border-default bg-surface p-2"
              >
                <span cdkDragHandle class="cursor-grab text-secondary pi pi-bars"></span>
                <span class="flex-1 font-medium truncate">{{ item.exerciseName }}</span>
                <input
                  type="number"
                  [(ngModel)]="item.sets"
                  [ngModelOptions]="{ standalone: true }"
                  min="1"
                  max="20"
                  class="w-14 rounded border border-default px-2 py-1 text-sm"
                  placeholder="Sets"
                />
                <input
                  type="number"
                  [(ngModel)]="item.reps"
                  [ngModelOptions]="{ standalone: true }"
                  min="1"
                  class="w-14 rounded border border-default px-2 py-1 text-sm"
                  placeholder="Reps"
                />
                <input
                  type="number"
                  [(ngModel)]="item.targetWeight"
                  [ngModelOptions]="{ standalone: true }"
                  min="0"
                  step="0.5"
                  class="w-16 rounded border border-default px-2 py-1 text-sm"
                  placeholder="Kg"
                />
                <button
                  type="button"
                  pButton
                  icon="pi pi-trash"
                  severity="danger"
                  size="small"
                  (click)="removeExercise($index)"
                ></button>
              </div>
            }
            @if (formExercises().length === 0) {
              <p class="text-secondary text-sm py-2">Agrega ejercicios con el botón "Agregar"</p>
            }
          </div>
        </div>

        <div class="flex gap-2">
          <button type="submit" pButton label="Guardar" [loading]="saving()"></button>
          <button type="button" pButton label="Cancelar" severity="secondary" (click)="cancel()"></button>
        </div>
      </form>
    </div>

    <p-dialog
      [(visible)]="showPicker"
      header="Seleccionar ejercicio"
      [modal]="true"
      appendTo="body"
      [style]="{ width: 'min(420px, 95vw)' }"
      (onHide)="showPicker = false"
      [draggable]="false"
    >
      <div class="flex flex-col gap-2 max-h-96 overflow-auto">
        @for (ex of pickerExercises(); track ex.id) {
          <button
            type="button"
            class="text-left rounded-lg border border-default bg-surface px-3 py-2 hover:bg-subtle transition"
            (click)="addExercise(ex)"
          >
            <span class="font-medium">{{ ex.name }}</span>
            <span class="text-secondary text-sm ml-2">{{ ex.muscle_group ?? '' }}</span>
          </button>
        }
      </div>
    </p-dialog>
  `,
})
export class RutinaFormComponent implements OnInit {
  private routineService = inject(RoutineService);
  private exerciseService = inject(ExerciseService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly saving = signal(false);
  readonly formExercises = signal<FormExercise[]>([]);
  readonly isEdit = computed(() => !!this.routineId && this.routineId !== 'nueva');
  name = '';
  description = '';
  activeDays: string[] = [];
  routineId: string | null = null;
  showPicker = false;
  readonly pickerExercises = signal<Exercise[]>([]);

  readonly daysOptions = DAYS_OPTIONS;

  ngOnInit(): void {
    this.routineId = this.route.snapshot.paramMap.get('id');
    if (this.routineId && this.routineId !== 'nueva') {
      this.loadRoutine();
    }
  }

  async loadRoutine(): Promise<void> {
    if (!this.routineId) return;
    const { data } = await this.routineService.getRoutine(this.routineId);
    if (!data) return;
    this.name = data.name;
    this.description = data.description ?? '';
    this.activeDays = data.active_days ?? [];
    const exercises = (data.exercises ?? []) as RoutineExerciseWithExercise[];
    this.formExercises.set(
      exercises.map((e) => ({
        exerciseId: e.exercise_id,
        exerciseName: e.exercise?.name ?? 'Ejercicio',
        sets: e.sets,
        reps: e.reps,
        targetWeight: e.target_weight,
      }))
    );
  }

  toggleDay(value: string): void {
    const i = this.activeDays.indexOf(value);
    if (i >= 0) this.activeDays = this.activeDays.filter((_, idx) => idx !== i);
    else this.activeDays = [...this.activeDays, value].sort();
  }

  openExercisePicker(): void {
    const user = this.authService.currentUser();
    this.exerciseService
      .getExercises({ includeCustom: true, householdId: user?.householdId })
      .then(({ data }) => {
        this.pickerExercises.set(data ?? []);
        this.showPicker = true;
      });
  }

  addExercise(ex: Exercise): void {
    this.formExercises.update((list) => [
      ...list,
      { exerciseId: ex.id, exerciseName: ex.name, sets: 3, reps: 10, targetWeight: null },
    ]);
    this.showPicker = false;
  }

  removeExercise(index: number): void {
    this.formExercises.update((list) => list.filter((_, i) => i !== index));
  }

  drop(event: CdkDragDrop<FormExercise[]>): void {
    this.formExercises.update((list) => {
      const copy = [...list];
      moveItemInArray(copy, event.previousIndex, event.currentIndex);
      return copy;
    });
  }

  cancel(): void {
    this.router.navigate(['/app/fitness/rutinas']);
  }

  async save(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user?.id) return;
    const householdId = user.householdId ?? null;
    const exercises = this.formExercises();
    const payload = {
      name: this.name.trim(),
      activeDays: this.activeDays,
      description: this.description.trim() || undefined,
      exercises: exercises.map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets,
        reps: e.reps,
        targetWeight: e.targetWeight,
      })),
    };

    this.saving.set(true);
    if (this.routineId && this.routineId !== 'nueva') {
      const { error: err1 } = await this.routineService.updateRoutine(this.routineId, {
        name: payload.name,
        active_days: payload.activeDays,
        description: payload.description,
      });
      if (err1) {
        this.saving.set(false);
        return;
      }
      const { error: err2 } = await this.routineService.replaceRoutineExercises(this.routineId, payload.exercises);
      this.saving.set(false);
      if (!err2) this.router.navigate(['/app/fitness/rutinas']);
    } else {
      const { error } = await this.routineService.createRoutine({
        profileId: user.id,
        householdId,
        name: payload.name,
        activeDays: payload.activeDays,
        description: payload.description,
        exercises: payload.exercises,
      });
      this.saving.set(false);
      if (!error) this.router.navigate(['/app/fitness/rutinas']);
    }
  }
}
