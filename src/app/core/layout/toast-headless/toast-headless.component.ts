import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Mensaje de PrimeNG Toast */
interface ToastMessage {
  severity?: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast';
  summary?: string;
  detail?: string;
  icon?: string;
}

@Component({
  selector: 'app-toast-headless',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="toast-headless-wrapper"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
    >
      <div class="toast-headless-content">
        @if (message().icon) {
          <i [class]="'pi ' + message().icon + ' p-toast-message-icon'" aria-hidden="true"></i>
        } @else {
          @switch (message().severity) {
            @case ('success') {
              <i class="pi pi-check p-toast-message-icon" aria-hidden="true"></i>
            }
            @case ('error') {
              <i class="pi pi-times-circle p-toast-message-icon" aria-hidden="true"></i>
            }
            @case ('warn') {
              <i class="pi pi-exclamation-triangle p-toast-message-icon" aria-hidden="true"></i>
            }
            @default {
              <i class="pi pi-info-circle p-toast-message-icon" aria-hidden="true"></i>
            }
          }
        }
        <div class="p-toast-message-text">
          <div class="p-toast-summary">{{ message().summary }}</div>
          <div class="p-toast-detail">{{ message().detail }}</div>
        </div>
        <button
          type="button"
          class="p-toast-close-button"
          (click)="closeFn()($event)"
          aria-label="Cerrar"
        >
          <i class="pi pi-times p-toast-close-icon" aria-hidden="true"></i>
        </button>
      </div>
      <div class="toast-progress-bar" aria-hidden="true"></div>
    </div>
  `,
})
export class ToastHeadlessComponent {
  message = input.required<ToastMessage>();
  closeFn = input.required<(e: Event) => void>();

  private resumeTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly RESUME_DELAY_MS = 800;

  onMouseEnter(): void {
    if (this.resumeTimeout) {
      clearTimeout(this.resumeTimeout);
      this.resumeTimeout = null;
    }
  }

  onMouseLeave(): void {
    this.resumeTimeout = setTimeout(() => {
      this.resumeTimeout = null;
      this.closeFn()(new MouseEvent('click'));
    }, this.RESUME_DELAY_MS);
  }
}
