import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

/**
 * Estado vacío unificado para listas, búsquedas, notificaciones.
 * Usa tokens del design system.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule],
  host: {
    class: 'empty-state',
    role: 'status',
    '[attr.aria-label]': 'message()',
  },
  template: `
    <i [class]="'pi ' + (icon() ?? 'pi-inbox') + ' empty-state__icon'" aria-hidden="true"></i>
    <p class="empty-state__message">{{ message() }}</p>
    @if (subtitle()) {
      <p class="empty-state__subtitle">{{ subtitle() }}</p>
    }
    @if (actionLabel(); as label) {
      <button
        type="button"
        pButton
        [label]="label"
        [icon]="actionIcon() ?? 'pi pi-plus'"
        severity="secondary"
        size="small"
        (click)="action.emit()"
      ></button>
    }
  `,
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  /** Mensaje principal */
  message = input.required<string>();

  /** Subtítulo opcional */
  subtitle = input<string>();

  /** Icono PrimeIcons (ej: pi-inbox, pi-search). Default: pi-inbox */
  icon = input<string>();

  /** Etiqueta del botón de acción (si se muestra) */
  actionLabel = input<string>();

  /** Icono del botón (ej: pi-plus). Default: pi-plus */
  actionIcon = input<string>();

  /** Emitido al hacer clic en el botón de acción */
  action = output<void>();
}
