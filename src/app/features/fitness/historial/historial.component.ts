import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WorkoutSessionService } from '@core/services/workout-session.service';
import { FitnessStatsService } from '@core/services/fitness-stats.service';
import { AuthService } from '@core/services/auth.service';
import type { WorkoutSession } from '@core/models/fitness.model';

@Component({
  selector: 'app-historial',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="flex flex-col gap-6">
      <a routerLink="/app/fitness" class="text-primary text-sm hover:underline">← Cuidado Físico</a>
      <h1 class="text-3xl font-bold text-primary">Historial</h1>
      <p class="text-secondary">Tus sesiones y racha</p>

      @if (loading()) {
        <div class="h-20 rounded-xl bg-subtle animate-pulse"></div>
      } @else {
        @if (streak() > 0) {
          <div class="rounded-xl border border-default bg-surface p-4">
            <span class="text-secondary">Racha actual</span>
            <p class="text-2xl font-bold text-primary">{{ streak() }} días</p>
          </div>
        }

        <div class="flex flex-col gap-3">
          @for (s of sessions(); track s.id) {
            <a
              [routerLink]="['/app/fitness/historial', s.id]"
              class="rounded-xl border border-default bg-surface p-4 block hover:shadow-md transition"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-semibold">{{ s.session_date }}</span>
                <span class="text-secondary text-sm">{{ s.routine?.name ?? 'Sesión libre' }}</span>
              </div>
              <div class="flex gap-4 mt-1 text-sm text-secondary">
                @if (s.duration_seconds != null) {
                  <span>{{ formatDuration(s.duration_seconds) }}</span>
                }
                @if (volume(s) > 0) {
                  <span>Volumen: {{ volume(s) }} kg</span>
                }
              </div>
            </a>
          }
          @if (sessions().length === 0) {
            <p class="text-secondary py-4">Aún no hay sesiones. Inicia una desde Rutinas o el Dashboard.</p>
          }
        </div>
      }
    </div>
  `,
})
export class HistorialComponent implements OnInit {
  private workoutSessionService = inject(WorkoutSessionService);
  private fitnessStats = inject(FitnessStatsService);
  private authService = inject(AuthService);

  readonly loading = signal(true);
  readonly sessions = signal<WorkoutSession[]>([]);
  readonly streak = signal(0);

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user?.id) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    const [sessRes, streakVal] = await Promise.all([
      this.workoutSessionService.getSessionsByProfile(user.id, { limit: 50 }),
      this.fitnessStats.getCurrentStreak(user.id),
    ]);
    this.sessions.set(sessRes.data ?? []);
    this.streak.set(streakVal);
    this.loading.set(false);
  }

  volume(s: WorkoutSession): number {
    const sets = (s as WorkoutSession & { sets?: { weight: number | null; reps: number | null }[] }).sets ?? [];
    return sets.reduce((acc, set) => acc + (set.weight ?? 0) * (set.reps ?? 0), 0);
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
