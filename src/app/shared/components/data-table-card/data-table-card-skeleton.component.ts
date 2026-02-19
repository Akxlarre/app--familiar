import {
  Component,
  input,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Skeleton } from 'primeng/skeleton';

/**
 * Skeleton que replica el layout de DataTableCardComponent.
 * Usar durante la carga de datos de tablas.
 */
@Component({
  selector: 'app-data-table-card-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton],
  host: {
    '[class]': 'hostClasses()',
    'aria-busy': 'true',
    'aria-label': 'Cargando tabla',
  },
  template: `
    <div class="data-table-skeleton">
      <header class="data-table-skeleton__header">
        <p-skeleton
          shape="rectangle"
          animation="wave"
          borderRadius="var(--radius-sm)"
          width="12rem"
          height="1.5rem"
        />
      </header>

      <div class="data-table-skeleton__table">
        <div class="data-table-skeleton__row data-table-skeleton__row--header">
          @for (i of [1, 2, 3, 4]; track i) {
            <p-skeleton
              shape="rectangle"
              animation="wave"
              borderRadius="var(--radius-sm)"
              width="100%"
              height="0.875rem"
            />
          }
        </div>
        @for (row of rows(); track row) {
          <div class="data-table-skeleton__row">
            @for (col of [1, 2, 3, 4]; track col) {
              <p-skeleton
                shape="rectangle"
                animation="wave"
                borderRadius="var(--radius-sm)"
                [width]="col === 1 ? '80%' : '60%'"
                height="0.875rem"
              />
            }
          </div>
        }
        <div class="data-table-skeleton__paginator">
          <p-skeleton
            shape="rectangle"
            animation="wave"
            borderRadius="var(--radius-md)"
            width="8rem"
            height="2rem"
          />
          <p-skeleton
            shape="rectangle"
            animation="wave"
            borderRadius="var(--radius-sm)"
            width="4rem"
            height="0.875rem"
          />
        </div>
      </div>
    </div>
  `,
  styleUrl: './data-table-card-skeleton.component.scss',
})
export class DataTableCardSkeletonComponent {
  size = input<'2x2' | '3x2' | 'hero'>('3x2');
  /** Número de filas skeleton a mostrar. Por defecto 5. */
  rowCount = input(5);

  rows = computed(() => Array.from({ length: this.rowCount() }, (_, i) => i));

  protected hostClasses = computed(() => `bento-${this.size()}`);
}
