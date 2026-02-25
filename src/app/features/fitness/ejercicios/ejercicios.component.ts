import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ExerciseService } from '@core/services/exercise.service';
import { AuthService } from '@core/services/auth.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import type { Exercise } from '@core/models/fitness.model';

const MUSCLE_GROUPS: { value: string; label: string }[] = [
  { value: 'chest', label: 'Pecho' },
  { value: 'back', label: 'Espalda' },
  { value: 'legs', label: 'Piernas' },
  { value: 'shoulders', label: 'Hombros' },
  { value: 'arms', label: 'Brazos' },
  { value: 'core', label: 'Core' },
  { value: 'full_body', label: 'Cuerpo completo' },
  { value: 'cardio', label: 'Cardio' },
];

const EQUIPMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'barbell', label: 'Barra' },
  { value: 'dumbbell', label: 'Mancuerna' },
  { value: 'machine', label: 'Máquina' },
  { value: 'cable', label: 'Polea' },
  { value: 'bodyweight', label: 'Peso corporal' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'band', label: 'Banda' },
  { value: 'other', label: 'Otro' },
];

function getMuscleGroupLabel(value: string | null): string {
  if (!value) return '—';
  return MUSCLE_GROUPS.find((g) => g.value === value)?.label ?? value;
}

function getEquipmentLabel(value: string | null): string {
  if (!value) return '—';
  return EQUIPMENT_OPTIONS.find((e) => e.value === value)?.label ?? value;
}

@Component({
  selector: 'app-ejercicios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    SelectModule,
    EmptyStateComponent,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <a routerLink="/app/fitness" class="text-primary text-sm hover:underline">← Cuidado Físico</a>
          <h1 class="text-3xl font-bold text-primary mt-1">Ejercicios</h1>
          <p class="text-secondary">Biblioteca de ejercicios para tus rutinas</p>
        </div>
        <button
          pButton
          icon="pi pi-plus"
          label="Agregar ejercicio"
          (click)="openCustomModal()"
        ></button>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <span class="p-input-icon-left flex-1">
          <i class="pi pi-search"></i>
          <input
            pInputText
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar por nombre..."
            class="w-full"
          />
        </span>
        <div class="flex flex-wrap gap-2 items-center">
          <span class="text-sm text-secondary">Grupo:</span>
          <select
            [(ngModel)]="selectedMuscleGroup"
            (ngModelChange)="loadExercises()"
            class="rounded-lg border border-default bg-surface px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            @for (g of muscleGroups; track g.value) {
              <option [value]="g.value">{{ g.label }}</option>
            }
          </select>
          <span class="text-sm text-secondary ml-2">Equipo:</span>
          <select
            [(ngModel)]="selectedEquipment"
            (ngModelChange)="loadExercises()"
            class="rounded-lg border border-default bg-surface px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            @for (e of equipmentOptions; track e.value) {
              <option [value]="e.value">{{ e.label }}</option>
            }
          </select>
        </div>
      </div>

      @if (loading()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="rounded-xl border border-default bg-surface p-4 h-24 animate-pulse bg-subtle"></div>
          }
        </div>
      } @else {
        @if (filteredExercises().length === 0) {
          <app-empty-state
            message="No hay ejercicios"
            subtitle="Cambia los filtros o agrega un ejercicio personalizado"
            icon="pi pi-bolt"
            [actionLabel]="'Agregar ejercicio'"
            (action)="openCustomModal()"
          />
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (ex of filteredExercises(); track ex.id) {
              <div
                class="rounded-xl border border-default bg-surface p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2"
              >
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-semibold text-primary">{{ ex.name }}</h3>
                  @if (ex.is_custom) {
                    <span class="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Custom</span>
                  }
                </div>
                <div class="flex flex-wrap gap-2 text-sm text-secondary">
                  <span>{{ getMuscleGroupLabel(ex.muscle_group) }}</span>
                  <span>·</span>
                  <span>{{ getEquipmentLabel(ex.equipment) }}</span>
                </div>
                @if (ex.description) {
                  <p class="text-sm text-secondary line-clamp-2">{{ ex.description }}</p>
                }
              </div>
            }
          </div>
        }
      }

      <p-dialog
        [(visible)]="showCustomModal"
        header="Nuevo ejercicio"
        [modal]="true"
        appendTo="body"
        [style]="{ width: 'min(400px, 95vw)' }"
        (onHide)="closeCustomModal()"
        [draggable]="false"
        [resizable]="false"
      >
        <form (ngSubmit)="saveCustomExercise()" class="flex flex-col gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">Nombre *</label>
            <input
              pInputText
              [(ngModel)]="customName"
              name="customName"
              class="w-full"
              required
              placeholder="Ej: Press de banca con banda"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Grupo muscular</label>
            <p-select
              [(ngModel)]="customMuscleGroup"
              name="customMuscleGroup"
              [options]="muscleGroups"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccionar"
              [showClear]="true"
              styleClass="w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Equipo</label>
            <p-select
              [(ngModel)]="customEquipment"
              name="customEquipment"
              [options]="equipmentOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccionar"
              [showClear]="true"
              styleClass="w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Descripción (opcional)</label>
            <input
              pInputText
              [(ngModel)]="customDescription"
              name="customDescription"
              class="w-full"
              placeholder="Notas del ejercicio"
            />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button pButton type="button" label="Cancelar" severity="secondary" (click)="closeCustomModal()"></button>
            <button pButton type="submit" label="Guardar" [loading]="saving()"></button>
          </div>
        </form>
      </p-dialog>
    </div>
  `,
})
export class EjerciciosComponent implements OnInit {
  private exerciseService = inject(ExerciseService);
  private authService = inject(AuthService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly exercises = signal<Exercise[]>([]);
  searchQuery = '';
  selectedMuscleGroup = '';
  selectedEquipment = '';
  showCustomModal = false;
  customName = '';
  customMuscleGroup: string | null = null;
  customEquipment: string | null = null;
  customDescription = '';

  readonly muscleGroups = MUSCLE_GROUPS;
  readonly equipmentOptions = EQUIPMENT_OPTIONS;

  readonly filteredExercises = computed(() => {
    const list = this.exercises();
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) => e.name.toLowerCase().includes(q));
  });

  getMuscleGroupLabel = getMuscleGroupLabel;
  getEquipmentLabel = getEquipmentLabel;

  ngOnInit(): void {
    this.loadExercises();
  }

  async loadExercises(): Promise<void> {
    this.loading.set(true);
    const householdId = this.authService.currentUser()?.householdId;
    const { data, error } = await this.exerciseService.getExercises({
      muscleGroup: this.selectedMuscleGroup || undefined,
      equipment: this.selectedEquipment || undefined,
      search: this.searchQuery.trim() || undefined,
      includeCustom: true,
      householdId: householdId ?? undefined,
    });
    this.loading.set(false);
    if (error) {
      this.exercises.set([]);
      return;
    }
    this.exercises.set(data ?? []);
  }

  openCustomModal(): void {
    this.customName = '';
    this.customMuscleGroup = null;
    this.customEquipment = null;
    this.customDescription = '';
    this.showCustomModal = true;
  }

  closeCustomModal(): void {
    this.showCustomModal = false;
  }

  async saveCustomExercise(): Promise<void> {
    const name = this.customName.trim();
    if (!name) return;
    const householdId = this.authService.currentUser()?.householdId;
    if (!householdId) return;
    this.saving.set(true);
    const { data, error } = await this.exerciseService.createCustom({
      name,
      muscle_group: this.customMuscleGroup ?? undefined,
      equipment: this.customEquipment ?? undefined,
      description: this.customDescription.trim() || undefined,
      householdId,
    });
    this.saving.set(false);
    if (error) return;
    this.closeCustomModal();
    this.loadExercises();
  }
}
