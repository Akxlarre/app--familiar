import { Component, inject, effect, viewChild, ElementRef, AfterViewInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DOCUMENT } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { Toast } from 'primeng/toast';
import { SharedModule } from 'primeng/api';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { ToastHeadlessComponent } from '../toast-headless/toast-headless.component';
import { ConfirmModalComponent } from '@shared/components/confirm-modal';
import { LayoutService } from '@core/services/layout.service';
import { ModalOverlayService } from '@core/services/modal-overlay.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Toast, SharedModule, ToastHeadlessComponent, ConfirmModalComponent, SidebarComponent, TopbarComponent],
  styleUrl: './main-layout.component.scss',
  template: `
    <p-toast
      position="top-right"
      [life]="4000"
      [preventDuplicates]="false"
      [preventOpenDuplicates]="false"
      [showTransitionOptions]="'250ms'"
      [hideTransitionOptions]="'180ms'"
      [showTransformOptions]="'translateX(100%)'"
      [hideTransformOptions]="'translateX(100%)'"
    >
      <ng-template let-message let-closeFn="closeFn" pTemplate="headless">
        <app-toast-headless [message]="message" [closeFn]="closeFn" />
      </ng-template>
    </p-toast>
    @if (hideShell()) {
      <div class="flex flex-col h-screen w-full bg-base overflow-hidden">
        <main class="flex-1 overflow-auto">
          <router-outlet />
        </main>
        <div #modalOverlay class="modal-overlay" aria-hidden="true"></div>
        <app-confirm-modal />
      </div>
    } @else {
      <div class="flex flex-col h-screen w-full bg-base overflow-hidden">
        <app-topbar />
        <div class="flex flex-1 min-h-0">
          <app-sidebar class="flex-shrink-0" />
          <main class="main-content flex-1 overflow-auto p-4 md:p-6 scroll-smooth min-w-0">
            <div class="mx-auto w-full max-w-7xl xl:max-w-screen-2xl 2xl:max-w-[1800px]">
              <router-outlet />
            </div>
          </main>
        </div>
        <div #modalOverlay class="modal-overlay" aria-hidden="true"></div>
        <app-confirm-modal />
      </div>
    }
  `,
})
export class MainLayoutComponent implements AfterViewInit {
  private layout = inject(LayoutService);
  private doc = inject(DOCUMENT);
  private modalOverlayService = inject(ModalOverlayService);
  private router = inject(Router);

  modalOverlay = viewChild<ElementRef<HTMLElement>>('modalOverlay');

  /** true en setup-hogar: sin topbar ni sidebar (pasos iniciales). */
  hideShell = signal(false);

  constructor() {
    effect(() => {
      const open = this.layout.sidebarOpen();
      const body = this.doc.body;
      if (open) {
        body.classList.add('layout-drawer-open');
      } else {
        body.classList.remove('layout-drawer-open');
      }
    });
    this.hideShell.set(this.router.url.includes('/setup-hogar'));
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.hideShell.set(this.router.url.includes('/setup-hogar')));
  }

  ngAfterViewInit(): void {
    const el = this.modalOverlay()?.nativeElement;
    if (el) this.modalOverlayService.setContainer(el);
  }
}
