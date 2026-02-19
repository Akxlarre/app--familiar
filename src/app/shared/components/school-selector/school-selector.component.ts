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
import { AuthService } from '@core/services/auth.service';
import { SchoolService } from '@core/services/school.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import type { School } from '@core/models/school.model';

@Component({
  selector: 'app-school-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PressFeedbackDirective],
  template: `
    <div class="school-selector">
      @if (canSwitch()) {
        <button
          type="button"
          class="school-selector__trigger"
          appPressFeedback
          (click)="toggle()"
          [attr.aria-expanded]="isOpen()"
          [class.school-selector__trigger--open]="isOpen()"
          aria-label="Cambiar escuela"
        >
          <i class="pi pi-building school-selector__icon"></i>
          <div class="school-selector__content">
            <span class="school-selector__label">Escuela Actual</span>
            <span class="school-selector__name">{{ currentSchool()?.name ?? '—' }}</span>
          </div>
          <i class="pi pi-chevron-down school-selector__chevron"></i>
        </button>

        @if (isOpen()) {
          <div
            class="school-selector__backdrop"
            (click)="close()"
            aria-hidden="true"
          ></div>
          <div
            #panel
            class="school-selector__dropdown"
            role="listbox"
            aria-label="Seleccionar escuela"
          >
            <div class="school-selector__dropdown-header">Seleccionar escuela</div>
            <div class="school-selector__dropdown-list">
            @for (school of availableSchools(); track school.id) {
              <button
                type="button"
                class="school-selector__item"
                [class.school-selector__item--active]="currentSchool()?.id === school.id"
                (click)="selectSchool(school); close()"
              >
                <span class="school-selector__dot" [class.school-selector__dot--red]="school.theme === 'red'" [class.school-selector__dot--blue]="school.theme === 'blue'"></span>
                <span>{{ school.name }}</span>
              </button>
            }
            </div>
          </div>
        }
      } @else {
        <div
          class="school-selector__static"
          [attr.title]="'No tienes permiso para cambiar de escuela'"
        >
          <i class="pi pi-building school-selector__icon"></i>
          <div class="school-selector__content">
            <span class="school-selector__label">Escuela Actual</span>
            <span class="school-selector__name">{{ currentSchool()?.name ?? '—' }}</span>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './school-selector.component.scss',
})
export class SchoolSelectorComponent {
  private authService = inject(AuthService);
  private schoolService = inject(SchoolService);
  private gsap = inject(GsapAnimationsService);
  private host = inject(ElementRef<HTMLElement>);

  panel = viewChild<ElementRef<HTMLElement>>('panel');

  isOpen = signal(false);
  canSwitch = this.authService.canSwitchSchool;
  currentSchool = this.schoolService.currentSchool;
  availableSchools = this.schoolService.availableSchools;

  toggle(): void {
    const willOpen = !this.isOpen();

    if (willOpen) {
      this.isOpen.set(true);
      setTimeout(() => {
        const panelEl = this.panel()?.nativeElement;
        if (panelEl) this.gsap.animatePanelIn(panelEl);
      }, 10);
    } else {
      this.close();
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

  selectSchool(school: School): void {
    this.schoolService.setCurrentSchool(school);
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
    const triggerEl = hostEl.querySelector('.school-selector__trigger');
    if (triggerEl?.contains(target) || panelEl?.contains(target)) return;
    this.close();
  }
}
