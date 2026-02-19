import {
  Component,
  ChangeDetectionStrategy,
  inject,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  effect,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MenuModule } from 'primeng/menu';
import { CommonModule } from '@angular/common';
import { SchoolSelectorComponent } from '@shared/components/school-selector/school-selector.component';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { MenuConfigService } from '@core/services/menu-config.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { LayoutService } from '@core/services/layout.service';
import gsap from 'gsap';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MenuModule, SchoolSelectorComponent],
  template: `
    <div class="sidebar-root" [class.sidebar--open]="layout.sidebarOpen()">
      <div
        #backdropRef
        class="sidebar-backdrop"
        (click)="layout.closeSidebar()"
        [attr.aria-hidden]="!layout.sidebarOpen()"
      ></div>
      <aside #asideRef class="sidebar-aside h-full bg-surface flex flex-col font-body">
        <div class="sidebar__school-wrap">
          <app-school-selector />
        </div>
        <div
          #scrollContainer
          class="flex-1 overflow-y-auto py-3 px-4 custom-scrollbar relative"
        >
        <div #indicator class="sidebar-indicator"></div>
          <p-menu [model]="menuItems()" styleClass="w-full border-none bg-transparent p-0"></p-menu>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      flex-shrink: 0;
    }
    @media (min-width: 768px) {
      :host { width: 16rem; }
    }
    @media (max-width: 767px) {
      :host { width: 0; min-width: 0; overflow: visible; }
    }

    /* Desktop: sidebar en flow. Mobile: overlay — sin transform en root para que backdrop no se deslice */
    .sidebar-root {
      display: block;
      width: 100%;
      height: 100%;
    }
    @media (max-width: 767px) {
      .sidebar-root {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        width: 100%;
        z-index: 1000;
        pointer-events: none;
      }
      .sidebar-root.sidebar--open {
        pointer-events: auto;
      }
    }

    /* Backdrop: full-screen, solo fade (GSAP). Nunca se desliza. */
    .sidebar-backdrop {
      display: none;
    }
    @media (max-width: 767px) {
      .sidebar-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 1;
        background: var(--overlay-backdrop);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        cursor: pointer;
      }
    }

    /* Aside: slide desde la izquierda (GSAP). z-index encima del backdrop. */
    @media (max-width: 767px) {
      .sidebar-aside {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        width: 16rem;
        z-index: 2;
      }
    }

    /* School selector: solo visible en mobile (dentro del drawer) */
    .sidebar__school-wrap {
      display: none;
      padding: var(--space-4);
      border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }
    @media (max-width: 767px) {
      .sidebar__school-wrap {
        display: block;
      }
    }

    /* Sidebar: sombra premium suave en lugar de línea dura */
    .sidebar-aside {
      box-shadow: var(--shadow-layout-sidebar);
    }

    /* Indicador deslizante — pill detrás del item activo */
    .sidebar-indicator {
      position: absolute;
      left: var(--space-4);
      right: var(--space-4);
      height: 0;
      top: 0;
      opacity: 0;
      background: var(--color-primary-muted);
      border-radius: var(--radius-md);
      pointer-events: none;
      z-index: 0;
    }

    /* Custom Scrollbar - tokens */
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: var(--border-default);
      border-radius: var(--radius-sm);
    }

    /* PrimeNG Menu Overrides - Design System tokens */
    :host ::ng-deep .p-menu,
    :host ::ng-deep .p-menu .p-menu-list {
      width: 100%;
      border: none;
      outline: none;
    }
    :host ::ng-deep .p-menu .p-menu-list {
      gap: var(--space-1);
      position: relative;
      z-index: 1;
    }
    :host ::ng-deep .p-menu .p-menu-submenu-label {
      margin-top: var(--space-4);
      background: transparent;
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--text-muted);
      padding: var(--space-2) var(--space-4);
    }
    :host ::ng-deep .p-menu .p-menu-submenu-label:first-child {
      margin-top: 0;
    }
    :host ::ng-deep .p-menu .p-menu-item-content,
    :host ::ng-deep .p-menu .p-menu-item-link {
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      color: var(--text-secondary);
      font-weight: var(--font-medium);
      transform-origin: left center;
      transition: background 0.22s cubic-bezier(0.4, 0, 0.2, 1),
        color 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
    }
    :host ::ng-deep .p-menu .p-menu-item:not(.p-disabled) .p-menu-item-content:hover,
    :host ::ng-deep .p-menu .p-menu-item:not(.p-disabled) .p-menu-item-link:hover {
      background: var(--color-primary-muted);
      color: var(--text-primary);
    }
    :host ::ng-deep .p-menu .p-menu-item:not(.p-disabled) .p-menu-item-content:hover .p-menu-item-icon,
    :host ::ng-deep .p-menu .p-menu-item:not(.p-disabled) .p-menu-item-link:hover .p-menu-item-icon {
      color: var(--color-primary);
    }
    :host ::ng-deep .p-menu .p-menu-item-icon {
      color: var(--text-secondary);
      font-size: 1rem;
      margin-right: var(--space-3);
      transition: color 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Active: texto/icono destacado; fondo lo da el indicador deslizante */
    :host ::ng-deep .p-menu .p-menu-item-link.p-menu-item-link-active,
    :host ::ng-deep .p-menu .p-menu-item-link-active {
      background: transparent;
      color: var(--color-primary);
    }
    :host ::ng-deep .p-menu .p-menu-item-link.p-menu-item-link-active .p-menu-item-icon,
    :host ::ng-deep .p-menu .p-menu-item-link-active .p-menu-item-icon {
      color: var(--color-primary);
    }
    :host ::ng-deep .p-menu .p-menu-item-link.p-menu-item-link-active .p-menu-item-label,
    :host ::ng-deep .p-menu .p-menu-item-link-active .p-menu-item-label {
      font-weight: var(--font-semibold);
    }
  `],
})
export class SidebarComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLElement>;
  @ViewChild('indicator') indicator!: ElementRef<HTMLElement>;
  @ViewChild('backdropRef') backdropRef!: ElementRef<HTMLElement>;
  @ViewChild('asideRef') asideRef!: ElementRef<HTMLElement>;

  private menuConfigService = inject(MenuConfigService);
  private gsap = inject(GsapAnimationsService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  layout = inject(LayoutService);

  menuItems = this.menuConfigService.menuItems;

  private pillCleanup: (() => void) | null = null;
  private scrollCleanup: (() => void) | null = null;
  private routerSub: Subscription | null = null;
  private resizeCleanup: (() => void) | null = null;
  private lastWidth = 0;

  constructor() {
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const open = this.layout.sidebarOpen();
      if (window.innerWidth >= 768) return;
      const backdrop = this.backdropRef?.nativeElement;
      const aside = this.asideRef?.nativeElement;
      if (!backdrop || !aside) return;
      this.gsap.animateDrawer(backdrop, aside, open);
    });
  }

  ngAfterViewInit(): void {
    const container = this.scrollContainer?.nativeElement;
    const indicatorEl = this.indicator?.nativeElement;

    if (!container || !indicatorEl) return;

    // Mobile: estado inicial del drawer (cerrado)
    if (isPlatformBrowser(this.platformId) && window.innerWidth < 768) {
      const backdrop = this.backdropRef?.nativeElement;
      const aside = this.asideRef?.nativeElement;
      if (backdrop && aside) {
        gsap.set(backdrop, { opacity: 0, visibility: 'hidden', pointerEvents: 'none' });
        gsap.set(aside, { xPercent: -100 });
      }
    }

    // Defer: p-menu renderiza async; esperar a que existan los items
    setTimeout(() => {
      this.pillCleanup = this.gsap.addPillHovers(container);
      this.updateIndicatorPosition();
    }, 50);

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.updateIndicatorPosition();
        this.layout.closeSidebar();
      });

    const onScroll = () => this.updateIndicatorPosition();
    container.addEventListener('scroll', onScroll, { passive: true });
    this.scrollCleanup = () => container.removeEventListener('scroll', onScroll);

    // Resize: sincronizar estado al cruzar breakpoint 768px
    if (isPlatformBrowser(this.platformId)) {
      this.lastWidth = window.innerWidth;
      const onResize = () => this.handleResize();
      window.addEventListener('resize', onResize);
      this.resizeCleanup = () => window.removeEventListener('resize', onResize);
    }
  }

  private handleResize(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const w = window.innerWidth;
    const wasMobile = this.lastWidth < 768;
    const isMobile = w < 768;
    this.lastWidth = w;

    const backdrop = this.backdropRef?.nativeElement;
    const aside = this.asideRef?.nativeElement;
    if (!backdrop || !aside) return;

    if (wasMobile && !isMobile) {
      // Mobile → Desktop: cerrar overlay, limpiar GSAP
      this.layout.closeSidebar();
      gsap.killTweensOf([backdrop, aside]);
      gsap.set([backdrop, aside], { clearProps: 'all' });
    } else if (!wasMobile && isMobile) {
      // Desktop → Mobile: estado inicial cerrado
      this.layout.closeSidebar();
      gsap.killTweensOf([backdrop, aside]);
      gsap.set(backdrop, { opacity: 0, visibility: 'hidden', pointerEvents: 'none' });
      gsap.set(aside, { xPercent: -100 });
    }
  }

  ngOnDestroy(): void {
    this.pillCleanup?.();
    this.scrollCleanup?.();
    this.resizeCleanup?.();
    this.routerSub?.unsubscribe();
  }

  private updateIndicatorPosition(): void {
    const container = this.scrollContainer?.nativeElement;
    const indicatorEl = this.indicator?.nativeElement;

    if (!container || !indicatorEl) return;

    const active = container.querySelector<HTMLElement>('.p-menu-item-link-active');
    if (!active) {
      gsap.set(indicatorEl, { height: 0, top: 0, opacity: 0 });
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();

    const top = activeRect.top - containerRect.top + container.scrollTop;
    const height = activeRect.height;

    gsap.to(indicatorEl, {
      top,
      height,
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
    });
  }
}
