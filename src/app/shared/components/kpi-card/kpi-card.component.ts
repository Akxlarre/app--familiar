import {
  Component,
  input,
  computed,
  ChangeDetectionStrategy,
  AfterViewInit,
  inject,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';

/** Tamaños soportados para KPI en bento-grid */
export type KpiCardSize = '1x1' | '2x1';

/**
 * Datos para renderizar una KPI Card.
 *
 * @example Con contador animado (sin valueDisplay)
 * ```ts
 * { id: '1', label: 'Alumnos', value: 234, suffix: '', icon: 'pi pi-users', trend: 'up', trendValue: '+12%' }
 * ```
 *
 * @example Con valor formateado fijo (valueDisplay)
 * ```ts
 * { id: '2', label: 'Ingresos', value: 82, valueDisplay: '$8.2M', icon: 'pi pi-dollar' }
 * ```
 *
 * @example Con subtitle
 * ```ts
 * { id: '3', label: 'Vehículos', value: 8, valueDisplay: '8 / 12', subtitle: 'En uso / Total' }
 * ```
 */
export interface KpiData {
  id: string;
  label: string;
  value: number;
  /** Sufijo para contador animado (ej. '%', 'hrs'). Usar con value, sin valueDisplay. */
  suffix?: string;
  /** Valor formateado fijo. Si se define, desactiva la animación de contador. Ej: "$8.2M", "8 / 12" */
  valueDisplay?: string;
  /** Texto secundario bajo el label. Ej: "12 prácticas, 6 teóricas", "En uso / Total" */
  subtitle?: string;
  /** Clase PrimeIcons. Ej: "pi pi-users", "pi pi-dollar" */
  icon?: string;
  /** Dirección del trend. Si se usa, incluir trendValue para el texto. */
  trend?: 'up' | 'down' | 'neutral';
  /** Texto del trend. Ej: "+12% vs mes anterior" */
  trendValue?: string;
}

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    '[class]': 'hostClasses()',
    '[attr.aria-label]': 'data().label'
  },
  template: `
    <div class="kpi-card">
      @if (data().icon) {
        <div class="kpi-card__icon">
          <i [class]="data().icon"></i>
        </div>
      }

      <div class="kpi-card__content">
        @if (data().valueDisplay) {
          <div class="kpi-card__value tabular-nums">{{ data().valueDisplay }}</div>
        } @else {
          <div #counter class="kpi-card__value tabular-nums">0{{ data().suffix || '' }}</div>
        }
        <div class="kpi-card__label">{{ data().label }}</div>
        @if (data().subtitle) {
          <div class="kpi-card__subtitle">{{ data().subtitle }}</div>
        }
        @if (data().trend) {
          <div class="kpi-card__trend" [attr.data-trend]="data().trend">
            @if (data().trend === 'up') {
              <i class="pi pi-arrow-up"></i>
            } @else if (data().trend === 'down') {
              <i class="pi pi-arrow-down"></i>
            }
            @if (data().trendValue) {
              <span>{{ data().trendValue }}</span>
            }
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './kpi-card.component.scss',
})
export class KpiCardComponent implements AfterViewInit {
  private gsap = inject(GsapAnimationsService);

  data = input.required<KpiData>();
  /** Tamaño en bento-grid. Por defecto '1x1'. */
  size = input<KpiCardSize>('1x1');
  counter = viewChild<ElementRef<HTMLElement>>('counter');

  protected hostClasses = computed(() =>
    ['card', 'card-tinted', `bento-${this.size()}`].join(' ')
  );

  ngAfterViewInit(): void {
    const d = this.data();
    if (!d.valueDisplay) {
      const counterEl = this.counter();
      if (counterEl) {
        setTimeout(() => {
          this.gsap.animateCounter(counterEl.nativeElement, d.value, d.suffix || '');
        }, 300);
      }
    }
  }
}
