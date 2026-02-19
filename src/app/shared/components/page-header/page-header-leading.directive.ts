import { Directive } from '@angular/core';

/**
 * Directiva para el slot leading (icono) en app-page-header.
 * Uso: <ng-container appPageHeaderLeading><i class="pi pi-users"></i></ng-container>
 */
@Directive({
  selector: '[appPageHeaderLeading]',
  standalone: true,
})
export class PageHeaderLeadingDirective {}
