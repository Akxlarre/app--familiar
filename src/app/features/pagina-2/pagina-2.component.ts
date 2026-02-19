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

interface Vehiculo {
  id: string;
  patente: string;
  marca: string;
  tipo: string;
  estado: string;
  kmActual: number;
}

@Component({
  selector: 'app-pagina-2',
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
            <h1 class="text-3xl font-bold font-display text-primary">Vehículos</h1>
            <p class="text-secondary text-lg">Gestión de flota — Operación</p>
          </div>

          <section #grid class="bento-grid" appBentoGridLayout aria-label="Panel vehículos">
            <app-feature-card
              title="Resumen de flota"
              size="hero"
              [accent]="true"
              [hasIcon]="false"
              [inGrid]="true"
            >
              <p class="text-secondary">
                Control de vehículos disponibles, en uso y en mantención. Revisa el estado de cada unidad.
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
              title="Uso por tipo de vehículo"
              [items]="usoPorTipo"
              totalLabel="Total clases"
              variant="primary"
              size="2x2"
              [inGrid]="true"
              detailLabelSingular="clase"
              detailLabelPlural="clases"
            >
              <i slot="icon" class="pi pi-car text-primary"></i>
            </app-category-breakdown-card>

            <app-data-table-card
              title="Vehículos"
              [data]="vehiculos"
              [columns]="columnas"
              size="3x2"
              [inGrid]="true"
              [paginator]="true"
              [rows]="5"
              [striped]="true"
              [recordsLabel]="vehiculos.length + ' vehículos'"
            />
          </section>
        </div>
      }
    </div>
  `,
})
export class Pagina2Component implements OnInit {
  private gsap = inject(GsapAnimationsService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  kpisLoaded = signal(false);
  contentRef = viewChild<ElementRef<HTMLElement>>('content');
  grid = viewChild<ElementRef<HTMLElement>>('grid');

  kpis: KpiData[] = [
    { id: '1', label: 'En uso', value: 5, valueDisplay: '5', icon: 'pi pi-play', trend: 'up', trendValue: 'vs ayer' },
    { id: '2', label: 'Disponibles', value: 7, valueDisplay: '7', icon: 'pi pi-check-circle', subtitle: 'Listos para clase' },
    { id: '3', label: 'En mantención', value: 2, valueDisplay: '2', icon: 'pi pi-wrench', trend: 'down', trendValue: '1 terminada' },
    { id: '4', label: 'Total flota', value: 14, valueDisplay: '14', icon: 'pi pi-car', subtitle: 'Vehículos activos' },
  ];

  usoPorTipo: CategoryBreakdownItem[] = [
    { id: '1', label: 'Clase práctica', value: 156, count: 42 },
    { id: '2', label: 'Clase teórica', value: 89, count: 28 },
    { id: '3', label: 'Examen', value: 34, count: 12 },
    { id: '4', label: 'Otros', value: 21, count: 8 },
  ];

  vehiculos: Vehiculo[] = [
    { id: '1', patente: 'ABC-123', marca: 'Toyota', tipo: 'Yaris', estado: 'En uso', kmActual: 45230 },
    { id: '2', patente: 'DEF-456', marca: 'Hyundai', tipo: 'i20', estado: 'Disponible', kmActual: 32100 },
    { id: '3', patente: 'GHI-789', marca: 'Chevrolet', tipo: 'Spark', estado: 'Mantención', kmActual: 67800 },
    { id: '4', patente: 'JKL-012', marca: 'Kia', tipo: 'Rio', estado: 'Disponible', kmActual: 28900 },
    { id: '5', patente: 'MNO-345', marca: 'Toyota', tipo: 'Yaris', estado: 'En uso', kmActual: 51200 },
    { id: '6', patente: 'PQR-678', marca: 'Hyundai', tipo: 'i20', estado: 'Disponible', kmActual: 19800 },
  ];

  columnas: DataTableColumnConfig<Vehiculo>[] = [
    { field: 'patente', header: 'Patente', cellClass: 'font-semibold' },
    { field: 'marca', header: 'Marca' },
    { field: 'tipo', header: 'Modelo' },
    {
      field: 'estado',
      header: 'Estado',
      cellType: 'chip',
      badgeClassFn: (v) => {
        const s = String(v);
        if (s === 'Disponible') return 'estado-success';
        if (s === 'En uso') return 'estado-info';
        return 'estado-warning';
      },
    },
    { field: 'kmActual', header: 'Km', cellType: 'text', cellClass: 'tabular-nums' },
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
