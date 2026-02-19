import {
  Component,
  input,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Skeleton } from 'primeng/skeleton';
import type { CategoryBreakdownSize } from './category-breakdown-card.types';

/**
 * Skeleton que replica el layout de CategoryBreakdownCardComponent.
 * Usar durante la carga de datos de desglose por categoría.
 */
@Component({
  selector: 'app-category-breakdown-card-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton],
  host: {
    '[class]': 'hostClasses()',
    'aria-busy': 'true',
    'aria-label': 'Cargando desglose por categoría',
  },
  template: `
    <header class="category-breakdown-skeleton__header">
      @if (hasIcon()) {
        <p-skeleton
          shape="rectangle"
          animation="wave"
          borderRadius="var(--radius-md)"
          width="40px"
          height="40px"
        />
      }
      <p-skeleton
        shape="rectangle"
        animation="wave"
        borderRadius="var(--radius-sm)"
        width="60%"
        height="1.25rem"
      />
    </header>

    <div class="category-breakdown-skeleton__body">
      @for (i of [1, 2, 3, 4, 5]; track i) {
        <div class="category-breakdown-skeleton__row">
          <div class="category-breakdown-skeleton__row-header">
            <p-skeleton
              shape="rectangle"
              animation="wave"
              borderRadius="var(--radius-sm)"
              width="40%"
              height="0.875rem"
            />
            <p-skeleton
              shape="rectangle"
              animation="wave"
              borderRadius="var(--radius-sm)"
              width="3rem"
              height="0.75rem"
            />
          </div>
          <p-skeleton
            shape="rectangle"
            animation="wave"
            borderRadius="var(--radius-full)"
            width="100%"
            height="8px"
          />
          <div class="category-breakdown-skeleton__row-footer">
            <p-skeleton
              shape="rectangle"
              animation="wave"
              borderRadius="var(--radius-sm)"
              width="4rem"
              height="0.875rem"
            />
            <p-skeleton
              shape="rectangle"
              animation="wave"
              borderRadius="var(--radius-sm)"
              width="2.5rem"
              height="0.75rem"
            />
          </div>
        </div>
      }
    </div>

    <div class="category-breakdown-skeleton__total">
      <p-skeleton
        shape="rectangle"
        animation="wave"
        borderRadius="var(--radius-sm)"
        width="6rem"
        height="1rem"
      />
      <p-skeleton
        shape="rectangle"
        animation="wave"
        borderRadius="var(--radius-sm)"
        width="5rem"
        height="1.25rem"
      />
    </div>
  `,
  styleUrl: './category-breakdown-card-skeleton.component.scss',
})
export class CategoryBreakdownCardSkeletonComponent {
  size = input<CategoryBreakdownSize>('2x2');
  accent = input(false);
  tinted = input(false);
  hasIcon = input(true);
  inGrid = input(false);

  protected hostClasses = computed(() => {
    const classes = ['category-breakdown', 'card', `bento-${this.size()}`];
    if (this.accent()) classes.push('card-accent');
    if (this.tinted()) classes.push('card-tinted');
    if (this.inGrid()) classes.push('card--animate-entry');
    return classes.join(' ');
  });
}
