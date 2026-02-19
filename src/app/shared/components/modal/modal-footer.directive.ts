import { Directive } from '@angular/core';

/**
 * Directiva para proyectar contenido en el footer del modal.
 * Uso: <ng-container appModalFooter>...</ng-container>
 */
@Directive({
  selector: '[appModalFooter]',
  standalone: true,
})
export class ModalFooterDirective {}
