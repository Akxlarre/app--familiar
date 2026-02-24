import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { WorkoutSessionService } from '@core/services/workout-session.service';
import { RestTimerComponent } from './components/rest-timer/rest-timer.component';
import { RoutineService } from '@core/services/routine.service';
import { ExerciseService } from '@core/services/exercise.service';
import { AuthService } from '@core/services/auth.service';
import type { WorkoutSession, WorkoutSetWithExercise, Exercise } from '@core/models/fitness.model';
import type { RoutineExerciseWithExercise } from '@core/models/fitness.model';

interface ExerciseRow {
  exerciseId: string;
  exerciseName: string;
  /** Si el ejercicio fue reemplazado, nombre del ejercicio original de la rutina. */
  originalExerciseName?: string;
  routineExerciseId: string | null;
  exerciseNote: string | null;
  targetSets: number;
  targetReps: number | null;
  previousSets: { weight: number | null; reps: number | null; rpe?: number | null }[];
  currentSets: WorkoutSetWithExercise[];
  suggestWeight: number | null;
}

@Component({
  selector: 'app-sesion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, FormsModule, ButtonModule, InputNumberModule, DialogModule, RestTimerComponent],
  template: `
    <div class="flex flex-col gap-4 pb-24">
      <a routerLink="/app/fitness" class="text-primary text-sm hover:underline">← Cuidado Físico</a>

      @if (mode() === 'start') {
        <h1 class="text-2xl font-bold">Iniciar sesión</h1>
        @if (loading()) {
          <p class="text-secondary">Cargando...</p>
        } @else {
          <div class="flex flex-col gap-3">
            @if (routines().length === 0) {
              <p class="text-secondary">No tienes rutinas. <a routerLink="/app/fitness/rutinas/nueva" class="text-primary underline">Crea una</a>.</p>
            } @else {
              @for (r of routines(); track r.id) {
                <button
                  type="button"
                  class="rounded-xl border border-default bg-surface p-4 text-left hover:shadow-md transition"
                  (click)="startWithRoutine(r.id)"
                >
                  <span class="font-semibold">{{ r.name }}</span>
                  <span class="text-secondary text-sm ml-2">{{ r.exercises?.length ?? 0 }} ejercicios</span>
                </button>
              }
            }
          </div>
        }
      } @else {
        @if (session(); as s) {
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-3">
              <h1 class="text-xl font-bold">{{ s.routine?.name ?? 'Sesión libre' }}</h1>
              <span class="text-lg font-mono text-primary tabular-nums">{{ elapsedTime() }}</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                pButton
                icon="pi pi-clock"
                label="Temporizador"
                severity="secondary"
                (click)="showRestTimer.set(true)"
              ></button>
              <button pButton icon="pi pi-check" label="TERMINAR" severity="success" (click)="openSummary()"></button>
            </div>
          </div>

          <div class="rounded-xl border border-default bg-surface p-4">
            <label class="block text-sm font-medium text-secondary mb-1">Nota del entrenamiento</label>
            <textarea
              [ngModel]="sessionNotes()"
              (ngModelChange)="onSessionNoteChange($event)"
              (blur)="saveSessionNote()"
              rows="2"
              placeholder="Notas generales de la sesión..."
              class="w-full rounded-lg border border-default bg-transparent px-3 py-2 text-sm resize-none"
            ></textarea>
          </div>

          @if (exerciseRows().length === 0 && !loadingRoutine()) {
            <p class="text-secondary">Cargando ejercicios...</p>
          }
          @for (row of exerciseRows(); track row.routineExerciseId ?? row.exerciseId) {
            <div class="rounded-xl border border-default bg-surface p-4 flex flex-col gap-3">
              <div class="flex items-center justify-between gap-2">
                <h2 class="font-semibold text-primary">{{ row.exerciseName }}</h2>
                @if (row.routineExerciseId) {
                  <button
                    pButton
                    icon="pi pi-exchange"
                    [rounded]="true"
                    severity="secondary"
                    size="small"
                    (click)="openReplaceExerciseDialog(row)"
                    aria-label="Reemplazar ejercicio"
                  ></button>
                }
              </div>
              <div class="flex items-center gap-2">
                <label class="text-sm text-secondary shrink-0">Nota / objetivo:</label>
                <input
                  type="text"
                  [ngModel]="exerciseNoteDisplay(row)"
                  (ngModelChange)="setExerciseNoteDraft(row.exerciseId, $event)"
                  (blur)="saveExerciseNote(row)"
                  placeholder="ej. 8-12"
                  class="flex-1 max-w-32 rounded border border-default px-2 py-1 text-sm"
                />
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                  <thead>
                    <tr class="text-left text-secondary border-b border-default">
                      <th class="py-1 pr-2">SERIE</th>
                      <th class="py-1 pr-2">ANTERIOR</th>
                      <th class="py-1 pr-2 w-20">KG</th>
                      <th class="py-1 pr-2 w-24">REPETICIONES</th>
                      <th class="py-1 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (set of row.currentSets; track set.id) {
                      <tr class="border-b border-default/50">
                        <td class="py-1 pr-2">{{ set.set_number }}</td>
                        <td class="py-1 pr-2 text-secondary">
                          @if (row.previousSets[set.set_number - 1]; as prev) {
                            {{ prev.weight ?? '—' }} kg × {{ prev.reps ?? '—' }}
                            @if (prev.rpe != null) { @ {{ prev.rpe }}
                            }
                          } @else { — }
                        </td>
                        <td class="py-1 pr-2 font-medium">{{ set.weight ?? '—' }}</td>
                        <td class="py-1 pr-2">{{ set.reps ?? '—' }}</td>
                        <td class="py-1">
                          <span class="text-primary" aria-hidden="true">✓</span>
                        </td>
                      </tr>
                    }
                    <tr>
                      <td class="py-2 pr-2 align-middle">{{ row.currentSets.length + 1 }}</td>
                      <td class="py-2 pr-2 text-secondary">
                        @if (row.previousSets[row.currentSets.length]; as prev) {
                          {{ prev.weight ?? '—' }} kg × {{ prev.reps ?? '—' }}
                          @if (prev.rpe != null) { @ {{ prev.rpe }}
                          }
                        } @else { — }
                      </td>
                      <td class="py-2 pr-2">
                        <input
                          type="number"
                          [(ngModel)]="inputWeight[row.exerciseId]"
                          placeholder="Kg"
                          min="0"
                          step="0.5"
                          class="w-full rounded border border-default px-2 py-1"
                        />
                      </td>
                      <td class="py-2 pr-2">
                        <input
                          type="number"
                          [(ngModel)]="inputReps[row.exerciseId]"
                          placeholder="Reps"
                          min="1"
                          class="w-full rounded border border-default px-2 py-1"
                        />
                      </td>
                      <td class="py-2">
                        <button
                          pButton
                          icon="pi pi-check"
                          [rounded]="true"
                          size="small"
                          (click)="addSet(row)"
                          aria-label="Añadir serie"
                        ></button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button
                pButton
                label="Añadir serie"
                icon="pi pi-plus"
                severity="secondary"
                size="small"
                class="w-fit"
                (click)="addSet(row)"
              ></button>
            </div>
          }

          @if (session()?.routine_id) {
            <button
              pButton
              icon="pi pi-plus"
              label="Añadir ejercicio a la sesión"
              severity="secondary"
              (click)="openAddExerciseDialog()"
            ></button>
          }

          @if (restSeconds() !== null) {
            <div
              class="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-contrast px-6 py-3 text-xl font-bold shadow-lg"
            >
              Descanso: {{ restSeconds() }} s
            </div>
          }
        }
      }
    </div>

    <p-dialog
      [(visible)]="showSummaryModal"
      header="Resumen de sesión"
      [modal]="true"
      [style]="{ width: 'min(400px, 95vw)' }"
      (onHide)="onSummaryClose()"
      [draggable]="false"
    >
      @if (session(); as s) {
        <div class="flex flex-col gap-3">
          <p><strong>Duración:</strong> {{ formatDuration(summaryDuration()) }}</p>
          <p><strong>Volumen total:</strong> {{ summaryVolume() }} kg</p>
          @if (summaryPrs().length > 0) {
            <p><strong>PRs:</strong> {{ summaryPrs().join(', ') }}</p>
          }
          @if (finishError()) {
            <p class="text-error text-sm">{{ finishError() }}</p>
          }
          <div class="flex flex-wrap gap-2 pt-2">
            <button pButton label="Cerrar sesión" (click)="confirmFinish()" [loading]="finishing()"></button>
            <button pButton label="Seguir entrenando" severity="secondary" (click)="onSummaryClose()"></button>
            <button pButton label="Cancelar sesión" severity="danger" (click)="confirmCancelSession()"></button>
          </div>
        </div>
      }
    </p-dialog>

    <app-rest-timer
      [visible]="showRestTimer()"
      (closed)="showRestTimer.set(false)"
    ></app-rest-timer>

    <p-dialog
      [(visible)]="showAddExerciseModal"
      header="Añadir ejercicio a la sesión"
      [modal]="true"
      [style]="{ width: 'min(400px, 95vw)' }"
      [draggable]="false"
    >
      <p class="text-secondary text-sm mb-2">El ejercicio quedará solo en esta sesión. Al terminar podrás agregarlo a la rutina.</p>
      <div class="flex flex-col gap-1 max-h-64 overflow-auto">
        @for (ex of exercisesForPick(); track ex.id) {
          <button
            type="button"
            class="rounded-lg border border-default bg-surface px-3 py-2 text-left hover:bg-subtle transition"
            (click)="addSessionOnlyExercise(ex); showAddExerciseModal = false"
          >
            {{ ex.name }}
          </button>
        }
      </div>
    </p-dialog>

    <p-dialog
      [(visible)]="showReplaceExerciseModal"
      header="Reemplazar ejercicio"
      [modal]="true"
      [style]="{ width: 'min(400px, 95vw)' }"
      [draggable]="false"
    >
      <p class="text-secondary text-sm mb-2">Al terminar la sesión podrás elegir si mantener este cambio en la rutina.</p>
      <div class="flex flex-col gap-1 max-h-64 overflow-auto">
        @for (ex of exercisesForPick(); track ex.id) {
          <button
            type="button"
            class="rounded-lg border border-default bg-surface px-3 py-2 text-left hover:bg-subtle transition"
            (click)="replaceExerciseWith(ex); showReplaceExerciseModal = false"
          >
            {{ ex.name }}
          </button>
        }
      </div>
    </p-dialog>

    <p-dialog
      [(visible)]="showPostFinishRoutineOptions"
      header="Opciones para la rutina"
      [modal]="true"
      [closable]="false"
      [style]="{ width: 'min(420px, 95vw)' }"
      [draggable]="false"
    >
      @if (sessionOnlyExerciseIds().length > 0) {
        <p class="font-medium mb-1">Ejercicios añadidos solo en esta sesión:</p>
        <p class="text-secondary text-sm mb-2">{{ sessionOnlyNamesForFinish() }}</p>
        <p class="mb-2">¿Agregarlos a la rutina?</p>
        <div class="flex gap-2 mb-4">
          <button pButton label="Sí, agregar a la rutina" (click)="addSessionOnlyToRoutine()"></button>
          <button pButton label="No, solo esta sesión" severity="secondary" (click)="skipAddToRoutine()"></button>
        </div>
      }
      @if (replacementRowsForFinish().length > 0) {
        <p class="font-medium mb-1">Reemplazos realizados:</p>
        <p class="text-secondary text-sm mb-2">{{ replacementSummaryForFinish() }}</p>
        <p class="mb-2">¿Mantener estos cambios en la rutina?</p>
        <div class="flex gap-2 mb-4">
          <button pButton label="Sí, mantener en la rutina" (click)="applyReplacementsToRoutine()"></button>
          <button pButton label="No, solo esta sesión" severity="secondary" (click)="skipReplacements()"></button>
        </div>
      }
      @if ((sessionOnlyExerciseIds().length === 0 || postFinishSessionOnlyHandled()) && (replacementRowsForFinish().length === 0 || postFinishReplacementsHandled())) {
        <div class="flex justify-end">
          <button pButton label="Listo" (click)="closePostFinishAndNavigate()"></button>
        </div>
      }
    </p-dialog>
  `,
})
export class SesionComponent implements OnInit, OnDestroy {
  private workoutSessionService = inject(WorkoutSessionService);
  private routineService = inject(RoutineService);
  private exerciseService = inject(ExerciseService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly loadingRoutine = signal(false);
  readonly finishing = signal(false);
  readonly finishError = signal<string | null>(null);
  readonly mode = signal<'start' | 'active'>('start');
  readonly session = signal<WorkoutSession | null>(null);
  readonly routines = signal<{ id: string; name: string; exercises?: unknown[] }[]>([]);
  readonly previousSession = signal<WorkoutSession | null>(null);
  readonly exerciseRows = signal<ExerciseRow[]>([]);
  /** IDs de ejercicios añadidos durante la sesión (no estaban en la rutina). */
  readonly sessionOnlyExerciseIds = signal<string[]>([]);
  readonly restSeconds = signal<number | null>(null);
  readonly sessionNotes = signal('');
  readonly showRestTimer = signal(false);
  readonly postFinishSessionOnlyHandled = signal(false);
  readonly postFinishReplacementsHandled = signal(false);
  showSummaryModal = false;
  showAddExerciseModal = false;
  showReplaceExerciseModal = false;
  showPostFinishRoutineOptions = false;
  replaceTargetRow: ExerciseRow | null = null;
  /** routineExerciseId -> { exerciseId, name } del ejercicio por el que se reemplazó. */
  replacementByRoutineExerciseId: Record<string, { exerciseId: string; name: string }> = {};
  exercisesForPick = signal<Exercise[]>([]);

  /** Tick cada segundo para que el tiempo transcurrido se actualice en vivo. */
  readonly elapsedTick = signal(0);

  inputWeight: Record<string, number> = {};
  inputReps: Record<string, number> = {};
  exerciseNoteDraft: Record<string, string> = {};
  private restInterval: ReturnType<typeof setInterval> | null = null;
  private elapsedInterval: ReturnType<typeof setInterval> | null = null;
  private REST_DURATION = 90;
  private sessionNoteSaveTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly elapsedTime = computed(() => {
    this.elapsedTick(); // dependencia para re-ejecutar cada segundo
    const s = this.session();
    if (!s?.started_at) return '0:00';
    const start = new Date(s.started_at).getTime();
    const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
    const sec = Math.floor((end - start) / 1000);
    const m = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${m}:${secs.toString().padStart(2, '0')}`;
  });

  readonly summaryDuration = computed(() => {
    this.elapsedTick(); // mismo tick que la cabecera: se actualiza cada segundo mientras la sesión sigue activa
    const s = this.session();
    if (!s?.started_at) return 0;
    const start = new Date(s.started_at).getTime();
    const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
    return Math.round((end - start) / 1000);
  });

  readonly summaryVolume = computed(() => {
    const s = this.session();
    const sets = (s as WorkoutSession & { sets?: WorkoutSetWithExercise[] })?.sets ?? [];
    return sets.reduce((acc, set) => acc + (set.weight ?? 0) * (set.reps ?? 0), 0);
  });

  readonly summaryPrs = computed(() => {
    const s = this.session();
    const sets = (s as WorkoutSession & { sets?: WorkoutSetWithExercise[] })?.sets ?? [];
    return sets.filter((set) => set.is_pr).map((set) => set.exercise?.name ?? 'Set').slice(0, 5);
  });

  readonly sessionOnlyNamesForFinish = computed(() => {
    const ids = new Set(this.sessionOnlyExerciseIds());
    return this.exerciseRows()
      .filter((r) => ids.has(r.exerciseId))
      .map((r) => r.exerciseName)
      .join(', ') || '—';
  });

  readonly replacementRowsForFinish = computed(() => {
    return this.exerciseRows().filter((r) => r.routineExerciseId && r.originalExerciseName);
  });

  readonly replacementSummaryForFinish = computed(() => {
    return this.replacementRowsForFinish()
      .map((r) => `${r.originalExerciseName} → ${r.exerciseName}`)
      .join('; ') || '—';
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const user = this.authService.currentUser();
    if (!user?.id) return;
    if (id) {
      this.loadSession(id);
    } else {
      this.workoutSessionService.getActiveSession(user.id).then(async ({ data }) => {
        if (data) {
          this.router.navigate(['/app/fitness/sesion', data.id]);
          return;
        }
        const routineId = this.route.snapshot.queryParamMap.get('routineId');
        if (routineId) {
          this.loading.set(true);
          const { data: started } = await this.workoutSessionService.startSession(user.id, routineId, user.householdId ?? null);
          this.loading.set(false);
          if (started) this.router.navigate(['/app/fitness/sesion', started.id]);
          else this.loadRoutinesForStart(user.id, user.householdId ?? null);
        } else {
          this.loadRoutinesForStart(user.id, user.householdId ?? null);
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.restInterval) clearInterval(this.restInterval);
    this.restInterval = null;
    if (this.elapsedInterval) clearInterval(this.elapsedInterval);
    this.elapsedInterval = null;
    if (this.sessionNoteSaveTimeout) clearTimeout(this.sessionNoteSaveTimeout);
  }

  private startElapsedTimer(): void {
    if (this.elapsedInterval) return;
    this.elapsedTick.set(0);
    this.elapsedInterval = setInterval(() => this.elapsedTick.update((t) => t + 1), 1000);
  }

  async loadRoutinesForStart(profileId: string, householdId: string | null): Promise<void> {
    this.loading.set(true);
    const { data } = await this.routineService.getRoutinesByProfile(profileId, householdId);
    this.loading.set(false);
    this.routines.set(data ?? []);
  }

  async startWithRoutine(routineId: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user?.id) return;
    const householdId = user.householdId ?? null;
    this.loading.set(true);
    const { data, error } = await this.workoutSessionService.startSession(user.id, routineId, householdId);
    this.loading.set(false);
    if (error || !data) return;
    this.router.navigate(['/app/fitness/sesion', data.id]);
  }

  async loadSession(sessionId: string): Promise<void> {
    const { data: session, error } = await this.workoutSessionService.getSession(sessionId);
    if (error || !session) {
      this.mode.set('start');
      return;
    }
    if (session.status !== 'in_progress') {
      this.router.navigate(['/app/fitness']);
      return;
    }
    this.session.set(session);
    this.sessionNotes.set(session.notes ?? '');
    this.mode.set('active');
    this.startElapsedTimer();
    const routineId = session.routine_id;
    if (!routineId) {
      this.buildRowsFromSets(session);
      return;
    }
    this.loadingRoutine.set(true);
    const { data: routine } = await this.routineService.getRoutine(routineId);
    const { data: prev } = await this.workoutSessionService.getPreviousSessionWithSets(
      session.profile_id,
      routineId
    );
    this.previousSession.set(prev ?? null);
    this.buildRows(session, routine, prev);
    this.inferSessionOnlyExerciseIds(session, routine);
    this.applySessionOnlyAndReplacements(session, prev);
    this.loadingRoutine.set(false);
  }

  private buildRowsFromSets(session: WorkoutSession): void {
    const sets = (session as WorkoutSession & { sets?: WorkoutSetWithExercise[] }).sets ?? [];
    const byExercise = new Map<string, WorkoutSetWithExercise[]>();
    for (const set of sets) {
      const list = byExercise.get(set.exercise_id) ?? [];
      list.push(set);
      byExercise.set(set.exercise_id, list);
    }
    const rows: ExerciseRow[] = [];
    byExercise.forEach((currentSets, exerciseId) => {
      const first = currentSets[0];
      const name = first.exercise?.name ?? 'Ejercicio';
      rows.push({
        exerciseId,
        exerciseName: name,
        routineExerciseId: null,
        exerciseNote: null,
        targetSets: 3,
        targetReps: null,
        previousSets: [],
        currentSets: currentSets.sort((a, b) => a.set_number - b.set_number),
        suggestWeight: null,
      });
    });
    this.exerciseRows.set(rows);
  }

  private buildRows(
    session: WorkoutSession,
    routine: { exercises?: RoutineExerciseWithExercise[] } | null,
    prev: WorkoutSession | null
  ): void {
    const exercises = routine?.exercises ?? [];
    const prevSets = (prev as WorkoutSession & { sets?: WorkoutSetWithExercise[] })?.sets ?? [];
    const currSets = (session as WorkoutSession & { sets?: WorkoutSetWithExercise[] }).sets ?? [];
    const prevByEx = new Map<string, { weight: number | null; reps: number | null; rpe?: number | null }[]>();
    for (const s of prevSets) {
      const list = prevByEx.get(s.exercise_id) ?? [];
      list.push({ weight: s.weight, reps: s.reps, rpe: (s as { rpe?: number | null }).rpe });
      prevByEx.set(s.exercise_id, list);
    }
    const currByEx = new Map<string, WorkoutSetWithExercise[]>();
    for (const s of currSets) {
      const list = currByEx.get(s.exercise_id) ?? [];
      list.push(s);
      currByEx.set(s.exercise_id, list);
    }
    const repl = this.replacementByRoutineExerciseId;
    const rows: ExerciseRow[] = exercises.map((ex) => {
      const replacement = repl[ex.id];
      const currentExerciseId = replacement ? replacement.exerciseId : ex.exercise_id;
      const currentName = replacement ? replacement.name : (ex.exercise?.name ?? 'Ejercicio');
      const previousSets = prevByEx.get(currentExerciseId) ?? prevByEx.get(ex.exercise_id) ?? [];
      const currentSets = (currByEx.get(currentExerciseId) ?? currByEx.get(ex.exercise_id) ?? []).sort((a, b) => a.set_number - b.set_number);
      let suggestWeight: number | null = null;
      if (previousSets.length > 0 && currentSets.length >= (ex.sets ?? 3)) {
        const lastPrev = previousSets[previousSets.length - 1];
        if (lastPrev.weight != null) suggestWeight = 2.5;
      }
      return {
        exerciseId: currentExerciseId,
        exerciseName: currentName,
        originalExerciseName: replacement ? (ex.exercise?.name ?? 'Ejercicio') : undefined,
        routineExerciseId: ex.id,
        exerciseNote: ex.notes ?? null,
        targetSets: ex.sets ?? 3,
        targetReps: ex.reps,
        previousSets,
        currentSets,
        suggestWeight,
      };
    });
    this.exerciseRows.set(rows);
  }

  private inferSessionOnlyExerciseIds(session: WorkoutSession, routine: { exercises?: RoutineExerciseWithExercise[] } | null): void {
    const sets = (session as WorkoutSession & { sets?: WorkoutSetWithExercise[] }).sets ?? [];
    const routineIds = new Set((routine?.exercises ?? []).map((e) => e.exercise_id));
    const only = [...new Set(sets.map((s) => s.exercise_id).filter((id) => !routineIds.has(id)))];
    this.sessionOnlyExerciseIds.set(only);
  }

  private applySessionOnlyAndReplacements(session: WorkoutSession, prev: WorkoutSession | null): void {
    const currSets = (session as WorkoutSession & { sets?: WorkoutSetWithExercise[] }).sets ?? [];
    const prevSets = (prev as WorkoutSession & { sets?: WorkoutSetWithExercise[] })?.sets ?? [];
    const currByEx = new Map<string, WorkoutSetWithExercise[]>();
    for (const s of currSets) {
      const list = currByEx.get(s.exercise_id) ?? [];
      list.push(s);
      currByEx.set(s.exercise_id, list);
    }
    const prevByEx = new Map<string, { weight: number | null; reps: number | null; rpe?: number | null }[]>();
    for (const s of prevSets) {
      const list = prevByEx.get(s.exercise_id) ?? [];
      list.push({ weight: s.weight, reps: s.reps, rpe: (s as { rpe?: number | null }).rpe });
      prevByEx.set(s.exercise_id, list);
    }
    const ids = this.sessionOnlyExerciseIds();
    const currentRowIds = new Set(this.exerciseRows().map((r) => r.exerciseId));
    const toAdd: ExerciseRow[] = [];
    for (const exerciseId of ids) {
      if (currentRowIds.has(exerciseId)) continue;
      const currentSets = (currByEx.get(exerciseId) ?? []).sort((a, b) => a.set_number - b.set_number);
      const first = currentSets[0];
      const name = first?.exercise?.name ?? 'Ejercicio';
      toAdd.push({
        exerciseId,
        exerciseName: name,
        routineExerciseId: null,
        exerciseNote: null,
        targetSets: 3,
        targetReps: null,
        previousSets: prevByEx.get(exerciseId) ?? [],
        currentSets,
        suggestWeight: null,
      });
      currentRowIds.add(exerciseId);
    }
    if (toAdd.length > 0) this.exerciseRows.update((rows) => [...rows, ...toAdd]);
  }

  async addSet(row: ExerciseRow): Promise<void> {
    const s = this.session();
    if (!s) return;
    const weight = this.inputWeight[row.exerciseId] ?? row.suggestWeight ?? 0;
    const reps = this.inputReps[row.exerciseId] ?? row.targetReps ?? 10;
    if (reps < 1) return;
    const setNumber = row.currentSets.length + 1;
    const user = this.authService.currentUser();
    if (!user?.id) return;
    const { data: set, isPr, error } = await this.workoutSessionService.addSet({
      workoutSessionId: s.id,
      exerciseId: row.exerciseId,
      setNumber,
      weight,
      reps,
      isPr: false,
    });
    if (error) return;
    if (isPr) { /* TODO: animación celebración PR */ }
    this.inputWeight[row.exerciseId] = weight + 2.5;
    this.inputReps[row.exerciseId] = reps;
    this.refreshSession();
  }

  private startRestTimer(): void {
    if (this.restInterval) clearInterval(this.restInterval);
    this.restSeconds.set(this.REST_DURATION);
    this.restInterval = setInterval(() => {
      const n = this.restSeconds();
      if (n === null || n <= 1) {
        if (this.restInterval) clearInterval(this.restInterval);
        this.restInterval = null;
        this.restSeconds.set(null);
        return;
      }
      this.restSeconds.set(n - 1);
    }, 1000);
  }

  private async refreshSession(): Promise<void> {
    const s = this.session();
    if (!s?.id) return;
    const { data } = await this.workoutSessionService.getSession(s.id);
    if (data) {
      this.session.set(data);
      const routineId = data.routine_id;
      if (routineId) {
        const { data: routine } = await this.routineService.getRoutine(routineId);
        this.buildRows(data, routine, this.previousSession());
        this.applySessionOnlyAndReplacements(data, this.previousSession());
      } else {
        this.buildRowsFromSets(data);
      }
    }
  }

  openSummary(): void {
    this.showSummaryModal = true;
  }

  onSummaryClose(): void {
    this.showSummaryModal = false;
    this.finishError.set(null);
  }

  async confirmCancelSession(): Promise<void> {
    const s = this.session();
    if (!s?.id) return;
    if (!confirm('¿Cancelar sesión? Se perderán los datos de esta sesión.')) return;
    const { error } = await this.workoutSessionService.cancelSession(s.id);
    if (error) {
      this.finishError.set(error instanceof Error ? error.message : 'No se pudo cancelar la sesión.');
      return;
    }
    this.showSummaryModal = false;
    this.router.navigate(['/app/fitness']);
  }

  async confirmFinish(): Promise<void> {
    const s = this.session();
    if (!s?.id) return;
    this.finishing.set(true);
    const { data, error } = await this.workoutSessionService.finishSession(s.id, this.sessionNotes() || null);
    this.finishing.set(false);
    if (error) {
      this.finishError.set(error instanceof Error ? error.message : 'No se pudo terminar la sesión.');
      return;
    }
    this.finishError.set(null);
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
      this.elapsedInterval = null;
    }
    this.session.set(data ?? null);
    this.showSummaryModal = false;
    const hasSessionOnly = this.sessionOnlyExerciseIds().length > 0;
    const hasReplacements = this.replacementRowsForFinish().length > 0;
    if (hasSessionOnly || hasReplacements) {
      this.postFinishSessionOnlyHandled.set(false);
      this.postFinishReplacementsHandled.set(false);
      this.showPostFinishRoutineOptions = true;
    } else {
      this.router.navigate(['/app/fitness']);
    }
  }

  async openAddExerciseDialog(): Promise<void> {
    const user = this.authService.currentUser();
    const { data } = await this.exerciseService.getExercises({
      includeCustom: true,
      householdId: user?.householdId ?? undefined,
    });
    const currentIds = new Set(this.exerciseRows().map((r) => r.exerciseId));
    this.exercisesForPick.set((data ?? []).filter((ex) => !currentIds.has(ex.id)));
    this.showAddExerciseModal = true;
  }

  addSessionOnlyExercise(ex: Exercise): void {
    if (this.sessionOnlyExerciseIds().includes(ex.id)) return;
    this.sessionOnlyExerciseIds.update((ids) => [...ids, ex.id]);
    const s = this.session();
    const prev = this.previousSession();
    const currSets = (s as WorkoutSession & { sets?: WorkoutSetWithExercise[] })?.sets ?? [];
    const prevSets = (prev as WorkoutSession & { sets?: WorkoutSetWithExercise[] })?.sets ?? [];
    const currentSets = (currSets.filter((set) => set.exercise_id === ex.id) ?? []).sort((a, b) => a.set_number - b.set_number);
    const prevByEx: { weight: number | null; reps: number | null; rpe?: number | null }[] = [];
    for (const set of prevSets) {
      if (set.exercise_id === ex.id) prevByEx.push({ weight: set.weight, reps: set.reps, rpe: (set as { rpe?: number | null }).rpe });
    }
    const row: ExerciseRow = {
      exerciseId: ex.id,
      exerciseName: ex.name,
      routineExerciseId: null,
      exerciseNote: null,
      targetSets: 3,
      targetReps: null,
      previousSets: prevByEx,
      currentSets,
      suggestWeight: null,
    };
    this.exerciseRows.update((rows) => [...rows, row]);
  }

  openReplaceExerciseDialog(row: ExerciseRow): void {
    if (!row.routineExerciseId) return;
    this.replaceTargetRow = row;
    this.exerciseService.getExercises({ includeCustom: true, householdId: this.authService.currentUser()?.householdId ?? undefined }).then(({ data }) => {
      this.exercisesForPick.set(data ?? []);
      this.showReplaceExerciseModal = true;
    });
  }

  replaceExerciseWith(ex: Exercise): void {
    const row = this.replaceTargetRow;
    if (!row?.routineExerciseId) return;
    this.replacementByRoutineExerciseId[row.routineExerciseId] = { exerciseId: ex.id, name: ex.name };
    this.exerciseRows.update((rows) =>
      rows.map((r) =>
        r.routineExerciseId === row.routineExerciseId
          ? { ...r, exerciseId: ex.id, exerciseName: ex.name, originalExerciseName: row.exerciseName }
          : r
      )
    );
    this.replaceTargetRow = null;
  }

  async addSessionOnlyToRoutine(): Promise<void> {
    const s = this.session();
    const routineId = s?.routine_id;
    if (!routineId || !s) return;
    const { data: routine } = await this.routineService.getRoutine(routineId);
    const sortStart = (routine?.exercises?.length ?? 0);
    const ids = this.sessionOnlyExerciseIds();
    for (let i = 0; i < ids.length; i++) {
      await this.routineService.addExerciseToRoutine(routineId, ids[i], 3, null, null, sortStart + i);
    }
    this.postFinishSessionOnlyHandled.set(true);
  }

  skipAddToRoutine(): void {
    this.postFinishSessionOnlyHandled.set(true);
  }

  async applyReplacementsToRoutine(): Promise<void> {
    const rows = this.replacementRowsForFinish();
    for (const r of rows) {
      if (!r.routineExerciseId) continue;
      const repl = this.replacementByRoutineExerciseId[r.routineExerciseId];
      if (repl) await this.routineService.updateRoutineExercise(r.routineExerciseId, { exercise_id: repl.exerciseId });
    }
    this.postFinishReplacementsHandled.set(true);
  }

  skipReplacements(): void {
    this.postFinishReplacementsHandled.set(true);
  }

  closePostFinishAndNavigate(): void {
    this.showPostFinishRoutineOptions = false;
    this.router.navigate(['/app/fitness']);
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  exerciseNoteDisplay(row: ExerciseRow): string {
    return this.exerciseNoteDraft[row.exerciseId] ?? row.exerciseNote ?? '';
  }

  setExerciseNoteDraft(exerciseId: string, value: string): void {
    this.exerciseNoteDraft[exerciseId] = value;
  }

  onSessionNoteChange(value: string): void {
    this.sessionNotes.set(value);
    if (this.sessionNoteSaveTimeout) clearTimeout(this.sessionNoteSaveTimeout);
    this.sessionNoteSaveTimeout = setTimeout(() => this.saveSessionNote(), 800);
  }

  saveSessionNote(): void {
    if (this.sessionNoteSaveTimeout) {
      clearTimeout(this.sessionNoteSaveTimeout);
      this.sessionNoteSaveTimeout = null;
    }
    const s = this.session();
    if (!s?.id) return;
    this.workoutSessionService.updateSessionNotes(s.id, this.sessionNotes() || null);
  }

  async saveExerciseNote(row: ExerciseRow): Promise<void> {
    const value = (this.exerciseNoteDraft[row.exerciseId] ?? row.exerciseNote ?? '').trim() || null;
    if (row.routineExerciseId) {
      await this.routineService.updateRoutineExercise(row.routineExerciseId, { notes: value });
    }
    this.exerciseRows.update((rows) =>
      rows.map((r) =>
        r.exerciseId === row.exerciseId ? { ...r, exerciseNote: value } : r
      )
    );
    delete this.exerciseNoteDraft[row.exerciseId];
  }
}
