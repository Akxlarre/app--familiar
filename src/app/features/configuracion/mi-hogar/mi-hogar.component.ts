import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  viewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@core/services/auth.service';
import { HouseholdService } from '@core/services/household.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';

@Component({
  selector: 'app-mi-hogar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule, PressFeedbackDirective],
  template: `
    <div #container class="flex flex-col gap-6 font-body">
      <div>
        <h1 class="text-3xl font-bold font-display text-primary">Mi hogar</h1>
        <p class="text-secondary text-lg">Información y código de invitación de tu hogar</p>
      </div>

      @if (loading()) {
        <div class="rounded-xl border border-default bg-surface p-8 shadow-sm animate-pulse">
          <div class="h-6 bg-subtle rounded w-1/3 mb-4"></div>
          <div class="h-10 bg-subtle rounded w-1/2"></div>
        </div>
      } @else if (error()) {
        <div class="rounded-xl border border-default bg-surface p-6 shadow-sm">
          <p class="text-error">{{ error() }}</p>
        </div>
      } @else if (household()) {
        <section class="rounded-xl border border-default bg-surface p-6 shadow-sm flex flex-col gap-6">
          <div>
            <label class="text-sm font-medium text-muted block mb-1">Nombre del hogar</label>
            <p class="text-xl font-semibold text-primary">{{ household()!.name }}</p>
          </div>

          <div>
            <label class="text-sm font-medium text-muted block mb-2">Código de invitación</label>
            <p class="text-sm text-secondary mb-2">
              Comparte este código con tu pareja o familia para que se unan al hogar.
            </p>
            <div class="flex items-center gap-3 flex-wrap">
              <div
                class="invite-code-box px-4 py-3 rounded-lg bg-subtle border border-default font-mono text-xl font-bold text-primary tracking-widest"
              >
                {{ household()!.inviteCode }}
              </div>
              <button
                pButton
                icon="pi pi-copy"
                label="Copiar"
                severity="secondary"
                (click)="copyCode()"
                appPressFeedback="press"
              ></button>
            </div>
            @if (copied()) {
              <p class="text-success text-sm mt-2">Código copiado al portapapeles</p>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .invite-code-box { background: var(--bg-subtle); }
  `],
})
export class MiHogarComponent implements OnInit, AfterViewInit {
  private auth = inject(AuthService);
  private householdService = inject(HouseholdService);
  private gsap = inject(GsapAnimationsService);

  containerRef = viewChild<ElementRef<HTMLElement>>('container');

  loading = signal(true);
  error = signal<string | null>(null);
  household = signal<{ id: string; name: string; inviteCode: string } | null>(null);
  copied = signal(false);

  ngOnInit(): void {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) {
      this.error.set('No tienes un hogar asignado');
      this.loading.set(false);
      return;
    }
    this.householdService.getHousehold(householdId).then(({ data, error }) => {
      this.loading.set(false);
      if (error) this.error.set(error.message ?? 'Error al cargar el hogar');
      else if (data) this.household.set(data);
    });
  }

  ngAfterViewInit(): void {
    const el = this.containerRef()?.nativeElement;
    if (el) this.gsap.animatePageEnter(el);
  }

  async copyCode(): Promise<void> {
    const code = this.household()?.inviteCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.copied.set(false);
    }
  }
}
