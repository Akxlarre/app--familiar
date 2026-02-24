import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RoutineService } from '@core/services/routine.service';
import { AuthService } from '@core/services/auth.service';
import { ConfirmModalService } from '@core/services/confirm-modal.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import type { Routine } from '@core/models/fitness.model';

const DAY_LABELS: Record<string, string> = {
  '1': 'Lun', '2': 'Mar', '3': 'Mié', '4': 'Jue', '5': 'Vie', '6': 'Sáb', '0': 'Dom',
};

@Component({
  selector: 'app-rutinas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ButtonModule, EmptyStateComponent],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <a routerLink="/app/fitness" class="text-primary text-sm hover:underline">← Cuidado Físico</a>
          <h1 class="text-3xl font-bold text-primary mt-1">Rutinas</h1>
          <p class="text-secondary">Tus plantillas de entrenamiento</p>
        </div>
        <a [routerLink]="['/app/fitness/rutinas/nueva']" pButton icon="pi pi-plus" label="Nueva rutina"></a>
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1,2,3]; track i) {
            <div class="h-20 rounded-xl bg-subtle animate-pulse"></div>
          }
        </div>
      } @else if (routines().length === 0) {
        <app-empty-state
          message="No tienes rutinas"
          subtitle="Crea una rutina para usarla en tus sesiones"
          icon="pi pi-list-check"
          actionLabel="Nueva rutina"
          (action)="goNew()"
        />
      } @else {
        <div class="grid gap-4">
          @for (r of routines(); track r.id) {
            <div
              class="rounded-xl border border-default bg-surface p-4 shadow-sm hover:shadow-md transition-shadow flex flex-wrap items-center justify-between gap-4"
            >
              <div class="flex-1 min-w-0">
                <h2 class="font-semibold text-primary">{{ r.name }}</h2>
                <p class="text-sm text-secondary mt-1">
                  {{ r.exercises?.length ?? 0 }} ejercicios
                  @if (r.active_days && r.active_days.length) {
                    · {{ formatDays(r.active_days) }}
                  }
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <a
                  [routerLink]="['/app/fitness/sesion']"
                  [queryParams]="{ routineId: r.id }"
                  pButton
                  icon="pi pi-play"
                  label="Iniciar sesión"
                  severity="success"
                  size="small"
                ></a>
                <a
                  [routerLink]="['/app/fitness/rutinas', r.id]"
                  pButton
                  icon="pi pi-pencil"
                  label="Editar"
                  severity="secondary"
                  size="small"
                ></a>
                <button
                  pButton
                  icon="pi pi-copy"
                  label="Duplicar"
                  severity="secondary"
                  size="small"
                  (click)="duplicate(r)"
                ></button>
                <button
                  pButton
                  icon="pi pi-trash"
                  label="Eliminar"
                  severity="danger"
                  size="small"
                  (click)="confirmDelete(r)"
                ></button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class RutinasComponent implements OnInit {
  private routineService = inject(RoutineService);
  private authService = inject(AuthService);
  private confirmModal = inject(ConfirmModalService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly routines = signal<Routine[]>([]);

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    const user = this.authService.currentUser();
    const householdId = user?.householdId ?? null;
    if (!user?.id) {
      this.loading.set(false);
      return;
    }
    const { data, error } = await this.routineService.getRoutinesByProfile(user.id, householdId);
    this.loading.set(false);
    if (error) return;
    this.routines.set(data ?? []);
  }

  formatDays(days: string[]): string {
    return days.map((d) => DAY_LABELS[d] ?? d).join(', ');
  }

  goNew(): void {
    this.router.navigate(['/app/fitness/rutinas/nueva']);
  }

  async duplicate(r: Routine): Promise<void> {
    const user = this.authService.currentUser();
    if (!user?.id) return;
    const householdId = user.householdId ?? null;
    const { data, error } = await this.routineService.duplicateRoutine(r.id, user.id, householdId);
    if (!error && data) this.load();
  }

  async confirmDelete(r: Routine): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Eliminar rutina',
      message: `¿Eliminar la rutina "${r.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      severity: 'danger',
    });
    if (!confirmed) return;
    const { error } = await this.routineService.deleteRoutine(r.id);
    if (!error) this.load();
  }
}
