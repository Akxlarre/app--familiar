import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ModalComponent, ModalFooterDirective } from '@shared/components/modal';
import { ModalOverlayDirective } from '@core/directives/modal-overlay.directive';
import { ConfirmModalService } from '@core/services/confirm-modal.service';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ButtonModule,
    ModalComponent,
    ModalFooterDirective,
    ModalOverlayDirective,
  ],
  template: `
    <app-modal
      [appModalOverlay]="confirmModal.isOpen()"
      [isOpen]="confirmModal.isOpen()"
      (closed)="confirmModal.cancel()"
      [title]="config()?.title ?? ''"
    >
      @if (config(); as c) {
        <p class="text-secondary">{{ c.message }}</p>
      }
      @if (config(); as c) {
        <ng-container appModalFooter>
          <button
            type="button"
            pButton
            [label]="c.cancelLabel ?? 'Cancelar'"
            severity="secondary"
            (click)="confirmModal.cancel()"
          ></button>
          <button
            type="button"
            pButton
            [label]="c.confirmLabel ?? 'Aceptar'"
            [severity]="buttonSeverity()"
            (click)="confirmModal.accept()"
          ></button>
        </ng-container>
      }
    </app-modal>
  `,
})
export class ConfirmModalComponent {
  protected confirmModal = inject(ConfirmModalService);

  protected config = this.confirmModal.config;

  /** Mapea ConfirmSeverity a severity de pButton. */
  protected buttonSeverity = computed(() => {
    const s = this.config()?.severity ?? 'secondary';
    return s as 'danger' | 'warn' | 'success' | 'info' | 'secondary';
  });
}
