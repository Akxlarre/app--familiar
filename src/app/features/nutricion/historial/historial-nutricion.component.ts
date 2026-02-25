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
import { AuthService } from '@core/services/auth.service';
import { NutritionStatsService, type DaySummary, type WeeklyAverage } from '@core/services/nutrition-stats.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-historial-nutricion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <div class="flex flex-col gap-6">
      <app-page-header
        title="Historial nutrición"
        description="Semana actual y adherencia al objetivo."
        parentHref="/app/nutricion"
        parentLabel="Nutrición"
      />

      @if (!profileId()) {
        <p class="text-secondary">Configura tu perfil nutricional para ver el historial.</p>
      } @else if (loading()) {
        <div class="h-64 rounded-xl bg-subtle animate-pulse"></div>
      } @else {
        <section class="rounded-xl border border-default bg-surface p-4" aria-labelledby="adherence-head">
          <h2 id="adherence-head" class="font-semibold text-primary mb-2">Adherencia al objetivo (30 días)</h2>
          <p class="text-3xl font-bold tabular-nums">{{ adherence() }}%</p>
          <p class="text-sm text-secondary">Días cumplidos (±100 kcal del objetivo)</p>
        </section>

        <section class="rounded-xl border border-default bg-surface p-4" aria-labelledby="week-head">
          <h2 id="week-head" class="font-semibold text-primary mb-3">Semana actual</h2>
          <div class="flex flex-col gap-2">
            @for (day of weekSummary(); track day.date) {
              <div class="flex items-center justify-between gap-2 py-2 border-b border-default last:border-0">
                <span class="text-sm font-medium">{{ formatDay(day.date) }}</span>
                <span class="text-sm tabular-nums" [class.text-success]="day.goalMet" [class.text-secondary]="!day.goalMet">
                  {{ day.caloriesTotal }} / {{ day.caloriesTarget }} kcal
                </span>
              </div>
            }
          </div>
        </section>

        <section class="rounded-xl border border-default bg-surface p-4" aria-labelledby="avg-head">
          <h2 id="avg-head" class="font-semibold text-primary mb-2">Promedio diario (esta semana)</h2>
          <dl class="grid grid-cols-2 gap-2 text-sm">
            <dt class="text-secondary">Calorías</dt>
            <dd class="tabular-nums font-medium">{{ weeklyAvg().caloriesAvg }} kcal</dd>
            <dt class="text-secondary">Proteína</dt>
            <dd class="tabular-nums font-medium">{{ weeklyAvg().proteinAvg }} g</dd>
            <dt class="text-secondary">Carbohidratos</dt>
            <dd class="tabular-nums font-medium">{{ weeklyAvg().carbsAvg }} g</dd>
            <dt class="text-secondary">Grasas</dt>
            <dd class="tabular-nums font-medium">{{ weeklyAvg().fatAvg }} g</dd>
          </dl>
        </section>
      }
    </div>
  `,
})
export class HistorialNutricionComponent implements OnInit {
  private auth = inject(AuthService);
  private nutritionStats = inject(NutritionStatsService);

  readonly loading = signal(true);
  readonly profileId = signal<string | null>(null);
  readonly weekSummary = signal<DaySummary[]>([]);
  readonly weeklyAvg = signal<WeeklyAverage>({
    caloriesAvg: 0,
    proteinAvg: 0,
    carbsAvg: 0,
    fatAvg: 0,
  });
  readonly adherence = signal(0);

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user?.id) {
      this.loading.set(false);
      return;
    }
    this.profileId.set(user.id);
    this.loading.set(true);
    const weekStart = this.getWeekStart();
    const [summaryRes, avgRes, adherenceRes] = await Promise.all([
      this.nutritionStats.getWeeklySummary(user.id, weekStart),
      this.nutritionStats.getWeeklyAverage(user.id, weekStart),
      this.nutritionStats.getGoalAdherence(user.id, 30),
    ]);
    this.loading.set(false);
    if (summaryRes.data) this.weekSummary.set(summaryRes.data);
    if (avgRes.data) this.weeklyAvg.set(avgRes.data);
    if (adherenceRes.data != null) this.adherence.set(adherenceRes.data);
  }

  formatDay(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  private getWeekStart(): string {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return monday.toISOString().slice(0, 10);
  }
}
