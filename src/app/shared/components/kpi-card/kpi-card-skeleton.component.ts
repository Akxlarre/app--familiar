import {
  Component,
  input,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Skeleton } from 'primeng/skeleton';

/** Tamaños soportados para KPI skeleton (debe coincidir con KpiCardComponent) */
export type KpiCardSkeletonSize = '1x1' | '2x1';

/**
 * Skeleton que replica el layout de KpiCardComponent.
 * Usar durante la carga de datos de KPIs.
 */
@Component({
  selector: 'app-kpi-card-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton],
  host: {
    '[class]': 'hostClasses()',
    'aria-busy': 'true',
    'aria-label': 'Cargando indicador',
  },
  template: `
    <div class="kpi-card-skeleton">
      <p-skeleton
        shape="rectangle"
        animation="wave"
        borderRadius="var(--radius-md)"
        width="48px"
        height="48px"
      />

      <div class="kpi-card-skeleton__content">
        <p-skeleton
          shape="rectangle"
          animation="wave"
          borderRadius="var(--radius-sm)"
          width="60%"
          height="2rem"
        />
        <p-skeleton
          shape="rectangle"
          animation="wave"
          borderRadius="var(--radius-sm)"
          width="80%"
          height="0.875rem"
        />
        <p-skeleton
          shape="rectangle"
          animation="wave"
          borderRadius="var(--radius-full)"
          width="70%"
          height="1.25rem"
        />
      </div>
    </div>
  `,
  styleUrl: './kpi-card-skeleton.component.scss',
})
export class KpiCardSkeletonComponent {
  /** Tamaño en bento-grid. Por defecto '1x1'. */
  size = input<KpiCardSkeletonSize>('1x1');

  protected hostClasses = computed(() =>
    ['card', 'card-tinted', `bento-${this.size()}`].join(' ')
  );
}
