import {
  Component,
  input,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Skeleton } from 'primeng/skeleton';

export type FeatureCardSkeletonSize =
  | '1x1'
  | '2x1'
  | '3x1'
  | '4x1'
  | '2x2'
  | '3x2'
  | 'hero';

/**
 * Skeleton que replica el layout de FeatureCardComponent.
 * Usar durante la carga de contenido de feature cards.
 */
@Component({
  selector: 'app-feature-card-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton],
  host: {
    '[class]': 'hostClasses()',
    'aria-busy': 'true',
    'aria-label': 'Cargando tarjeta',
  },
  template: `
    <header class="card-skeleton__header">
      @if (hasIcon()) {
        <p-skeleton
          shape="rectangle"
          animation="wave"
          borderRadius="var(--radius-md)"
          width="40px"
          height="40px"
        />
      }
      <div class="card-skeleton__meta">
        <p-skeleton
          shape="rectangle"
          animation="wave"
          borderRadius="var(--radius-sm)"
          width="70%"
          height="1.25rem"
        />
        <p-skeleton
          shape="rectangle"
          animation="wave"
          borderRadius="var(--radius-full)"
          width="4rem"
          height="1rem"
        />
      </div>
    </header>

    <div class="card-skeleton__body">
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
  `,
  styleUrl: './feature-card-skeleton.component.scss',
})
export class FeatureCardSkeletonComponent {
  size = input<FeatureCardSkeletonSize>('2x1');
  accent = input(false);
  tinted = input(false);
  hasIcon = input(true);
  inGrid = input(false);

  protected hostClasses = computed(() => {
    const classes = ['card', `bento-${this.size()}`];
    if (this.accent()) classes.push('card-accent');
    if (this.tinted()) classes.push('card-tinted');
    if (this.inGrid()) classes.push('card--animate-entry');
    return classes.join(' ');
  });
}
