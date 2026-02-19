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
        <button
          type="button"
          class="topbar__hamburger"
          (click)="layout.toggleSidebar()"
          appPressFeedback
          aria-label="Abrir menú"
        >
          <i class="pi pi-bars text-primary text-xl"></i>
        </button>
        <div class="topbar__school-section">
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
            <app-user-menu />
          </div>
        </div>
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
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }
    }
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
    }
    .topbar__hamburger:hover {
      color: var(--text-primary);
    }
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
}
