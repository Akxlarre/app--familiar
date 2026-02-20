import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  viewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { AuthService } from '@core/services/auth.service';
import { HouseholdService } from '@core/services/household.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';

@Component({
  selector: 'app-setup-hogar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PressFeedbackDirective,
  ],
  template: `
    <div class="setup-page min-h-[80vh] flex flex-col items-center justify-center p-4 font-body">
      <div #container class="setup-container w-full max-w-lg flex flex-col gap-8">
        <header class="text-center">
          <h1 class="text-2xl font-bold font-display text-primary">Configurar hogar</h1>
          <p class="text-secondary text-sm mt-1">Crea un hogar o únete a uno con un código</p>
        </header>

        @if (createdCode()) {
          <section class="card bg-surface rounded-xl p-6 shadow-md border border-default">
            <p class="text-success font-medium flex items-center gap-2 mb-2">
              <i class="pi pi-check-circle"></i>
              Hogar creado
            </p>
            <p class="text-secondary text-sm mb-4">
              Comparte este código con tu pareja para que se una al hogar:
            </p>
            <div
              class="invite-code-box p-4 rounded-lg bg-subtle border border-default text-center font-mono text-2xl font-bold text-primary tracking-widest"
            >
              {{ createdCode() }}
            </div>
            <button
              pButton
              label="Ir al inicio"
              class="w-full mt-6"
              (click)="goToDashboard()"
              appPressFeedback="press"
            ></button>
          </section>
        } @else {
          <div class="flex flex-col gap-6">
            <!-- Crear hogar -->
            <section class="card bg-surface rounded-xl p-6 shadow-md border border-default">
              <h2 class="text-lg font-semibold text-primary mb-4">Crear un hogar</h2>
              @if (createError()) {
                <p class="text-error text-sm mb-3">{{ createError() }}</p>
              }
              <form [formGroup]="createForm" (ngSubmit)="onCreateSubmit()" class="flex flex-col gap-4">
                <div>
                  <label for="householdName" class="text-sm font-medium text-primary block mb-2">
                    Nombre del hogar
                  </label>
                  <input
                    id="householdName"
                    type="text"
                    pInputText
                    formControlName="name"
                    placeholder="Ej. Casa"
                    class="w-full"
                  />
                  @if (createForm.get('name')?.invalid && createForm.get('name')?.touched) {
                    <p class="text-error text-xs mt-1">El nombre es requerido</p>
                  }
                </div>
                <button
                  pButton
                  type="submit"
                  label="Crear hogar"
                  class="w-full"
                  [loading]="createLoading()"
                  [disabled]="createForm.invalid"
                  appPressFeedback="press"
                ></button>
              </form>
            </section>

            <!-- Unirse con código -->
            <section class="card bg-surface rounded-xl p-6 shadow-md border border-default">
              <h2 class="text-lg font-semibold text-primary mb-4">Unirse con código</h2>
              @if (joinError()) {
                <p class="text-error text-sm mb-3">{{ joinError() }}</p>
              }
              <form [formGroup]="joinForm" (ngSubmit)="onJoinSubmit()" class="flex flex-col gap-4">
                <div>
                  <label for="inviteCode" class="text-sm font-medium text-primary block mb-2">
                    Código de invitación
                  </label>
                  <input
                    id="inviteCode"
                    type="text"
                    pInputText
                    formControlName="code"
                    placeholder="Ej. ABC12XY"
                    class="w-full font-mono uppercase"
                    maxlength="12"
                  />
                  @if (joinForm.get('code')?.invalid && joinForm.get('code')?.touched) {
                    <p class="text-error text-xs mt-1">Ingresa el código que te compartieron</p>
                  }
                </div>
                <button
                  pButton
                  type="submit"
                  label="Unirme al hogar"
                  class="w-full"
                  [loading]="joinLoading()"
                  [disabled]="joinForm.invalid"
                  appPressFeedback="press"
                ></button>
              </form>
            </section>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .invite-code-box { background: var(--bg-subtle); }
  `],
})
export class SetupHogarComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private gsap = inject(GsapAnimationsService);
  private auth = inject(AuthService);
  private household = inject(HouseholdService);

  containerRef = viewChild<ElementRef<HTMLElement>>('container');

  createLoading = signal(false);
  joinLoading = signal(false);
  createError = signal<string | null>(null);
  joinError = signal<string | null>(null);
  createdCode = signal<string | null>(null);

  createForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
  });

  joinForm = this.fb.nonNullable.group({
    code: ['', Validators.required],
  });

  ngAfterViewInit(): void {
    const el = this.containerRef()?.nativeElement;
    if (el) this.gsap.animatePageEnter(el);
  }

  async onCreateSubmit(): Promise<void> {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.createError.set(null);
    this.createLoading.set(true);
    const name = this.createForm.getRawValue().name;
    const { data, error } = await this.household.createHousehold(name);
    this.createLoading.set(false);
    if (error) {
      this.createError.set(error.message ?? 'Error al crear el hogar');
      return;
    }
    if (data?.inviteCode) {
      this.createdCode.set(data.inviteCode);
      await this.auth.refreshProfile();
    }
  }

  async onJoinSubmit(): Promise<void> {
    if (this.joinForm.invalid) {
      this.joinForm.markAllAsTouched();
      return;
    }
    this.joinError.set(null);
    this.joinLoading.set(true);
    const code = this.joinForm.getRawValue().code;
    const { error } = await this.household.joinWithCode(code);
    this.joinLoading.set(false);
    if (error) {
      this.joinError.set(error.message ?? 'Error al unirse');
      return;
    }
    await this.auth.refreshProfile();
    this.router.navigate(['/app/dashboard']);
  }

  goToDashboard(): void {
    this.router.navigate(['/app/dashboard']);
  }
}
