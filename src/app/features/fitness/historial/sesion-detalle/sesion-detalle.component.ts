import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WorkoutSessionService } from '@core/services/workout-session.service';
import type { WorkoutSession } from '@core/models/fitness.model';
import type { WorkoutSetWithExercise } from '@core/models/fitness.model';

@Component({
  selector: 'app-sesion-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="flex flex-col gap-6">
      <a [routerLink]="['/app/fitness/historial']" class="text-primary text-sm hover:underline">← Historial</a>

      @if (loading()) {
        <div class="h-32 rounded-xl bg-subtle animate-pulse"></div>
      } @else if (session(); as s) {
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h1 class="text-2xl font-bold text-primary">{{ s.session_date }}</h1>
          <span class="text-secondary">{{ s.routine?.name ?? 'Sesión libre' }}</span>
        </div>
        @if (s.duration_seconds != null) {
          <p class="text-secondary">Duración: {{ formatDuration(s.duration_seconds) }} · Volumen: {{ totalVolume() }} kg</p>
        }
        @if (s.notes) {
          <p class="text-sm text-secondary">{{ s.notes }}</p>
        }

        <div class="flex flex-col gap-4">
          @for (group of setsByExercise(); track group.exerciseId) {
            <div class="rounded-xl border border-default bg-surface p-4">
              <h2 class="font-semibold text-primary mb-2">{{ group.exerciseName }}</h2>
              <div class="flex flex-wrap gap-2">
                @for (set of group.sets; track set.id) {
                  <span
                    class="rounded px-2 py-1 text-sm"
                    [class.bg-primary/20]="set.is_pr"
                    [class.text-primary]="set.is_pr"
                    [class.bg-subtle]="!set.is_pr"
                  >
                    {{ set.weight }} kg × {{ set.reps }}
                    @if (set.is_pr) { ★ }
                    @if (set.rpe != null) { RPE {{ set.rpe }} }
                  </span>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <p class="text-secondary">Sesión no encontrada.</p>
      }
    </div>
  `,
})
export class SesionDetalleComponent implements OnInit {
  private workoutSessionService = inject(WorkoutSessionService);
  private route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly session = signal<WorkoutSession | null>(null);
  readonly setsByExercise = signal<{ exerciseId: string; exerciseName: string; sets: WorkoutSetWithExercise[] }[]>([]);
  readonly totalVolume = signal(0);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
    else this.loading.set(false);
  }

  async load(id: string): Promise<void> {
    this.loading.set(true);
    const { data, error } = await this.workoutSessionService.getSession(id);
    this.loading.set(false);
    if (error || !data) return;
    this.session.set(data);
    const sets = (data as WorkoutSession & { sets?: WorkoutSetWithExercise[] }).sets ?? [];
    const byEx = new Map<string, WorkoutSetWithExercise[]>();
    for (const set of sets) {
      const list = byEx.get(set.exercise_id) ?? [];
      list.push(set);
      byEx.set(set.exercise_id, list);
    }
    const groups = [...byEx.entries()].map(([exerciseId, list]) => {
      const sorted = list.sort((a, b) => a.set_number - b.set_number);
      const name = sorted[0]?.exercise?.name ?? 'Ejercicio';
      return { exerciseId, exerciseName: name, sets: sorted };
    });
    this.setsByExercise.set(groups);
    const vol = sets.reduce((acc, set) => acc + (set.weight ?? 0) * (set.reps ?? 0), 0);
    this.totalVolume.set(vol);
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
