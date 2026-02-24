import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WorkoutSessionService } from '@core/services/workout-session.service';
import { PersonalRecordService } from '@core/services/personal-record.service';
import { FitnessStatsService } from '@core/services/fitness-stats.service';
import { AuthService } from '@core/services/auth.service';
import type { PersonalRecord } from '@core/models/fitness.model';

@Component({
  selector: 'app-progreso',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="flex flex-col gap-6">
      <a routerLink="/app/fitness" class="text-primary text-sm hover:underline">← Cuidado Físico</a>
      <h1 class="text-3xl font-bold text-primary">Progreso</h1>
      <p class="text-secondary">Por ejercicio</p>

      @if (loading()) {
        <div class="h-20 rounded-xl bg-subtle animate-pulse"></div>
      } @else if (selectedExerciseId()) {
        <div class="flex flex-col gap-4">
          <button type="button" class="text-primary text-sm hover:underline w-fit" (click)="clearSelection()">← Todos los ejercicios</button>
          <h2 class="text-xl font-bold">{{ selectedExerciseName() }}</h2>
          @if (prs().length > 0) {
            <div class="rounded-xl border border-default bg-surface p-4">
              <h3 class="font-semibold mb-2">Récords</h3>
              <ul class="flex flex-col gap-1 text-sm">
                @for (pr of prs(); track pr.id) {
                  <li>{{ pr.record_type }}: {{ pr.value }} ({{ pr.achieved_at.slice(0, 10) }})</li>
                }
              </ul>
            </div>
          }
          @if (weeklyVolume().length > 0) {
            <div class="rounded-xl border border-default bg-surface p-4">
              <h3 class="font-semibold mb-2">Volumen semanal (kg)</h3>
              <ul class="flex flex-col gap-1 text-sm">
                @for (w of weeklyVolume(); track w.weekStart) {
                  <li>{{ w.weekStart }}: {{ w.volume | number:'1.0-0' }}</li>
                }
              </ul>
            </div>
          }
        </div>
      } @else {
        <div class="flex flex-col gap-2">
          @for (ex of exercisesWithData(); track ex.exerciseId) {
            <button
              type="button"
              class="rounded-xl border border-default bg-surface p-4 text-left hover:shadow-md transition w-full"
              (click)="selectExercise(ex.exerciseId, ex.exerciseName)"
            >
              <span class="font-semibold">{{ ex.exerciseName }}</span>
              @if (ex.prCount > 0) {
                <span class="text-primary text-sm ml-2">{{ ex.prCount }} PRs</span>
              }
            </button>
          }
          @if (exercisesWithData().length === 0) {
            <p class="text-secondary py-4">Completa sesiones para ver progreso por ejercicio.</p>
          }
        </div>
      }
    </div>
  `,
})
export class ProgresoComponent implements OnInit {
  private workoutSessionService = inject(WorkoutSessionService);
  private personalRecordService = inject(PersonalRecordService);
  private fitnessStats = inject(FitnessStatsService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly selectedExerciseId = signal<string | null>(null);
  readonly selectedExerciseName = signal('');
  readonly prs = signal<PersonalRecord[]>([]);
  readonly weeklyVolume = signal<{ weekStart: string; volume: number }[]>([]);
  readonly exerciseIdsWithRecords = signal<{ exerciseId: string; exerciseName: string; prCount: number }[]>([]);

  readonly exercisesWithData = computed(() => this.exerciseIdsWithRecords());

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (!user?.id) {
      this.loading.set(false);
      return;
    }
    const exerciseId = this.route.snapshot.paramMap.get('exerciseId');
    this.loading.set(true);
    this.personalRecordService.getRecordsByProfile(user.id, user.householdId ?? '').then(({ data }) => {
      const byEx = new Map<string, { name: string; count: number }>();
      for (const pr of data ?? []) {
        const cur = byEx.get(pr.exercise_id) ?? { name: pr.exercise?.name ?? 'Ejercicio', count: 0 };
        cur.count++;
        byEx.set(pr.exercise_id, cur);
      }
      this.exerciseIdsWithRecords.set(
        [...byEx.entries()].map(([id, v]) => ({ exerciseId: id, exerciseName: v.name, prCount: v.count }))
      );
      this.loading.set(false);
      if (exerciseId) {
        const name = byEx.get(exerciseId)?.name ?? 'Ejercicio';
        this.selectExercise(exerciseId, name);
      }
    });
  }

  async selectExercise(exerciseId: string, name: string): Promise<void> {
    this.selectedExerciseId.set(exerciseId);
    this.selectedExerciseName.set(name);
    const user = this.authService.currentUser();
    const householdId = user?.householdId ?? '';
    if (!user?.id) return;
    const [prsRes, volRes] = await Promise.all([
      this.personalRecordService.getRecordsByProfile(user.id, householdId),
      this.fitnessStats.getWeeklyVolumeByExercise(user.id, exerciseId, 12),
    ]);
    const prsForEx = (prsRes.data ?? []).filter((pr) => pr.exercise_id === exerciseId);
    this.prs.set(prsForEx);
    this.weeklyVolume.set(volRes.data ?? []);
  }

  clearSelection(): void {
    this.selectedExerciseId.set(null);
    this.selectedExerciseName.set('');
    this.prs.set([]);
    this.weeklyVolume.set([]);
  }
}
