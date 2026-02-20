import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  inject,
  signal,
  viewChild,
  effect,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DOCUMENT } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { AuthService } from '@core/services/auth.service';
import { SupabaseService } from '@core/services/supabase.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import { AnimateInDirective } from '@core/directives/animate-in.directive';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    PressFeedbackDirective,
    AnimateInDirective,
  ],
  template: `
    <div class="login-page min-h-screen flex flex-col items-center justify-center bg-base p-4 font-body">
      <div #loginContainer class="login-container w-full max-w-md flex flex-col items-center gap-8">
        <header class="flex flex-col items-center gap-2 text-center">
          <div class="login-logo w-16 h-16 rounded-full bg-surface border-2 border-primary flex items-center justify-center shadow-md">
            <i class="pi pi-home text-2xl text-primary"></i>
          </div>
          <h1 class="text-2xl font-bold font-display text-primary">App Familiar</h1>
          <p class="text-sm text-primary font-medium">Gestión del hogar</p>
        </header>

        <section class="login-form w-full card bg-surface rounded-xl p-6 shadow-md border border-default">
          <div #formContent class="form-content-wrapper">
            @if (mode() === 'login') {
              <h2 class="text-xl font-bold text-primary mb-6">Iniciar Sesión</h2>

              @if (errorMessage()) {
                <div class="error-inline p-3 rounded-lg mb-4 text-sm text-error bg-state-error-bg border border-state-error-border" role="alert">
                  {{ errorMessage() }}
                </div>
              }

              <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
                <div #emailField class="flex flex-col gap-2">
                  <label for="email" class="text-sm font-medium text-primary">
                    Email <span class="text-error">*</span>
                  </label>
                  <div class="relative">
                    <input
                      id="email"
                      type="email"
                      pInputText
                      formControlName="email"
                      placeholder="tu&#64;email.com"
                      class="w-full"
                      autocomplete="email"
                    />
                    @if (form.get('email')?.valid && form.get('email')?.dirty) {
                      <i class="pi pi-check-circle absolute right-3 top-1/2 -translate-y-1/2 text-success"></i>
                    }
                  </div>
                  <div class="min-h-5 text-xs text-error">
                    @if (form.get('email')?.invalid && form.get('email')?.touched) {
                      <span appAnimateIn>{{ form.get('email')?.hasError('required') ? 'El email es requerido' : 'Introduce un email válido' }}</span>
                    }
                  </div>
                </div>

                <div #passwordField class="flex flex-col gap-2">
                  <label for="password" class="text-sm font-medium text-primary">
                    Contraseña <span class="text-error">*</span>
                  </label>
                  <p-password
                    id="password"
                    formControlName="password"
                    [toggleMask]="true"
                    [feedback]="false"
                    placeholder="••••••••"
                    fluid
                  />
                  <div class="min-h-5 text-xs text-error">
                    @if (form.get('password')?.invalid && form.get('password')?.touched) {
                      <span appAnimateIn>La contraseña es requerida</span>
                    }
                  </div>
                </div>

                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-2">
                    <p-checkbox
                      formControlName="rememberMe"
                      [binary]="true"
                      inputId="remember"
                    />
                    <label for="remember" class="text-sm text-secondary cursor-pointer">
                      Recordarme
                    </label>
                  </div>
                  <a
                    href="#"
                    (click)="switchToRecovery($event)"
                    class="text-sm text-secondary hover:text-primary transition-colors"
                    appPressFeedback
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>

                <button
                  pButton
                  type="submit"
                  [label]="buttonLabel()"
                  class="w-full"
                  [loading]="loading()"
                  [disabled]="form.invalid"
                  appPressFeedback="press"
                ></button>
              </form>

              <p class="text-sm text-secondary mt-4 text-center">
                ¿No tienes cuenta?
                <a href="#" (click)="switchToSignup($event)" class="text-primary font-medium hover:underline" appPressFeedback>Regístrate</a>
              </p>
            } @else if (mode() === 'signup') {
              <h2 class="text-xl font-bold text-primary mb-6">Crear cuenta</h2>

              @if (errorMessage()) {
                <div class="error-inline p-3 rounded-lg mb-4 text-sm text-error bg-state-error-bg border border-state-error-border" role="alert">
                  {{ errorMessage() }}
                </div>
              }
              @if (signupSuccess()) {
                <div class="p-4 rounded-lg mb-4 text-sm text-success bg-state-success-bg border border-state-success-border" role="status">
                  Cuenta creada. Revisa tu correo para confirmar (si está configurado) o inicia sesión.
                </div>
              } @else {
                <form [formGroup]="signupForm" (ngSubmit)="onSignupSubmit()" class="flex flex-col gap-4">
                  <div class="flex flex-col gap-2">
                    <label for="displayName" class="text-sm font-medium text-primary">Nombre (opcional)</label>
                    <input
                      id="displayName"
                      type="text"
                      pInputText
                      formControlName="displayName"
                      placeholder="Tu nombre"
                      class="w-full"
                      autocomplete="name"
                    />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label for="signup-email" class="text-sm font-medium text-primary">
                      Email <span class="text-error">*</span>
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      pInputText
                      formControlName="email"
                      placeholder="tu&#64;email.com"
                      class="w-full"
                      autocomplete="email"
                    />
                    <div class="min-h-5 text-xs text-error">
                      @if (signupForm.get('email')?.invalid && signupForm.get('email')?.touched) {
                        <span appAnimateIn>{{ signupForm.get('email')?.hasError('required') ? 'El email es requerido' : 'Introduce un email válido' }}</span>
                      }
                    </div>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label for="signup-password" class="text-sm font-medium text-primary">
                      Contraseña <span class="text-error">*</span>
                    </label>
                    <p-password
                      id="signup-password"
                      formControlName="password"
                      [toggleMask]="true"
                      [feedback]="true"
                      placeholder="Mínimo 6 caracteres"
                      fluid
                    />
                    <div class="min-h-5 text-xs text-error">
                      @if (signupForm.get('password')?.invalid && signupForm.get('password')?.touched) {
                        <span appAnimateIn>La contraseña es requerida (mín. 6 caracteres)</span>
                      }
                    </div>
                  </div>
                  <button
                    pButton
                    type="submit"
                    label="Registrarse"
                    class="w-full"
                    [loading]="signupLoading()"
                    [disabled]="signupForm.invalid"
                    appPressFeedback="press"
                  ></button>
                </form>
              }

              <p class="text-sm text-secondary mt-4 text-center">
                ¿Ya tienes cuenta?
                <a href="#" (click)="switchToLogin($event)" class="text-primary font-medium hover:underline" appPressFeedback>Iniciar sesión</a>
              </p>
            } @else {
              <h2 class="text-xl font-bold text-primary mb-2">Recuperación de acceso</h2>
              <p class="text-secondary text-sm mb-1">¿Olvidaste tu clave?</p>
              <p class="text-muted text-sm mb-6">
                Ingresa tu correo y te enviaremos las instrucciones para restablecerla.
              </p>

              @if (recoverySuccess()) {
                <div #recoverySuccessRef class="recovery-success p-4 rounded-lg" role="status" aria-live="polite">
                  <p class="text-success text-sm font-medium flex items-center gap-2">
                    <i class="pi pi-check-circle"></i>
                    Revisa tu correo. Te hemos enviado las instrucciones.
                  </p>
                </div>
              } @else {
                @if (errorMessage()) {
                  <div class="error-inline p-3 rounded-lg mb-4 text-sm text-error bg-state-error-bg border border-state-error-border" role="alert">
                    {{ errorMessage() }}
                  </div>
                }
                <form [formGroup]="recoveryForm" (ngSubmit)="onRecoverySubmit()" class="flex flex-col gap-4">
                  <div #recoveryEmailField class="flex flex-col gap-2">
                    <label for="recovery-email" class="text-sm font-medium text-primary">
                      Correo electrónico <span class="text-error">*</span>
                    </label>
                    <div class="relative">
                      <input
                        id="recovery-email"
                        type="email"
                        pInputText
                        formControlName="email"
                        placeholder="tu&#64;email.com"
                        class="w-full"
                        autocomplete="email"
                      />
                      @if (recoveryForm.get('email')?.valid && recoveryForm.get('email')?.dirty) {
                        <i class="pi pi-check-circle absolute right-3 top-1/2 -translate-y-1/2 text-success"></i>
                      }
                    </div>
                    <div class="min-h-5 text-xs text-error">
                      @if (recoveryForm.get('email')?.invalid && recoveryForm.get('email')?.touched) {
                        <span appAnimateIn>{{ recoveryForm.get('email')?.hasError('required') ? 'El correo es requerido' : 'Introduce un correo válido' }}</span>
                      }
                    </div>
                  </div>

                  <button
                    pButton
                    type="submit"
                    label="Enviar instrucciones"
                    class="w-full"
                    [loading]="recoveryLoading()"
                    [disabled]="recoveryForm.invalid"
                    appPressFeedback="press"
                  ></button>
                </form>
              }

              <a
                href="#"
                (click)="goBackToLogin($event)"
                class="text-sm text-secondary hover:text-primary transition-colors mt-4 inline-block"
                appPressFeedback
              >
                ← Volver al inicio de sesión
              </a>
            }
          </div>
        </section>

        <footer class="mt-4">
          <a
            routerLink="/"
            class="text-sm text-muted hover:text-primary transition-colors"
            appPressFeedback
          >
            App Familiar
          </a>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .login-logo { border-color: var(--color-primary); }
    .border-primary { border-color: var(--color-primary); }
    .border-default { border-color: var(--border-default); }
    .recovery-success {
      background: var(--state-success-bg);
      border: 1px solid var(--state-success-border);
    }
  `],
})
export class LoginComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private title = inject(Title);
  private gsap = inject(GsapAnimationsService);
  private doc = inject(DOCUMENT);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);

  formContentRef = viewChild<ElementRef<HTMLElement>>('formContent');
  recoverySuccessRef = viewChild<ElementRef<HTMLElement>>('recoverySuccessRef');
  loginContainerRef = viewChild<ElementRef<HTMLElement>>('loginContainer');
  emailFieldRef = viewChild<ElementRef<HTMLElement>>('emailField');
  passwordFieldRef = viewChild<ElementRef<HTMLElement>>('passwordField');

  loading = signal(false);
  recoveryLoading = signal(false);
  recoverySuccess = signal(false);
  signupLoading = signal(false);
  signupSuccess = signal(false);
  errorMessage = signal<string | null>(null);
  mode = signal<'login' | 'signup' | 'recovery'>('login');
  buttonLabel = signal('Ingresar');

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [false],
  });

  signupForm = this.fb.nonNullable.group({
    displayName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  recoveryForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.title.setTitle('Iniciar Sesión - App Familiar');
    effect(() => {
      const m = this.mode();
      const titles: Record<string, string> = {
        login: 'Iniciar Sesión - App Familiar',
        signup: 'Registro - App Familiar',
        recovery: 'Recuperación de acceso - App Familiar',
      };
      this.title.setTitle(titles[m] ?? titles['login']);
    });
    // Si ya hay sesión (persistida), redirigir a la app
    this.authService.whenReady.then(() => {
      if (this.authService.isAuthenticated()) {
        this.router.navigate(['/app']);
      }
    });
  }

  ngAfterViewInit(): void {
    const container = this.loginContainerRef()?.nativeElement;
    if (container) this.gsap.animatePageEnter(container);
  }

  private clearError(): void {
    this.errorMessage.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const emailField = this.emailFieldRef()?.nativeElement;
      const passwordField = this.passwordFieldRef()?.nativeElement;
      if (emailField && this.form.get('email')?.invalid) this.gsap.animateInputError(emailField);
      if (passwordField && this.form.get('password')?.invalid) this.gsap.animateInputError(passwordField);
      return;
    }
    this.clearError();
    this.loading.set(true);
    this.buttonLabel.set('Ingresando...');
    const { email, password } = this.form.getRawValue();
    const { error } = await this.authService.login(email, password);
    this.loading.set(false);
    this.buttonLabel.set('Ingresar');
    if (error) {
      this.errorMessage.set(error.message ?? 'Error al iniciar sesión');
      return;
    }
    this.router.navigate(['/app/dashboard']);
  }

  async onSignupSubmit(): Promise<void> {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }
    this.clearError();
    this.signupLoading.set(true);
    const { displayName, email, password } = this.signupForm.getRawValue();
    const { data, error } = await this.supabase.signUp(email, password, {
      data: displayName ? { display_name: displayName } : undefined,
    });
    this.signupLoading.set(false);
    if (error) {
      this.errorMessage.set(error.message ?? 'Error al registrar');
      return;
    }
    if (data?.user && !data.session) {
      this.signupSuccess.set(true);
    } else if (data?.session) {
      this.router.navigate(['/app/dashboard']);
    } else {
      this.signupSuccess.set(true);
    }
  }

  async onRecoverySubmit(): Promise<void> {
    if (this.recoveryForm.invalid) {
      this.recoveryForm.markAllAsTouched();
      const recoveryEmailField = this.doc.getElementById('recovery-email');
      if (recoveryEmailField && this.recoveryForm.get('email')?.invalid) {
        this.gsap.animateInputError(recoveryEmailField as HTMLElement);
      }
      return;
    }
    this.clearError();
    this.recoveryLoading.set(true);
    const email = this.recoveryForm.getRawValue().email;
    const { error } = await this.supabase.resetPasswordForEmail(email);
    this.recoveryLoading.set(false);
    if (error) {
      this.errorMessage.set(error.message ?? 'Error al enviar el correo');
      return;
    }
    this.recoverySuccess.set(true);
    setTimeout(() => {
      const successEl = this.recoverySuccessRef()?.nativeElement;
      if (successEl) this.gsap.animateSkeletonToContent(successEl);
    }, 50);
  }

  switchToRecovery(event: Event): void {
    event.preventDefault();
    this.clearError();
    const el = this.formContentRef()?.nativeElement;
    if (!el) return;
    this.gsap.animateContentSwap(el, () => {
      this.mode.set('recovery');
      this.recoverySuccess.set(false);
      this.recoveryForm.reset();
    }, () => (this.doc.getElementById('recovery-email') as HTMLInputElement)?.focus());
  }

  switchToSignup(event: Event): void {
    event.preventDefault();
    this.clearError();
    const el = this.formContentRef()?.nativeElement;
    if (!el) return;
    this.gsap.animateContentSwap(el, () => {
      this.mode.set('signup');
      this.signupSuccess.set(false);
      this.signupForm.reset();
    }, () => (this.doc.getElementById('displayName') as HTMLInputElement)?.focus());
  }

  switchToLogin(event: Event): void {
    event.preventDefault();
    this.clearError();
    const el = this.formContentRef()?.nativeElement;
    if (!el) return;
    this.gsap.animateContentSwap(el, () => {
      this.mode.set('login');
      this.signupSuccess.set(false);
      this.signupForm.reset();
    }, () => (this.doc.getElementById('email') as HTMLInputElement)?.focus());
  }

  goBackToLogin(event: Event): void {
    event.preventDefault();
    this.clearError();
    const el = this.formContentRef()?.nativeElement;
    if (!el) return;
    this.gsap.animateContentSwap(el, () => {
      this.mode.set('login');
      this.recoverySuccess.set(false);
      this.recoveryForm.reset();
    }, () => (this.doc.getElementById('email') as HTMLInputElement)?.focus());
  }
}
