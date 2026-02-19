import { Directive } from '@angular/core';

/**
 * Directiva para marcar el slot de acciones en app-page-header.
 * Uso: <ng-container appPageHeaderTrailing>...</ng-container>
 */
@Directive({
  selector: '[appPageHeaderTrailing]',
  standalone: true,
})
export class PageHeaderTrailingDirective {}
