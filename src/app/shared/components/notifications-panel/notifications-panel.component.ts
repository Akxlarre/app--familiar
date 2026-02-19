import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  viewChild,
  ElementRef,
  HostListener,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsService } from '@core/services/notifications.service';
import type { NotificationFilter } from '@core/services/notifications.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import type { Notification } from '@core/models/notification.model';

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PressFeedbackDirective],
  template: `
    <div class="notifications-panel" #trigger>
      <button
        type="button"
        class="notifications-panel__trigger"
        appPressFeedback
        (click)="toggle()"
        [attr.aria-expanded]="isOpen()"
        [class.notifications-panel__trigger--open]="isOpen()"
        aria-label="Notificaciones"
      >
        <i class="pi pi-bell text-xl"></i>
        @if (unreadCount() > 0) {
          <span class="notifications-panel__badge">
            {{ unreadCount() > 99 ? '99+' : unreadCount() }}
          </span>
        }
      </button>

      @if (isOpen()) {
        <div
          class="notifications-panel__backdrop"
          (click)="close()"
          aria-hidden="true"
        ></div>
        <div
          #container
          class="notifications-container"
          [class.notifications-container--panel]="!isDrawerMode()"
          [class.notifications-container--drawer]="isDrawerMode()"
          role="dialog"
          aria-label="Panel de notificaciones"
        >
          <header class="notifications-container__header">
            <h3 class="notifications-container__title">Notificaciones</h3>
            <div class="notifications-container__header-actions">
              @if (unreadCount() > 0) {
                <button
                  type="button"
                  class="notifications-container__mark-all"
                  (click)="markAllAsRead()"
                >
                  Marcar todas como leídas
                </button>
              }
              @if (isDrawerMode()) {
                <button
                  type="button"
                  class="notifications-container__close"
                  (click)="close()"
                  aria-label="Cerrar"
                >
                  <i class="pi pi-times"></i>
                </button>
              }
            </div>
          </header>

          @if (isDrawerMode()) {
            <div class="notifications-container__filters">
              <button
                type="button"
                class="notifications-container__filter"
                [class.notifications-container__filter--active]="filter() === 'all'"
                (click)="setFilter('all')"
              >
                Todas
              </button>
              <button
                type="button"
                class="notifications-container__filter"
                [class.notifications-container__filter--active]="filter() === 'unread'"
                (click)="setFilter('unread')"
              >
                No leídas
              </button>
              <button
                type="button"
                class="notifications-container__filter"
                [class.notifications-container__filter--active]="filter() === 'info'"
                (click)="setFilter('info')"
              >
                Info
              </button>
              <button
                type="button"
                class="notifications-container__filter"
                [class.notifications-container__filter--active]="filter() === 'success'"
                (click)="setFilter('success')"
              >
                Éxito
              </button>
              <button
                type="button"
                class="notifications-container__filter"
                [class.notifications-container__filter--active]="filter() === 'warning'"
                (click)="setFilter('warning')"
              >
                Aviso
              </button>
              <button
                type="button"
                class="notifications-container__filter"
                [class.notifications-container__filter--active]="filter() === 'error'"
                (click)="setFilter('error')"
              >
                Error
              </button>
            </div>
          }

          <ul class="notifications-container__list">
            @for (notification of displayNotifications(); track notification.id) {
              <li
                class="notifications-container__item"
                [class.notifications-container__item--unread]="!notification.read"
                (click)="markAsRead(notification.id)"
              >
                <span
                  class="notifications-container__dot"
                  [attr.data-type]="notification.type || 'info'"
                ></span>
                <div class="notifications-container__content">
                  <span class="notifications-container__item-title">{{ notification.title }}</span>
                  <span class="notifications-container__item-message">{{ notification.message }}</span>
                  <span class="notifications-container__item-time">{{ formatTime(notification.createdAt) }}</span>
                </div>
              </li>
            } @empty {
              <li class="notifications-container__empty">
                <i class="pi pi-bell-slash text-muted"></i>
                <span>No hay notificaciones</span>
              </li>
            }
          </ul>

          @if (!isDrawerMode()) {
            <footer class="notifications-container__footer">
              <button
                type="button"
                class="notifications-container__view-all"
                (click)="openDrawer()"
              >
                Ver todas las notificaciones
                <i class="pi pi-chevron-right"></i>
              </button>
            </footer>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './notifications-panel.component.scss',
})
export class NotificationsPanelComponent implements AfterViewInit {
  private notificationsService = inject(NotificationsService);
  private gsap = inject(GsapAnimationsService);
  private host = inject(ElementRef<HTMLElement>);

  container = viewChild<ElementRef<HTMLElement>>('container');
  trigger = viewChild<ElementRef<HTMLElement>>('trigger');

  isOpen = signal(false);
  isDrawerMode = signal(false);
  notifications = this.notificationsService.notifications;
  panelNotifications = this.notificationsService.panelNotifications;
  filteredNotifications = this.notificationsService.filteredNotifications;
  filter = this.notificationsService.filter;
  unreadCount = this.notificationsService.unreadCount;

  displayNotifications = computed(() =>
    this.isDrawerMode() ? this.filteredNotifications() : this.panelNotifications()
  );

  ngAfterViewInit(): void {
    const containerEl = this.container()?.nativeElement;
    if (containerEl && this.isOpen() && !this.isDrawerMode()) {
      this.gsap.animatePanelIn(containerEl);
    }
  }

  toggle(): void {
    const willOpen = !this.isOpen();

    if (willOpen) {
      this.isDrawerMode.set(false);
      this.isOpen.set(true);
      setTimeout(() => {
        const containerEl = this.container()?.nativeElement;
        if (containerEl) this.gsap.animatePanelIn(containerEl);
      }, 10);
    } else {
      this.close();
    }
  }

  openDrawer(): void {
    const containerEl = this.container()?.nativeElement;
    if (!containerEl) return;

    this.gsap.animatePanelToDrawer(
      containerEl,
      () => this.isDrawerMode.set(true),
      () => {}
    );
  }

  close(): void {
    if (!this.isOpen()) return;

    const containerEl = this.container()?.nativeElement;

    if (this.isDrawerMode()) {
      if (containerEl) {
        this.gsap.animateDrawerOut(containerEl, () => {
          this.isOpen.set(false);
          this.isDrawerMode.set(false);
        });
      } else {
        this.isOpen.set(false);
        this.isDrawerMode.set(false);
      }
    } else {
      if (containerEl) {
        this.gsap.animatePanelOut(containerEl, () => {
          this.isOpen.set(false);
        });
      } else {
        this.isOpen.set(false);
      }
    }
  }

  setFilter(f: NotificationFilter): void {
    this.notificationsService.setFilter(f);
  }

  markAsRead(id: string): void {
    this.notificationsService.markAsRead(id);
  }

  markAllAsRead(): void {
    this.notificationsService.markAllAsRead();
  }

  formatTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    if (hours < 24) return `Hace ${hours} h`;
    return date.toLocaleDateString();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) this.close();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as Node;
    const hostEl = this.host.nativeElement;
    const containerEl = this.container()?.nativeElement;
    const triggerEl = hostEl.querySelector('.notifications-panel__trigger');
    if (triggerEl?.contains(target) || containerEl?.contains(target)) return;
    this.close();
  }
}
