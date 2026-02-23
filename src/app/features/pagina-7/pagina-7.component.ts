import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  viewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { EmailIntegrationService } from '@core/services/email-integration.service';
import { EmailTransactionLogService } from '@core/services/email-transaction-log.service';
import { MessageService } from 'primeng/api';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import { ButtonModule } from 'primeng/button';
import type { EmailTransactionLog } from '@core/models/finance.model';

type LogWithBank = EmailTransactionLog & { bank_name?: string };

@Component({
  selector: 'app-pagina-7',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule, PressFeedbackDirective],
  template: `
    <div #container class="flex flex-col gap-6 font-body pb-20">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold font-display text-primary">Correos procesados</h1>
          <p class="text-secondary text-lg">Visualización de emails bancarios importados</p>
        </div>
        <div class="flex items-center gap-2">
          @if (stats().pending > 0) {
            <button
              pButton
              icon="pi pi-sync"
              label="Reprocesar pendientes"
              severity="success"
              [loading]="reprocessing()"
              (click)="reprocessPending()"
              appPressFeedback="press"
            ></button>
          }
          <button
            pButton
            icon="pi pi-refresh"
            label="Actualizar"
            severity="secondary"
            [loading]="loading()"
            (click)="loadData()"
            appPressFeedback="press"
          ></button>
        </div>
      </div>

      @if (loading()) {
        <div class="rounded-xl border border-default bg-surface p-8 shadow-sm animate-pulse">
          <div class="h-24 bg-subtle rounded-xl mb-4"></div>
          <div class="h-48 bg-subtle rounded-xl"></div>
        </div>
      } @else {
        <!-- KPIs -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border border-default bg-surface p-4 shadow-sm">
            <p class="text-sm text-secondary mb-1">Total procesados</p>
            <p class="text-2xl font-bold text-primary tabular-nums">{{ stats().total }}</p>
          </div>
          <div class="rounded-xl border border-default bg-surface p-4 shadow-sm">
            <p class="text-sm text-secondary mb-1">Pendientes</p>
            <p class="text-2xl font-bold tabular-nums" [class.text-warning]="stats().pending > 0">
              {{ stats().pending }}
            </p>
          </div>
          <div class="rounded-xl border border-default bg-surface p-4 shadow-sm">
            <p class="text-sm text-secondary mb-1">Aprobados</p>
            <p class="text-2xl font-bold text-state-success tabular-nums">{{ stats().approved }}</p>
          </div>
          <div class="rounded-xl border border-default bg-surface p-4 shadow-sm">
            <p class="text-sm text-secondary mb-1">Rechazados</p>
            <p class="text-2xl font-bold text-state-error tabular-nums">{{ stats().rejected }}</p>
          </div>
        </div>

        <!-- Gráfico por estado -->
        <section class="rounded-xl border border-default bg-surface p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
            <i class="pi pi-chart-pie text-primary"></i>
            Por estado
          </h2>
          @if (statusBarData().length > 0) {
            <div class="space-y-3">
              @for (row of statusBarData(); track row.label) {
                <div class="flex flex-col gap-1">
                  <div class="flex justify-between text-sm">
                    <span class="font-medium text-primary">{{ row.label }}</span>
                    <span class="text-secondary tabular-nums">{{ row.value }}</span>
                  </div>
                  <div
                    class="h-2 rounded-full bg-subtle overflow-hidden"
                    role="progressbar"
                    [attr.aria-valuenow]="statusBarPercent(row.value)"
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    <div
                      class="h-full rounded-full transition-all"
                      [style.width.%]="statusBarPercent(row.value)"
                      [class.bg-state-success]="row.label === 'Aprobados'"
                      [class.bg-warning]="row.label === 'Pendientes'"
                      [class.bg-state-error]="row.label === 'Rechazados'"
                      [class.bg-primary]="row.label === 'Total'"
                    ></div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="text-muted text-sm">Sin datos aún. Conecta Gmail y configura parsers en Configuración → Integración email.</p>
          }
        </section>

        <!-- Gráfico por día (últimos 7 días) -->
        <section class="rounded-xl border border-default bg-surface p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
            <i class="pi pi-chart-bar text-primary"></i>
            Correos por día (últimos 7 días)
          </h2>
          @if (dayBarData().length > 0) {
            <div class="space-y-3">
              @for (row of dayBarData(); track row.label) {
                <div class="flex flex-col gap-1">
                  <div class="flex justify-between text-sm">
                    <span class="font-medium text-primary">{{ row.label }}</span>
                    <span class="text-secondary tabular-nums">{{ row.value }} correo(s)</span>
                  </div>
                  <div
                    class="h-2 rounded-full bg-subtle overflow-hidden"
                    role="progressbar"
                    [attr.aria-valuenow]="dayBarPercent(row.value)"
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    <div
                      class="h-full rounded-full bg-primary transition-all"
                      [style.width.%]="dayBarPercent(row.value)"
                    ></div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="text-muted text-sm">Sin correos procesados en los últimos 7 días.</p>
          }
        </section>

        <!-- Lista de correos recientes -->
        <section class="rounded-xl border border-default bg-surface p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
            <i class="pi pi-envelope text-primary"></i>
            Últimos correos leídos
          </h2>
          @if (logs().length > 0) {
            <div class="flex flex-col gap-3">
              @for (log of logs(); track log.id) {
                <div
                  class="rounded-lg border border-default bg-elevated p-4 flex flex-wrap items-start justify-between gap-3"
                >
                  <div class="min-w-0 flex-1">
                    <p class="font-medium text-primary truncate">{{ log.raw_subject || 'Sin asunto' }}</p>
                    <p class="text-sm text-secondary line-clamp-2 mt-1">{{ log.raw_snippet || '—' }}</p>
                    <div class="flex flex-wrap gap-2 mt-2">
                      @if (log.bank_name) {
                        <span class="text-xs px-2 py-0.5 rounded-full bg-subtle text-secondary">{{ log.bank_name }}</span>
                      }
                      @if (log.extracted_data.amount != null) {
                        <span class="text-xs font-semibold text-state-error">{{ log.extracted_data.amount | number : '1.0-0' }} $</span>
                      }
                      @if (log.extracted_data.merchant) {
                        <span class="text-xs text-muted">{{ log.extracted_data.merchant }}</span>
                      }
                    </div>
                  </div>
                  <div class="flex flex-col items-end gap-1 shrink-0">
                    <div class="flex items-center gap-2">
                      <span
                        class="text-xs px-2 py-1 rounded-full font-medium"
                        [class.bg-state-success/30]="log.status === 'auto_created'"
                        [class.text-state-success]="log.status === 'auto_created'"
                        [class.bg-warning/30]="log.status === 'pending_review'"
                        [class.text-warning]="log.status === 'pending_review'"
                        [class.bg-state-error/30]="log.status === 'rejected'"
                        [class.text-state-error]="log.status === 'rejected'"
                      >
                        {{ getStatusLabel(log.status) }}
                      </span>
                      <span class="text-xs text-muted">{{ log.processed_at | date : 'd/M/yy HH:mm' }}</span>
                    </div>
                    @if (log.status === 'pending_review' && (log.bank_name || log.inbox_email)) {
                      <p class="text-xs text-muted text-right max-w-[200px]">
                        En Finanzas → Cuentas: pon <strong>Banco</strong> = {{ log.bank_name || '?' }} y <strong>Email vinculado</strong> = {{ log.inbox_email || 'tu Gmail' }} en la cuenta correspondiente.
                      </p>
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="text-muted text-sm">No hay correos procesados. El cron ejecuta process-bank-emails cada 5 minutos.</p>
          }
        </section>
      }
    </div>
  `,
})
export class Pagina7Component implements OnInit, AfterViewInit {
  private auth = inject(AuthService);
  private emailIntegration = inject(EmailIntegrationService);
  private emailLogService = inject(EmailTransactionLogService);
  private gsap = inject(GsapAnimationsService);
  private messageService = inject(MessageService);

  containerRef = viewChild<ElementRef<HTMLElement>>('container');

  loading = signal(true);
  reprocessing = signal(false);
  logs = signal<LogWithBank[]>([]);

  stats = computed(() => {
    const list = this.logs();
    return {
      total: list.length,
      pending: list.filter((l) => l.status === 'pending_review').length,
      approved: list.filter((l) => l.status === 'auto_created').length,
      rejected: list.filter((l) => l.status === 'rejected').length,
    };
  });

  statusBarData = computed(() => {
    const s = this.stats();
    return [
      { label: 'Total', value: s.total },
      { label: 'Pendientes', value: s.pending },
      { label: 'Aprobados', value: s.approved },
      { label: 'Rechazados', value: s.rejected },
    ].filter((r) => r.value > 0);
  });

  dayBarData = computed(() => {
    const list = this.logs();
    const byDay = new Map<string, number>();
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, 0);
    }
    for (const log of list) {
      const key = log.processed_at.slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    return Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({
        label: new Date(date + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }),
        value: count,
      }))
      .reverse();
  });

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    const el = this.containerRef()?.nativeElement;
    if (el) this.gsap.animatePageEnter(el);
  }

  async loadData(): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    const { data, error } = await this.emailLogService.getRecentLogs(householdId, 100);
    this.loading.set(false);
    if (!error && data) this.logs.set(data as LogWithBank[]);
  }

  async reprocessPending(): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) return;
    this.reprocessing.set(true);
    const { data, error } = await this.emailIntegration.reprocessPendingLogs();
    this.reprocessing.set(false);
    if (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message,
      });
      return;
    }
    await this.emailLogService.refreshPendingCount(householdId);
    await this.loadData();
    if (data) {
      if (data.processed && data.processed > 0) {
        this.messageService.add({
          severity: 'success',
          summary: 'Listo',
          detail: data.message ?? `Se crearon ${data.processed} transacción(es)`,
        });
      } else if (data.stillPending && data.stillPending > 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Sin cambios',
          detail: data.message ?? 'Configura Banco y Email vinculado en Finanzas → Cuentas',
        });
      }
    }
  }

  statusBarPercent(value: number): number {
    const data = this.statusBarData();
    const max = data.length ? Math.max(...data.map((r) => r.value)) : 1;
    return max > 0 ? Math.min(100, (value / max) * 100) : 0;
  }

  dayBarPercent(value: number): number {
    const data = this.dayBarData();
    const max = data.length ? Math.max(...data.map((r) => r.value)) : 1;
    return max > 0 ? Math.min(100, (value / max) * 100) : 0;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending_review: 'Pendiente',
      auto_created: 'Aprobado',
      rejected: 'Rechazado',
      failed: 'Fallido',
    };
    return labels[status] ?? status;
  }
}
