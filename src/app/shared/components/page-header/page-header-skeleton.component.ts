import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Skeleton } from 'primeng/skeleton';

/**
 * Skeleton que replica el layout de PageHeaderComponent.
 * Usar durante la carga de datos de la página.
 */
@Component({
  selector: 'app-page-header-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton],
  host: {
    class: 'page-header-skeleton',
    'aria-busy': 'true',
    'aria-label': 'Cargando cabecera',
  },
  template: `
    <div class="page-header-skeleton__container">
      <div class="page-header-skeleton__main">
        <div class="page-header-skeleton__text">
          <p-skeleton
            shape="rectangle"
            animation="wave"
            borderRadius="var(--radius-md)"
            width="14rem"
            height="2rem"
          />
          <p-skeleton
            shape="rectangle"
            animation="wave"
            borderRadius="var(--radius-sm)"
            width="10rem"
            height="1.25rem"
          />
        </div>
        <p-skeleton
          shape="rectangle"
          animation="wave"
          borderRadius="var(--radius-full)"
          width="8rem"
          height="2.5rem"
        />
      </div>
    </div>
  `,
  styleUrl: './page-header-skeleton.component.scss',
})
export class PageHeaderSkeletonComponent {}
