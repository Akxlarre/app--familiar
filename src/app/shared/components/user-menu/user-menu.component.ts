import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  viewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { AuthService } from '@core/services/auth.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AvatarModule, PressFeedbackDirective],
  template: `
    <div class="user-menu">
      <button
        type="button"
        class="user-menu__trigger"
        appPressFeedback
        (click)="toggle()"
        [attr.aria-expanded]="isOpen()"
        [class.user-menu__trigger--open]="isOpen()"
        aria-label="Menú de usuario"
      >
        <p-avatar
          [label]="user()?.initials ?? '?'"
          shape="circle"
          styleClass="user-menu__avatar"
        />
        <div class="user-menu__info hidden md:flex flex-col items-start leading-none">
          <span class="user-menu__name">{{ user()?.name ?? 'Usuario' }}</span>
          <span class="user-menu__role">{{ user()?.role ?? '' }}</span>
        </div>
      </button>

      @if (isOpen()) {
        <div
          class="user-menu__backdrop"
          (click)="close()"
          aria-hidden="true"
        ></div>
        <div
          #panel
          class="user-menu__dropdown"
          role="menu"
          aria-label="Menú de usuario"
        >
          <header class="user-menu__header">
            <p-avatar
              [label]="user()?.initials ?? '?'"
              shape="circle"
              styleClass="user-menu__avatar--lg"
            />
            <div class="user-menu__header-info">
              <span class="user-menu__header-name">{{ user()?.name }}</span>
              <span class="user-menu__header-role">{{ user()?.role }}</span>
            </div>
          </header>

          <nav class="user-menu__nav">
            <button
              type="button"
              class="user-menu__item"
              (click)="goToHelp(); close()"
            >
              <i class="pi pi-question-circle"></i>
              <span>Ayuda</span>
            </button>
            <button
              type="button"
              class="user-menu__item user-menu__item--danger"
              (click)="logout(); close()"
            >
              <i class="pi pi-sign-out"></i>
              <span>Cerrar Sesión</span>
            </button>
          </nav>
        </div>
      }
    </div>
  `,
  styleUrl: './user-menu.component.scss',
})
export class UserMenuComponent {
  private authService = inject(AuthService);
  private gsap = inject(GsapAnimationsService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  panel = viewChild<ElementRef<HTMLElement>>('panel');

  isOpen = signal(false);
  user = this.authService.currentUser;

  toggle(): void {
    const willOpen = !this.isOpen();

    if (willOpen) {
      this.isOpen.set(true);
      setTimeout(() => {
        const panelEl = this.panel()?.nativeElement;
        if (panelEl) this.gsap.animatePanelIn(panelEl);
      }, 10);
    } else {
      const panelEl = this.panel()?.nativeElement;
      if (panelEl) {
        this.gsap.animatePanelOut(panelEl, () => {
          this.isOpen.set(false);
        });
      } else {
        this.isOpen.set(false);
      }
    }
  }

  close(): void {
    if (!this.isOpen()) return;

    const panelEl = this.panel()?.nativeElement;
    if (panelEl) {
      this.gsap.animatePanelOut(panelEl, () => {
        this.isOpen.set(false);
      });
    } else {
      this.isOpen.set(false);
    }
  }

  goToHelp(): void {
    // TODO: Definir ruta de ayuda cuando exista - router.navigate(['/ayuda'])
    this.router.navigate(['/']).catch(() => {});
  }

  logout(): void {
    this.authService.logout();
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
    const panelEl = this.panel()?.nativeElement;
    const triggerEl = hostEl.querySelector('.user-menu__trigger');
    if (triggerEl?.contains(target) || panelEl?.contains(target)) return;
    this.close();
  }
}
