import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
  viewChild,
  ElementRef,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageContentSkeletonComponent } from '@shared/components/page-content-skeleton/page-content-skeleton.component';
import { KpiCardComponent, type KpiData } from '@shared/components/kpi-card/kpi-card.component';
import { KpiCardSkeletonComponent } from '@shared/components/kpi-card/kpi-card-skeleton.component';
import { FeatureCardComponent } from '@shared/components/feature-card/feature-card.component';
import { CategoryBreakdownCardComponent } from '@shared/components/category-breakdown-card/category-breakdown-card.component';
import { DataTableCardComponent } from '@shared/components/data-table-card';
import type { DataTableColumnConfig } from '@shared/components/data-table-card';
import type { CategoryBreakdownItem } from '@shared/components/category-breakdown-card/category-breakdown-card.types';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { BentoGridLayoutDirective } from '@core/directives/bento-grid-layout.directive';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';

const FAKE_LOADING_MS = 1800;
const KPI_DELAY_MS = 700;

interface Alumno {
  id: string;
  nombre: string;
  rut: string;
  categoria: string;
  estado: string;
  proximaClase: string;
}

@Component({
  selector: 'app-pagina-3',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    PageContentSkeletonComponent,
    KpiCardComponent,
    KpiCardSkeletonComponent,
    FeatureCardComponent,
    CategoryBreakdownCardComponent,
    DataTableCardComponent,
    BentoGridLayoutDirective,
  ],
  template: `
    <div class="flex flex-col gap-6 font-body">
      @if (loading()) {
        <app-page-content-skeleton />
      } @else {
        <div #content class="page-content flex flex-col gap-6">
          <div>
            <h1 class="text-3xl font-bold font-display text-primary">Alumnos</h1>
            <p class="text-secondary text-lg">Matrículas activas — Operación</p>
          </div>

          <section #grid class="bento-grid" appBentoGridLayout aria-label="Panel alumnos">
            <app-feature-card
              title="Matrículas activas"
              size="hero"
              [accent]="true"
              [hasIcon]="false"
              [inGrid]="true"
            >
              <p class="text-secondary">
                Gestión de alumnos matriculados. Revisa el estado de cada uno y las próximas clases programadas.
              </p>
            </app-feature-card>

            @if (kpisLoaded()) {
              @for (kpi of kpis; track kpi.id) {
                <app-kpi-card [data]="kpi" />
              }
            } @else {
              @for (i of [1, 2, 3, 4]; track i) {
                <app-kpi-card-skeleton size="1x1" />
              }
            }

            <app-category-breakdown-card
              title="Alumnos por categoría"
              [items]="alumnosPorCategoria"
              totalLabel="Total alumnos"
              variant="success"
              size="2x2"
              [inGrid]="true"
              detailLabelSingular="alumno"
              detailLabelPlural="alumnos"
            >
              <i slot="icon" class="pi pi-users text-success"></i>
            </app-category-breakdown-card>

            <app-data-table-card
              title="Listado de alumnos"
              [data]="alumnos"
              [columns]="columnas"
              size="3x2"
              [inGrid]="true"
              [paginator]="true"
              [rows]="5"
              [striped]="true"
              [recordsLabel]="alumnos.length + ' alumnos'"
            />
          </section>
        </div>
      }
    </div>
  `,
})
export class Pagina3Component implements OnInit {
  private gsap = inject(GsapAnimationsService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  kpisLoaded = signal(false);
  contentRef = viewChild<ElementRef<HTMLElement>>('content');
  grid = viewChild<ElementRef<HTMLElement>>('grid');

  kpis: KpiData[] = [
    { id: '1', label: 'Activos', value: 234, valueDisplay: '234', icon: 'pi pi-users', trend: 'up', trendValue: '+8% mes' },
    { id: '2', label: 'Nuevos este mes', value: 18, valueDisplay: '18', icon: 'pi pi-user-plus', subtitle: 'Matrículas' },
    { id: '3', label: 'En prácticas', value: 42, valueDisplay: '42', icon: 'pi pi-car', trend: 'up', trendValue: 'vs ayer' },
    { id: '4', label: 'Pendientes pago', value: 12, valueDisplay: '12', icon: 'pi pi-dollar', trend: 'down', trendValue: '3 pagados hoy' },
  ];

  alumnosPorCategoria: CategoryBreakdownItem[] = [
    { id: '1', label: 'Clase B', value: 156, count: 156 },
    { id: '2', label: 'Profesional', value: 48, count: 48 },
    { id: '3', label: 'Clase C', value: 22, count: 22 },
    { id: '4', label: 'Otros', value: 8, count: 8 },
  ];

  alumnos: Alumno[] = [
    { id: '1', nombre: 'María González', rut: '12.345.678-9', categoria: 'Clase B', estado: 'Activo', proximaClase: 'Práctica 15' },
    { id: '2', nombre: 'Juan Pérez', rut: '19.876.543-2', categoria: 'Profesional', estado: 'Examen pendiente', proximaClase: 'Examen teórico' },
    { id: '3', nombre: 'Ana Martínez', rut: '15.234.567-8', categoria: 'Clase B', estado: 'Activo', proximaClase: 'Práctica 8' },
    { id: '4', nombre: 'Carlos López', rut: '11.222.333-4', categoria: 'Clase C', estado: 'Activo', proximaClase: 'Práctica 3' },
    { id: '5', nombre: 'Laura Fernández', rut: '18.765.432-1', categoria: 'Clase B', estado: 'Pago pendiente', proximaClase: '—' },
    { id: '6', nombre: 'Pedro Sánchez', rut: '14.567.890-3', categoria: 'Profesional', estado: 'Activo', proximaClase: 'Práctica 22' },
  ];

  columnas: DataTableColumnConfig<Alumno>[] = [
    { field: 'nombre', header: 'Nombre', cellClass: 'font-semibold' },
    { field: 'rut', header: 'RUT', cellClass: 'text-muted tabular-nums' },
    {
      field: 'categoria',
      header: 'Categoría',
      cellType: 'chip',
      badgeClassFn: (v) => {
        const s = String(v);
        if (s === 'Clase B') return 'chip-concepto-clase-b';
        if (s === 'Profesional') return 'chip-concepto-profesional';
        if (s === 'Clase C') return 'chip-concepto-psicotecnico';
        return 'chip-concepto-otro';
      },
    },
    {
      field: 'estado',
      header: 'Estado',
      cellType: 'chip',
      badgeClassFn: (v) => {
        const s = String(v);
        if (s === 'Activo') return 'estado-success';
        if (s === 'Examen pendiente') return 'estado-warning';
        return 'estado-error';
      },
    },
    { field: 'proximaClase', header: 'Próxima clase' },
  ];

  constructor() {
    effect(() => {
      if (!this.loading()) {
        setTimeout(() => {
          const contentEl = this.contentRef()?.nativeElement;
          if (contentEl) this.gsap.animateSkeletonToContent(contentEl);

          const gridEl = this.grid()?.nativeElement;
          if (gridEl) {
            this.gsap.animateBentoGrid(gridEl);
            Array.from(gridEl.children).forEach((el) => {
              if (el instanceof HTMLElement) this.gsap.addCardHover(el);
            });
          }
        }, 0);
      }
    });

    effect(() => {
      if (this.kpisLoaded()) {
        setTimeout(() => {
          const gridEl = this.grid()?.nativeElement;
          if (gridEl) {
            const children = Array.from(gridEl.children) as HTMLElement[];
            const kpiCards = children.filter((el) => el.tagName?.toLowerCase() === 'app-kpi-card');
            kpiCards.forEach((el, i) => this.gsap.fadeIn(el, i * 0.1));
            kpiCards.forEach((el) => this.gsap.addCardHover(el));
          }
        }, 0);
      }
    });
  }

  ngOnInit(): void {
    timer(FAKE_LOADING_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loading.set(false));

    timer(FAKE_LOADING_MS + KPI_DELAY_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.kpisLoaded.set(true));
  }
}
