import {
  Component,
  input,
  output,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';

export type AlertSeverity = 'error' | 'warning' | 'info' | 'success';

/**
 * AlertCard — UX/UI moderno 2026.
 * Leading accent, icono en contenedor, jerarquía clara.
 * Tokens del design system (state-error, state-warning, etc.).
 */
@Component({
  selector: 'app-alert-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PressFeedbackDirective],
  host: {
    class: 'alert-card',
    '[class.alert-card--error]': 'severity() === "error"',
    '[class.alert-card--warning]': 'severity() === "warning"',
    '[class.alert-card--info]': 'severity() === "info"',
    '[class.alert-card--success]': 'severity() === "success"',
    role: 'alert',
  },
  template: `
    <div class="alert-card__accent"></div>
    <div class="alert-card__inner">
      <div class="alert-card__icon-wrap">
        <i [class]="iconClass()" class="alert-card__icon"></i>
      </div>
      <div class="alert-card__content">
        <h3 class="alert-card__title">{{ title() }}</h3>
        <div class="alert-card__body">
          <ng-content />
        </div>
        @if (actionLabel()) {
          <button
            type="button"
            class="alert-card__action"
            appPressFeedback
            (click)="action.emit()"
          >
            {{ actionLabel() }}
            @if (actionIcon()) {
              <i [class]="'pi ' + actionIcon()"></i>
            }
          </button>
        }
      </div>
      @if (dismissible()) {
        <button
          type="button"
          class="alert-card__dismiss"
          appPressFeedback
          (click)="dismissed.emit()"
          aria-label="Cerrar"
        >
          <i class="pi pi-times"></i>
        </button>
      }
    </div>
  `,
  styleUrl: './alert-card.component.scss',
})
export class AlertCardComponent {
  severity = input<AlertSeverity>('info');
  title = input.required<string>();
  actionLabel = input<string>();
  actionIcon = input<string>();
  dismissible = input<boolean>(false);

  action = output<void>();
  dismissed = output<void>();

  protected iconClass = computed(() => {
    const s = this.severity();
    const icons: Record<AlertSeverity, string> = {
      error: 'pi pi-times-circle',
      warning: 'pi pi-exclamation-triangle',
      info: 'pi pi-info-circle',
      success: 'pi pi-check-circle',
    };
    return icons[s] ?? icons.info;
  });
}
