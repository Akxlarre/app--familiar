import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ToolbarModule } from 'primeng/toolbar';
import { AvatarModule } from 'primeng/avatar';
import { CommonModule } from '@angular/common';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { NotificationsPanelComponent } from '@shared/components/notifications-panel/notifications-panel.component';
import { UserMenuComponent } from '@shared/components/user-menu/user-menu.component';
import { SchoolSelectorComponent } from '@shared/components/school-selector/school-selector.component';
import { SearchPanelComponent } from '@shared/components/search-panel/search-panel.component';
import { BreadcrumbService } from '@core/services/breadcrumb.service';
import { LayoutService } from '@core/services/layout.service';
import { ThemeService } from '@core/services/theme.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ToolbarModule,
    AvatarModule,
    BreadcrumbModule,
    SearchPanelComponent,
    NotificationsPanelComponent,
    UserMenuComponent,
    SchoolSelectorComponent,
    PressFeedbackDirective,
  ],
  template: `
    <div class="topbar sticky top-0 z-50">
      <div class="flex h-16 items-stretch">
        <div class="topbar__school-section" *ngIf="false">
          <app-school-selector />
        </div>
        <div class="topbar__center flex flex-1 items-center gap-4 px-4 min-w-0">
          <div class="topbar__breadcrumb-wrap">
            <p-breadcrumb
              [model]="breadcrumb().items"
              [home]="breadcrumb().home"
              styleClass="topbar__breadcrumb"
            ></p-breadcrumb>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <app-search-panel />
            <app-notifications-panel />

            <!-- Botón Dark Mode -->
            <button
              id="dark-mode-toggle"
              type="button"
              class="topbar__icon-btn"
              (click)="themeService.toggleDarkMode()"
              appPressFeedback
              [attr.aria-label]="themeService.darkMode() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
              [title]="themeService.darkMode() ? 'Modo claro' : 'Modo oscuro'"
            >
              @if (themeService.darkMode()) {
                <!-- Sol — modo claro -->
                <svg class="topbar__mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
              } @else {
                <!-- Luna — modo oscuro -->
                <svg class="topbar__mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              }
            </button>

            <app-user-menu />
          </div>
        </div>
        <button
          type="button"
          class="topbar__hamburger"
          (click)="layout.toggleSidebar()"
          appPressFeedback
          aria-label="Abrir menú"
        >
          <i class="pi pi-bars text-primary text-xl"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* Layout premium: glassmorphism sutil + sombra en lugar de bordes */
    .topbar {
      background: var(--bg-surface);
      box-shadow: var(--shadow-layout-topbar);
    }
    @supports (backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px)) {
      .topbar {
        background: var(--bg-glass-surface);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }
    }

    /* Dark mode: fondo oscuro semi-transparente */
    :host-context([data-mode='dark']) .topbar {
      background: rgba(24, 24, 27, 0.92);
    }

    /* ── Botón icono (dark mode toggle + futuras acciones) ── */
    .topbar__icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-default);
      background: var(--bg-surface);
      color: var(--text-secondary);
      cursor: pointer;
      flex-shrink: 0;
      transition:
        background-color var(--duration-fast) ease,
        color var(--duration-fast) ease,
        border-color var(--duration-fast) ease,
        box-shadow var(--duration-fast) ease,
        transform var(--duration-fast) ease;
    }
    .topbar__icon-btn:hover {
      background: var(--color-primary-muted);
      color: var(--color-primary);
      border-color: var(--accent-border);
      box-shadow: var(--shadow-focus);
    }
    .topbar__icon-btn:active {
      transform: scale(0.92);
    }
    .topbar__mode-icon {
      width: 1.1rem;
      height: 1.1rem;
      transition: transform var(--duration-normal) ease;
    }
    .topbar__icon-btn:hover .topbar__mode-icon {
      transform: rotate(20deg);
    }

    /* ── Hamburger ── */
    .topbar__hamburger {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      flex-shrink: 0;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-secondary);
      transition: color 0.2s ease;
      order: -1;
    }
    .topbar__hamburger:hover {
      color: var(--text-primary);
    }

    /* ── School section ── */
    .topbar__school-section {
      display: none;
      width: 13rem;
      align-items: center;
      padding: 0 var(--space-4);
      flex-shrink: 0;
    }
    @media (min-width: 768px) {
      .topbar__hamburger {
        display: none;
      }
      .topbar__school-section {
        display: flex;
        width: 16rem;
      }
    }
    .topbar__school-section {
      box-shadow: var(--shadow-layout-divider);
    }

    /* Mobile: acciones a la derecha. Desktop: breadcrumb izquierda, acciones derecha */
    .topbar__center {
      justify-content: flex-end;
    }
    @media (min-width: 768px) {
      .topbar__center {
        justify-content: space-between;
      }
    }

    /* ── Breadcrumb ── */
    .topbar__breadcrumb {
      border: none;
      background: transparent;
      padding: 0;
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
    }
    .topbar__breadcrumb-wrap {
      display: none;
    }
    @media (min-width: 768px) {
      .topbar__breadcrumb-wrap {
        display: block;
      }
    }
    :host ::ng-deep .topbar__breadcrumb .p-breadcrumb-home,
    :host ::ng-deep .topbar__breadcrumb .p-menuitem-text {
      color: var(--text-secondary);
      font-weight: var(--font-medium);
    }
    :host ::ng-deep .topbar__breadcrumb .p-breadcrumb-home:hover,
    :host ::ng-deep .topbar__breadcrumb .p-menuitem-link:hover .p-menuitem-text {
      color: var(--text-primary);
    }
    :host ::ng-deep .topbar__breadcrumb li:last-child .p-menuitem-text {
      color: var(--text-primary);
      font-weight: var(--font-semibold);
    }
    :host ::ng-deep .topbar__breadcrumb .p-breadcrumb-separator,
    :host ::ng-deep .topbar__breadcrumb .p-breadcrumb-chevron {
      color: var(--text-muted);
      font-size: var(--text-xs);
    }
  `],
})
export class TopbarComponent {
  breadcrumb = inject(BreadcrumbService).breadcrumb;
  layout = inject(LayoutService);
  themeService = inject(ThemeService);
}
