import {
  Component,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Skeleton } from 'primeng/skeleton';
import { PageHeaderSkeletonComponent } from '@shared/components/page-header';
import { KpiCardSkeletonComponent } from '@shared/components/kpi-card/kpi-card-skeleton.component';
import { FeatureCardSkeletonComponent } from '@shared/components/feature-card/feature-card-skeleton.component';
import { CategoryBreakdownCardSkeletonComponent } from '@shared/components/category-breakdown-card/category-breakdown-card-skeleton.component';
import { DataTableCardSkeletonComponent } from '@shared/components/data-table-card';

export type PageContentSkeletonVariant = 'simple' | 'bento';

/**
 * Skeleton genérico para páginas.
 * - simple: header + card de contenido (layout básico)
 * - bento: header + bento-grid con KPIs, feature, breakdown, tabla
 */
@Component({
  selector: 'app-page-content-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Skeleton,
    PageHeaderSkeletonComponent,
    KpiCardSkeletonComponent,
    FeatureCardSkeletonComponent,
    CategoryBreakdownCardSkeletonComponent,
    DataTableCardSkeletonComponent,
  ],
  host: {
    'aria-busy': 'true',
    'aria-label': 'Cargando página',
  },
  template: `
    <div class="page-skeleton">
      <app-page-header-skeleton />

      @if (variant() === 'simple') {
        <div class="page-skeleton__card">
          <p-skeleton
            shape="rectangle"
            animation="wave"
            borderRadius="var(--radius-sm)"
            width="100%"
            height="0.875rem"
          />
          <p-skeleton
            shape="rectangle"
            animation="wave"
            borderRadius="var(--radius-sm)"
            width="90%"
            height="0.875rem"
          />
          <p-skeleton
            shape="rectangle"
            animation="wave"
            borderRadius="var(--radius-sm)"
            width="75%"
            height="0.875rem"
          />
        </div>
      } @else {
        <div class="page-skeleton__bento bento-grid" role="presentation">
          <app-feature-card-skeleton size="hero" [hasIcon]="true" />
          @for (i of [1, 2, 3, 4]; track i) {
            <app-kpi-card-skeleton size="1x1" />
          }
          <app-category-breakdown-card-skeleton size="2x2" [hasIcon]="true" />
          <app-data-table-card-skeleton size="3x2" [rowCount]="5" />
        </div>
      }
    </div>
  `,
  styleUrl: './page-content-skeleton.component.scss',
})
export class PageContentSkeletonComponent {
  variant = input<PageContentSkeletonVariant>('bento');
}
