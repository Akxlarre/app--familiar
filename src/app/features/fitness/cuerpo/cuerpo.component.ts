import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { BodyLogService } from '@core/services/body-log.service';
import { AuthService } from '@core/services/auth.service';
import type { BodyLog } from '@core/models/fitness.model';

@Component({
  selector: 'app-cuerpo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, FormsModule, ButtonModule, InputNumberModule],
  template: `
    <div class="flex flex-col gap-6">
      <a routerLink="/app/fitness" class="text-primary text-sm hover:underline">← Cuidado Físico</a>
      <h1 class="text-3xl font-bold text-primary">Mi cuerpo</h1>
      <p class="text-secondary">Peso y medidas</p>

      <div class="rounded-xl border border-default bg-surface p-4 flex flex-col gap-3">
        <h2 class="font-semibold">Registrar</h2>
        <div class="flex flex-wrap items-end gap-3">
          <div>
            <label class="block text-sm text-secondary mb-1">Peso (kg)</label>
            <input
              type="number"
              [(ngModel)]="newWeight"
              min="0"
              step="0.1"
              class="w-24 rounded border border-default px-2 py-1"
              placeholder="kg"
            />
          </div>
          <div>
            <label class="block text-sm text-secondary mb-1">Fecha</label>
            <input
              type="date"
              [(ngModel)]="newDate"
              class="rounded border border-default px-2 py-1"
            />
          </div>
          <button pButton label="Guardar" (click)="saveLog()" [loading]="saving()"></button>
        </div>
        <details class="text-sm">
          <summary class="cursor-pointer text-secondary">Medidas opcionales</summary>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <div><label class="text-secondary">Cintura (cm)</label><input type="number" [(ngModel)]="newWaist" class="w-full rounded border px-2 py-1" /></div>
            <div><label class="text-secondary">Cadera (cm)</label><input type="number" [(ngModel)]="newHips" class="w-full rounded border px-2 py-1" /></div>
            <div><label class="text-secondary">Pecho (cm)</label><input type="number" [(ngModel)]="newChest" class="w-full rounded border px-2 py-1" /></div>
            <div><label class="text-secondary">Brazos (cm)</label><input type="number" [(ngModel)]="newArms" class="w-full rounded border px-2 py-1" /></div>
            <div><label class="text-secondary">Piernas (cm)</label><input type="number" [(ngModel)]="newLegs" class="w-full rounded border px-2 py-1" /></div>
          </div>
        </details>
      </div>

      @if (weightChartData().length > 0) {
        <div class="rounded-xl border border-default bg-surface p-4">
          <h2 class="font-semibold mb-2">Tendencia de peso</h2>
          <div class="h-64 flex items-center justify-center text-secondary text-sm">
            <table class="w-full text-left">
              <thead>
                <tr><th class="py-1">Fecha</th><th class="py-1">Peso (kg)</th></tr>
              </thead>
              <tbody>
                @for (row of weightChartData(); track row.date) {
                  <tr><td class="py-0.5">{{ row.date }}</td><td class="py-0.5">{{ row.value }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <div class="rounded-xl border border-default bg-surface p-4">
        <h2 class="font-semibold mb-2">Historial</h2>
        @if (loading()) {
          <div class="h-20 bg-subtle rounded animate-pulse"></div>
        } @else {
          <ul class="flex flex-col gap-2">
            @for (log of logs(); track log.id) {
              <li class="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-default last:border-0">
                <span>{{ log.date }}</span>
                @if (log.weight_kg != null) {
                  <span class="font-medium">{{ log.weight_kg }} kg</span>
                }
                @if (log.waist_cm != null || log.hips_cm != null) {
                  <span class="text-secondary text-sm">C: {{ log.waist_cm ?? '—' }} · Cad: {{ log.hips_cm ?? '—' }}</span>
                }
              </li>
            }
            @if (logs().length === 0) {
              <li class="text-secondary py-4">Aún no hay registros.</li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class CuerpoComponent implements OnInit {
  private bodyLogService = inject(BodyLogService);
  private authService = inject(AuthService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly logs = signal<BodyLog[]>([]);

  newWeight: number | null = null;
  newDate = new Date().toISOString().slice(0, 10);
  newWaist: number | null = null;
  newHips: number | null = null;
  newChest: number | null = null;
  newArms: number | null = null;
  newLegs: number | null = null;

  readonly weightChartData = computed(() => {
    const list = this.logs().filter((l) => l.weight_kg != null);
    return list
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((l) => ({ date: l.date, value: l.weight_kg! }));
  });

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
    const { data } = await this.bodyLogService.getBodyLogsByProfile(user.id, { limit: 100 });
    this.loading.set(false);
    this.logs.set(data ?? []);
  }

  async saveLog(): Promise<void> {
    const user = this.authService.currentUser();
    const householdId = user?.householdId;
    if (!user?.id || !householdId) return;
    if (this.newWeight == null) return;
    this.saving.set(true);
    const { error } = await this.bodyLogService.createBodyLog({
      profileId: user.id,
      householdId,
      date: this.newDate,
      weightKg: this.newWeight,
      waistCm: this.newWaist ?? undefined,
      hipsCm: this.newHips ?? undefined,
      chestCm: this.newChest ?? undefined,
      armsCm: this.newArms ?? undefined,
      legsCm: this.newLegs ?? undefined,
    });
    this.saving.set(false);
    if (!error) {
      this.newWeight = null;
      this.newWaist = null;
      this.newHips = null;
      this.newChest = null;
      this.newArms = null;
      this.newLegs = null;
      this.load();
    }
  }
}
