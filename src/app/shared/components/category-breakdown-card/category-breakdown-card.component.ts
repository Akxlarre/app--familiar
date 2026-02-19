import {
  Component,
  input,
  output,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  CategoryBreakdownItem,
  CategoryBreakdownVariant,
  CategoryBreakdownSize,
} from './category-breakdown-card.types';

/** Formatea un número como moneda CLP (ej: $1.200.000) */
function formatClp(value: number): string {
  return (
    '$' +
    Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  );
}

@Component({
  selector: 'app-category-breakdown-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    '[class]': 'hostClasses()',
    '[attr.aria-label]': 'title()',
    role: 'region',
  },
  template: `
    <header class="category-breakdown__header">
      @if (hasIcon()) {
        <div class="category-breakdown__icon">
          <ng-content select="[slot=icon]" />
        </div>
      }
      <div class="category-breakdown__meta">
        <h3 class="category-breakdown__title">{{ title() }}</h3>
      </div>
    </header>

    <div class="category-breakdown__body" role="list">
      @for (item of processedItems(); track item.id) {
        <div
          class="category-breakdown__row"
          role="listitem"
          [class.category-breakdown__row--clickable]="itemClickable()"
          (click)="onItemClick(item)"
          (keydown.enter)="onItemClick(item)"
          (keydown.space)="onItemClick(item); $event.preventDefault()"
          [attr.tabindex]="itemClickable() ? 0 : null"
        >
          <div class="category-breakdown__row-header">
            <span class="category-breakdown__label">{{ item.label }}</span>
            @if (showDetailLabel() && item.count != null) {
              <span class="category-breakdown__detail text-muted">
                {{ item.count }} {{ item.count === 1 ? detailLabelSingular() : detailLabelPlural() }}
              </span>
            }
          </div>

          <div
            class="category-breakdown__bar"
            role="progressbar"
            [attr.aria-valuenow]="item.percentage"
            aria-valuemin="0"
            aria-valuemax="100"
            [attr.aria-label]="item.label + ': ' + item.percentage + '%'"
          >
            <div
              class="category-breakdown__bar-fill"
              [style.width.%]="item.percentage"
              [attr.data-variant]="variant()"
            ></div>
          </div>

          <div class="category-breakdown__row-footer">
            <span
              class="category-breakdown__amount tabular-nums"
              [attr.data-variant]="variant()"
            >
              {{ formatAmountFn()(item.value) }}
            </span>
            <span class="category-breakdown__percent text-muted tabular-nums">
              {{ item.percentage | number : '1.1-1' }}%
            </span>
          </div>
        </div>
      }
    </div>

    <div class="category-breakdown__total">
      <span class="category-breakdown__total-label">{{ totalLabel() }}</span>
      <span
        class="category-breakdown__total-value tabular-nums"
        [attr.data-variant]="variant()"
      >
        {{ formatAmountFn()(totalValue()) }}
      </span>
    </div>

    @if (hasFooter()) {
      <footer class="category-breakdown__footer">
        <ng-content select="[slot=footer]" />
      </footer>
    }
  `,
  styleUrl: './category-breakdown-card.component.scss',
})
export class CategoryBreakdownCardComponent {
  title = input.required<string>();
  items = input.required<CategoryBreakdownItem[]>();
  totalLabel = input<string>('Total');
  variant = input<CategoryBreakdownVariant>('primary');
  size = input<CategoryBreakdownSize>('2x2');
  accent = input(false);
  tinted = input(false);
  inGrid = input(false);
  showDetailLabel = input(true);
  detailLabelSingular = input<string>('operación');
  detailLabelPlural = input<string>('operaciones');
  formatAmount = input<(value: number) => string>(formatClp);
  maxItems = input<number>();
  hasFooter = input(false);
  hasIcon = input(true);
  /** Cuando true, las filas son clickeables y emiten itemClick */
  itemClickable = input(false);

  itemClick = output<CategoryBreakdownItem>();

  formatAmountFn = computed(() => this.formatAmount());

  processedItems = computed(() => {
    const raw = this.items();
    const total = raw.reduce((sum, i) => sum + i.value, 0);
    const max = this.maxItems();

    let itemsToShow = raw;
    let others: CategoryBreakdownItem | null = null;

    if (max != null && raw.length > max) {
      const visible = raw.slice(0, max);
      const rest = raw.slice(max);
      const restValue = rest.reduce((s, i) => s + i.value, 0);
      others = {
        id: 'others',
        label: 'Otros',
        value: restValue,
        count: rest.reduce((s, i) => s + (i.count ?? 0), 0),
      };
      itemsToShow = [...visible, others];
    }

    return itemsToShow.map((item) => {
      const percentage =
        item.percentage ?? (total > 0 ? (item.value / total) * 100 : 0);
      return { ...item, percentage };
    });
  });

  totalValue = computed(() =>
    this.items().reduce((sum, i) => sum + i.value, 0)
  );

  protected hostClasses = computed(() => {
    const classes = [
      'category-breakdown',
      'card',
      `bento-${this.size()}`,
    ];
    if (this.accent()) classes.push('card-accent');
    if (this.tinted()) classes.push('card-tinted');
    if (this.inGrid()) classes.push('card--animate-entry');
    return classes.join(' ');
  });

  onItemClick(item: CategoryBreakdownItem): void {
    if (this.itemClickable()) {
      this.itemClick.emit(item);
    }
  }
}
