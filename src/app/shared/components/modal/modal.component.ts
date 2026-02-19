import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  viewChild,
  ElementRef,
  HostListener,
  input,
  output,
  effect,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';

/**
 * Modal centrado con backdrop, animaciones GSAP y accesibilidad.
 * Usa GsapAnimationsService.animatePanelIn/Out para entrada/salida.
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PressFeedbackDirective],
  template: `
    @if (isOpen()) {
      <div
        class="modal__backdrop"
        (click)="dismissible() && close()"
        [attr.aria-hidden]="true"
      ></div>
      <div
        #dialog
        class="modal__dialog"
        role="dialog"
        [attr.aria-modal]="true"
        [attr.aria-labelledby]="title() ? 'modal-title' : null"
        [attr.aria-label]="title() || ariaLabel()"
        (keydown)="onDialogKeydown($event)"
      >
        @if (title() || showCloseButton()) {
          <header class="modal__header">
            @if (title()) {
              <h2 id="modal-title" class="modal__title">{{ title() }}</h2>
            }
            @if (showCloseButton()) {
              <button
                type="button"
                class="modal__close"
                appPressFeedback
                (click)="close()"
                aria-label="Cerrar"
              >
                <i class="pi pi-times"></i>
              </button>
            }
          </header>
        }
        <div class="modal__body">
          <ng-content />
        </div>
        <div class="modal__footer">
          <ng-content select="[appModalFooter]" />
        </div>
      </div>
    }
  `,
  styleUrl: './modal.component.scss',
})
export class ModalComponent implements AfterViewInit {
  private gsap = inject(GsapAnimationsService);
  private host = inject(ElementRef<HTMLElement>);

  dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  /** Controla visibilidad. El padre debe gestionar el estado. */
  isOpen = input<boolean>(false);

  /** Título del modal (opcional). Si se proporciona, se muestra header con X. */
  title = input<string | undefined>(undefined);

  /** Si se puede cerrar con backdrop o Escape. Default true. */
  dismissible = input<boolean>(true);

  /** Mostrar botón X en el header. Default true cuando hay título. */
  showCloseButton = input<boolean>(true);

  /** Etiqueta ARIA cuando no hay título. */
  ariaLabel = input<string>('Diálogo');

  /** Emitido al cerrar (X, Escape, click en backdrop). */
  closed = output<void>();

  private isOpenEffect = effect(() => {
    const open = this.isOpen();
    if (open) {
      setTimeout(() => this.animateIn(), 10);
    }
  });

  ngAfterViewInit(): void {
    // Si ya está abierto al montar (ej. ruta directa), animar
    if (this.isOpen()) {
      setTimeout(() => this.animateIn(), 10);
    }
  }

  /** Cierra el modal con animación. */
  close(): void {
    if (!this.dismissible()) return;

    const dialogEl = this.dialog()?.nativeElement;
    if (dialogEl) {
      this.gsap.animatePanelOut(dialogEl, () => {
        this.closed.emit();
      });
    } else {
      this.closed.emit();
    }
  }

  private animateIn(): void {
    const dialogEl = this.dialog()?.nativeElement;
    if (dialogEl) {
      this.gsap.animatePanelIn(dialogEl);
      this.focusFirstFocusable(dialogEl);
    }
  }

  private focusFirstFocusable(container: HTMLElement): void {
    const focusable = container.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  }

  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.dismissible()) {
      event.preventDefault();
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen() && this.dismissible()) this.close();
  }
}
