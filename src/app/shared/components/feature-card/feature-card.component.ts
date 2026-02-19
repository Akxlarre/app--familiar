import {
    Component,
    input,
    ChangeDetectionStrategy,
    computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type CardSize =
    | '1x1'
    | '2x1'
    | '3x1'
    | '4x1'
    | '2x2'
    | '3x2'
    | 'hero';

@Component({
    selector: 'app-feature-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
    host: {
        '[class]': 'hostClasses()',
        '[attr.aria-label]': 'title()',
        'role': 'region'
    },
    template: `
    <header class="card__header">
      @if (hasIcon()) {
        <div class="card__icon">
          <ng-content select="[slot=icon]" />
        </div>
      }
      <div class="card__meta">
        <h3 class="card__title">{{ title() }}</h3>
        @if (badge()) {
          <span class="card__badge">{{ badge() }}</span>
        }
      </div>
    </header>

    <div class="card__body">
      <ng-content />
    </div>

    @if (hasFooter()) {
      <footer class="card__footer">
        <ng-content select="[slot=footer]" />
      </footer>
    }
  `,
    styleUrl: './feature-card.component.scss',
})
export class FeatureCardComponent {
    title = input.required<string>();
    badge = input<string>();
    size = input<CardSize>('2x1');
    accent = input(false);
    tinted = input(false);
    hasFooter = input(false);
    hasIcon = input(true);
    /** When true, card starts hidden for GSAP animateBentoGrid (direct grid children) */
    inGrid = input(false);

    protected hostClasses = computed(() => {
        const classes = ['card', `bento-${this.size()}`];

        if (this.accent()) classes.push('card-accent');
        if (this.tinted()) classes.push('card-tinted');
        if (this.inGrid()) classes.push('card--animate-entry');

        return classes.join(' ');
    });
}
