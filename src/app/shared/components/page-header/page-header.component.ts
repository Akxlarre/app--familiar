import {
  Component,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * Cabecera de página con título, descripción, parent link opcional,
 * slot leading y trailing. Alineado con design system (capas, profundidad).
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  host: {
    class: 'page-header',
    role: 'banner',
  },
  template: `
    <div class="page-header__container">
      @if (parentHref()) {
        <a
          [routerLink]="parentHref()"
          class="page-header__parent"
          [attr.aria-label]="parentLabel() || 'Volver'"
        >
          <i class="pi pi-arrow-left"></i>
          {{ parentLabel() || 'Volver' }}
        </a>
      }

      <div class="page-header__main">
        @if (hasLeading()) {
          <div class="page-header__leading">
            <ng-content select="[appPageHeaderLeading]" />
          </div>
        }
        <div class="page-header__text">
          <h1 class="page-header__title" [id]="titleId()">
            {{ title() }}
          </h1>
          @if (description()) {
            <p class="page-header__description">
              {{ description() }}
            </p>
          }
        </div>
        <div class="page-header__trailing">
          <ng-content select="[appPageHeaderTrailing]" />
        </div>
      </div>
    </div>
  `,
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  title = input.required<string>();
  description = input<string>();

  /** Ruta del enlace "volver" (ej: '/alumnos'). Si no se pasa, no se muestra. */
  parentHref = input<string | undefined>(undefined);

  /** Etiqueta del parent link. Default: 'Volver' */
  parentLabel = input<string>('Volver');

  /** Si hay contenido en el slot leading */
  hasLeading = input<boolean>(false);

  /** ID para el h1 (accesibilidad) */
  titleId = input<string>('page-title');
}
