import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FitnessStatsService } from '@core/services/fitness-stats.service';
import { PersonalRecordService } from '@core/services/personal-record.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-fitness-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ButtonModule],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-primary">Cuidado Físico</h1>
          <p class="text-secondary">Dashboard familiar</p>
        </div>
        <a [routerLink]="['/app/fitness/sesion']" pButton icon="pi pi-play" label="Iniciar sesión" severity="success"></a>
      </div>

      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="h-32 rounded-xl bg-subtle animate-pulse"></div>
          <div class="h-32 rounded-xl bg-subtle animate-pulse"></div>
        </div>
      } @else {
        @if (stats().coupleStreakWeeks > 0) {
          <div class="rounded-xl border border-default bg-surface p-4">
            <span class="text-secondary">Racha en pareja</span>
            <p class="text-2xl font-bold text-primary">{{ stats().coupleStreakWeeks }} semanas</p>
          </div>
        }

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (m of stats().members; track m.profileId) {
            <div class="rounded-xl border border-default bg-surface p-4 flex flex-col gap-2">
              <h2 class="font-semibold text-primary">{{ m.profileName }}</h2>
              @if (m.lastSessionDate) {
                <p class="text-sm">Última sesión: {{ m.lastSessionDate }} · {{ m.lastSessionRoutineName ?? '' }}</p>
                @if (m.lastSessionDurationSeconds != null) {
                  <p class="text-sm text-secondary">{{ formatDuration(m.lastSessionDurationSeconds) }}</p>
                }
              } @else {
                <p class="text-secondary text-sm">Sin sesiones aún</p>
              }
              @if (m.currentStreakDays > 0) {
                <p class="text-sm">Racha: {{ m.currentStreakDays }} días</p>
              }
              @if (m.lastWeightKg != null) {
                <p class="text-sm">Peso: {{ m.lastWeightKg }} kg</p>
              }
              @if (m.recentPrCount > 0) {
                <p class="text-sm text-primary">{{ m.recentPrCount }} PRs</p>
              }
            </div>
          }
        </div>

        @if (recentPrs().length > 0) {
          <div class="rounded-xl border border-default bg-surface p-4">
            <h2 class="font-semibold mb-2">Logros recientes</h2>
            <ul class="flex flex-col gap-1 text-sm">
              @for (pr of recentPrs(); track pr.id) {
                <li>{{ pr.exercise?.name ?? 'Ejercicio' }} — {{ pr.record_type }}: {{ pr.value }}</li>
              }
            </ul>
          </div>
        }
      }
    </div>
  `,
})
export class FitnessDashboardComponent implements OnInit {
  private fitnessStats = inject(FitnessStatsService);
  private personalRecordService = inject(PersonalRecordService);
  private authService = inject(AuthService);

  readonly loading = signal(true);
  readonly stats = signal({ members: [] as { profileId: string; profileName: string; lastSessionDate: string | null; lastSessionRoutineName: string | null; lastSessionDurationSeconds: number | null; currentStreakDays: number; lastWeightKg: number | null; recentPrCount: number }[], coupleStreakWeeks: 0 });
  readonly recentPrs = signal<{ id: string; exercise?: { name: string }; record_type: string; value: number }[]>([]);

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    const user = this.authService.currentUser();
    const householdId = user?.householdId;
    if (!householdId) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    const [statsRes, prsRes] = await Promise.all([
      this.fitnessStats.getDashboardStats(householdId),
      this.personalRecordService.getRecordsByHousehold(householdId, 10),
    ]);
    this.loading.set(false);
    if (statsRes.data) this.stats.set(statsRes.data);
    this.recentPrs.set(prsRes.data ?? []);
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
