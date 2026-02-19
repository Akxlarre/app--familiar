import { Component, AfterViewInit, ElementRef, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TimelineModule } from 'primeng/timeline';
import { KpiCardComponent, KpiData } from '@shared/components/kpi-card/kpi-card.component';
import { FeatureCardComponent } from '@shared/components/feature-card/feature-card.component';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { BentoGridLayoutDirective } from '@core/directives/bento-grid-layout.directive';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TimelineModule,
    KpiCardComponent,
    FeatureCardComponent,
    BentoGridLayoutDirective,
  ],
  template: `
    <div #container class="flex flex-col gap-6 font-body">
      <!-- Title Section -->
      <div>
        <h1 class="text-3xl font-bold font-display text-primary">Dashboard</h1>
        <p class="text-secondary text-lg">Bienvenido de vuelta, <span class="text-primary font-bold">Jorge</span></p>
      </div>

      <!-- Bento Grid Layout -->
      <section #grid class="bento-grid" appBentoGridLayout aria-label="Panel principal">
        <!-- Hero ancla - 1 por sección -->
        <app-feature-card
          title="Resumen"
          size="hero"
          [accent]="true"
          [hasIcon]="false"
          [inGrid]="true"
        >
          <p class="text-secondary">Vista general de la operación diaria</p>
        </app-feature-card>

        <!-- KPIs - 4 × bento-1x1 con card-tinted -->
        @for (kpi of kpis; track kpi.id) {
          <app-kpi-card [data]="kpi" />
        }

        <!-- Actividad Reciente - bento-3x2 -->
        <app-feature-card title="Actividad Reciente" size="3x2" [inGrid]="true">
          <p-timeline [value]="events" align="left" styleClass="w-full">
            <ng-template pTemplate="content" let-event>
              <div class="mb-4">
                <span class="text-sm font-bold text-primary block">{{ event.status }}</span>
                <span class="text-xs text-muted font-medium">{{ event.date }}</span>
              </div>
            </ng-template>
            <ng-template pTemplate="marker" let-event>
              <span class="w-3 h-3 rounded-full" [style.background]="event.color"></span>
            </ng-template>
          </p-timeline>
        </app-feature-card>

        <!-- Alertas y Accesos Rápidos - bento-1x2 -->
        <div class="bento-1x2 flex flex-col gap-4">
          <app-feature-card title="Alertas Importantes" [hasIcon]="false">
            <div class="flex flex-col gap-3">
              <div class="alert-card alert-error">
                <span class="text-sm font-bold block">3 Documentos vencidos</span>
                <span class="text-xs">Vehículos requieren atención</span>
              </div>
              <div class="alert-card alert-warning">
                <span class="text-sm font-bold block">12 Pagos pendientes</span>
                <span class="text-xs">Revisar cuentas por cobrar</span>
              </div>
            </div>
          </app-feature-card>

          <app-feature-card title="Accesos Rápidos" [hasIcon]="false">
            <div class="flex flex-col gap-2">
              <button class="btn-primary w-full">
                <i class="pi pi-plus"></i> Nueva Matrícula
              </button>
              <button class="btn-secondary w-full">
                <i class="pi pi-calendar"></i> Ver Agenda
              </button>
              <button class="btn-secondary w-full">
                <i class="pi pi-dollar"></i> Registrar Pago
              </button>
            </div>
          </app-feature-card>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .alert-card {
      padding: var(--space-3);
      border-radius: var(--radius-md);
      border: 1px solid;
    }
    .alert-error {
      background: var(--state-error-bg);
      border-color: var(--state-error-border);
      color: var(--state-error);
    }
    .alert-error span.text-xs {
      color: var(--text-secondary);
    }
    .alert-warning {
      background: var(--state-warning-bg);
      border-color: var(--state-warning-border);
      color: var(--state-warning);
    }
    .alert-warning span.text-xs {
      color: var(--text-secondary);
    }
    .btn-primary {
      background: var(--color-primary);
      color: var(--color-primary-text);
      border: none;
      border-radius: var(--radius-full);
      padding: var(--space-3) var(--space-4);
      font-weight: var(--font-semibold);
      font-size: var(--text-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .btn-primary:hover {
      background: var(--color-primary-hover);
    }
    .btn-secondary {
      background: var(--bg-surface);
      color: var(--text-primary);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-full);
      padding: var(--space-3) var(--space-4);
      font-weight: var(--font-semibold);
      font-size: var(--text-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .btn-secondary:hover {
      background: var(--bg-elevated);
    }
  `],
})
export class DashboardComponent implements AfterViewInit {
  private gsap = inject(GsapAnimationsService);

  grid = viewChild.required<ElementRef<HTMLElement>>('grid');

  kpis: KpiData[] = [
    {
      id: '1',
      label: 'Alumnos Activos',
      value: 234,
      suffix: '',
      valueDisplay: '234',
      icon: 'pi pi-users',
      trend: 'up',
      trendValue: '+12% vs mes anterior',
    },
    {
      id: '2',
      label: 'Clases Hoy',
      value: 18,
      valueDisplay: '18',
      subtitle: '12 prácticas, 6 teóricas',
      icon: 'pi pi-check-square',
    },
    {
      id: '3',
      label: 'Ingresos Mes',
      value: 82,
      valueDisplay: '$8.2M',
      icon: 'pi pi-dollar',
      trend: 'up',
      trendValue: '+8% vs mes anterior',
    },
    {
      id: '4',
      label: 'Vehículos',
      value: 8,
      valueDisplay: '8 / 12',
      subtitle: 'En uso / Total',
      icon: 'pi pi-car',
    },
  ];

  events = [
    { status: 'Nueva matrícula: Maria González - Clase B', date: 'Hace 5 min', color: 'var(--state-info)' },
    { status: 'Pago recibido: $280.000 - Juan Pérez', date: 'Hace 12 min', color: 'var(--state-success)' },
    { status: 'Clase completada: Instructor Carlos - Ana Martínez', date: 'Hace 28 min', color: 'var(--color-primary)' },
    { status: 'Documento vencido: Vehículo ABC-123 - Revisión técnica', date: 'Hace 1 hora', color: 'var(--state-error)' },
  ];

  ngAfterViewInit(): void {
    this.gsap.animateBentoGrid(this.grid().nativeElement);
  }
}
