import {
  Component,
  ChangeDetectionStrategy,
  AfterViewInit,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { KpiCardComponent, KpiData } from '@shared/components/kpi-card/kpi-card.component';
import { KpiCardSkeletonComponent } from '@shared/components/kpi-card/kpi-card-skeleton.component';
import { FeatureCardComponent } from '@shared/components/feature-card/feature-card.component';
import { FeatureCardSkeletonComponent } from '@shared/components/feature-card/feature-card-skeleton.component';
import { TableGalleryComponent } from '@shared/components/table-gallery/table-gallery.component';
import { DataTableCardSkeletonComponent } from '@shared/components/data-table-card';
import { CategoryBreakdownCardComponent } from '@shared/components/category-breakdown-card/category-breakdown-card.component';
import { CategoryBreakdownCardSkeletonComponent } from '@shared/components/category-breakdown-card/category-breakdown-card-skeleton.component';
import type { CategoryBreakdownItem } from '@shared/components/category-breakdown-card/category-breakdown-card.types';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { BentoGridLayoutDirective } from '@core/directives/bento-grid-layout.directive';

@Component({
  selector: 'app-pagina-1',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ButtonModule,
    KpiCardComponent,
    KpiCardSkeletonComponent,
    FeatureCardComponent,
    FeatureCardSkeletonComponent,
    TableGalleryComponent,
    CategoryBreakdownCardComponent,
    CategoryBreakdownCardSkeletonComponent,
    DataTableCardSkeletonComponent,
    BentoGridLayoutDirective,
  ],
  template: `
    <div #container class="flex flex-col gap-8 font-body">
      <div>
        <h1 class="text-3xl font-bold font-display text-primary">Página 1</h1>
        <p class="text-secondary text-lg">Galería de componentes (sandbox temporal)</p>
      </div>

      <!-- === SANDBOX: Skeletons === -->
      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold text-primary">Skeletons</h2>
        <section class="flex flex-col gap-2">
          <h3 class="text-base font-medium text-secondary">KPI Skeletons</h3>
          <div #skeletonKpiGrid class="bento-grid" appBentoGridLayout aria-label="Skeletons KPI">
            @for (i of [1, 2, 3, 4]; track i) {
              <app-kpi-card-skeleton size="1x1" />
            }
          </div>
        </section>
        <section class="flex flex-col gap-2">
          <h3 class="text-base font-medium text-secondary">Feature Card Skeletons</h3>
          <div #skeletonFeatureGrid class="bento-grid" appBentoGridLayout aria-label="Skeletons Feature Cards">
            <app-feature-card-skeleton size="hero" [hasIcon]="true" />
            <app-feature-card-skeleton size="2x1" [hasIcon]="true" />
            <app-feature-card-skeleton size="2x2" [hasIcon]="false" />
          </div>
        </section>
        <section class="flex flex-col gap-2">
          <h3 class="text-base font-medium text-secondary">Category Breakdown Skeletons</h3>
          <div #skeletonBreakdownGrid class="bento-grid" appBentoGridLayout aria-label="Skeletons Category Breakdown">
            <app-category-breakdown-card-skeleton size="2x2" [hasIcon]="true" />
          </div>
        </section>
        <section class="flex flex-col gap-2">
          <h3 class="text-base font-medium text-secondary">Data Table Skeleton</h3>
          <div #skeletonTableGrid class="bento-grid" appBentoGridLayout aria-label="Skeleton Data Table">
            <app-data-table-card-skeleton size="3x2" [rowCount]="5" />
          </div>
        </section>
      </section>

      <!-- === SANDBOX: KPI Cards === -->
      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold text-primary">KPI Cards</h2>
        <div #grid class="bento-grid" appBentoGridLayout aria-label="Galería KPIs">
          @for (kpi of kpis; track kpi.id) {
            <app-kpi-card [data]="kpi" />
          }
        </div>
      </section>

      <!-- === SANDBOX: Feature Cards (variantes) === -->
      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold text-primary">Feature Cards</h2>
        <div #featureGrid class="bento-grid" appBentoGridLayout aria-label="Galería Feature Cards">
          <app-feature-card
            title="Hero con accent"
            size="hero"
            [accent]="true"
            [hasIcon]="false"
            [inGrid]="true"
          >
            <p class="text-secondary">Card hero con borde superior de color primario.</p>
          </app-feature-card>

          <app-feature-card title="Card 2x1 con icono" size="2x1" [inGrid]="true">
            <i class="pi pi-star" slot="icon"></i>
            <p class="text-secondary">Feature card estándar con icono en header.</p>
          </app-feature-card>

          <app-feature-card
            title="Card tinted"
            size="2x1"
            [tinted]="true"
            [inGrid]="true"
          >
            <p class="text-secondary">Variante con fondo tintado (primary suave).</p>
          </app-feature-card>

          <app-feature-card
            title="Card con badge"
            size="2x1"
            [badge]="'Nuevo'"
            [inGrid]="true"
          >
            <p class="text-secondary">Incluye badge opcional en el header.</p>
          </app-feature-card>

          <app-feature-card title="Card 2x2" size="2x2" [inGrid]="true">
            <p class="text-secondary">Tamaño 2x2 para contenido más amplio.</p>
          </app-feature-card>
        </div>
      </section>

      <!-- === SANDBOX: Category Breakdown Cards === -->
      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold text-primary">Category Breakdown Cards</h2>
        <div #breakdownGrid class="bento-grid" appBentoGridLayout aria-label="Galería Category Breakdown">
          <app-category-breakdown-card
            title="Ingresos por Categoría"
            [items]="ingresos"
            totalLabel="Total Ingresos"
            variant="success"
            size="2x2"
            [inGrid]="true"
            detailLabelSingular="operación"
            detailLabelPlural="operaciones"
          >
            <i slot="icon" class="pi pi-arrow-up text-success"></i>
          </app-category-breakdown-card>

          <app-category-breakdown-card
            title="Gastos por Categoría"
            [items]="gastos"
            totalLabel="Total Gastos"
            variant="expense"
            size="2x2"
            [inGrid]="true"
            detailLabelSingular="registro"
            detailLabelPlural="registros"
          >
            <i slot="icon" class="pi pi-arrow-down text-primary"></i>
          </app-category-breakdown-card>
        </div>
      </section>

      <!-- === SANDBOX: Tablas PrimeNG === -->
      <app-table-gallery />

      <!-- === SANDBOX: Botones PrimeNG === -->
      <section class="flex flex-col gap-3">
        <h2 class="text-xl font-semibold text-primary">Botones (PrimeNG)</h2>
        <div class="flex flex-wrap gap-3">
          <p-button label="Primary" icon="pi pi-check" />
          <p-button label="Secondary" severity="secondary" icon="pi pi-plus" />
          <p-button label="Success" severity="success" icon="pi pi-check" />
          <p-button label="Outlined" [outlined]="true" icon="pi pi-search" />
          <p-button label="Text" [text]="true" icon="pi pi-times" />
        </div>
      </section>
    </div>
  `,
})
export class Pagina1Component implements AfterViewInit {
  private gsap = inject(GsapAnimationsService);

  grid = viewChild<ElementRef<HTMLElement>>('grid');
  featureGrid = viewChild<ElementRef<HTMLElement>>('featureGrid');
  breakdownGrid = viewChild<ElementRef<HTMLElement>>('breakdownGrid');
  skeletonKpiGrid = viewChild<ElementRef<HTMLElement>>('skeletonKpiGrid');
  skeletonFeatureGrid = viewChild<ElementRef<HTMLElement>>('skeletonFeatureGrid');
  skeletonBreakdownGrid = viewChild<ElementRef<HTMLElement>>('skeletonBreakdownGrid');
  skeletonTableGrid = viewChild<ElementRef<HTMLElement>>('skeletonTableGrid');

  kpis: KpiData[] = [
    {
      id: '1',
      label: 'Alumnos Activos',
      value: 234,
      suffix: '',
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

  ingresos: CategoryBreakdownItem[] = [
    { id: '1', label: 'Clase B', value: 5040000, count: 18 },
    { id: '2', label: 'Profesional', value: 1200000, count: 12 },
    { id: '3', label: 'Psicotécnico', value: 850000, count: 8 },
    { id: '4', label: 'Clases Extra', value: 680000, count: 15 },
    { id: '5', label: 'Certificados', value: 700000, count: 6 },
  ];

  gastos: CategoryBreakdownItem[] = [
    { id: '1', label: 'Bencina', value: 850000, count: 45 },
    { id: '2', label: 'Arriendo', value: 450000, count: 1 },
    { id: '3', label: 'Sueldos', value: 420000, count: 4 },
    { id: '4', label: 'Mantención', value: 180000, count: 3 },
    { id: '5', label: 'Materiales', value: 150000, count: 12 },
    { id: '6', label: 'Aseo', value: 100000, count: 8 },
    { id: '7', label: 'Otros', value: 60000, count: 5 },
  ];

  ngAfterViewInit(): void {
    const grids = [
      this.grid(),
      this.featureGrid(),
      this.breakdownGrid(),
      this.skeletonKpiGrid(),
      this.skeletonFeatureGrid(),
      this.skeletonBreakdownGrid(),
      this.skeletonTableGrid(),
    ];
    grids.forEach((el) => {
      if (el) {
        this.gsap.animateBentoGrid(el.nativeElement);
        this.addCardHoverToChildren(el.nativeElement);
      }
    });
  }

  private addCardHoverToChildren(container: HTMLElement): void {
    Array.from(container.children).forEach((el) => {
      if (el instanceof HTMLElement) this.gsap.addCardHover(el);
    });
  }
}
