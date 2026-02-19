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
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import { AnimateInDirective } from '@core/directives/animate-in.directive';

export type UserRole =
  | 'administrador'
  | 'instructor'
  | 'relator'
  | 'secretaria'
  | 'alumno';

interface RoleOption {
  id: UserRole;
  label: string;
  description: string;
  icon: string;
  iconBgClass: string;
}

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
        <!-- Logo y marca -->
        <header class="flex flex-col items-center gap-2 text-center">
          <div class="login-logo w-16 h-16 rounded-full bg-surface border-2 border-primary flex items-center justify-center shadow-md">
            <i class="pi pi-shield text-2xl text-primary"></i>
          </div>
          <h1 class="text-2xl font-bold font-display text-primary">
            Escuela de Conductores
          </h1>
          <p class="text-sm text-primary font-medium">Chillán</p>
        </header>

        <!-- Formulario -->
        <section class="login-form w-full card bg-surface rounded-xl p-6 shadow-md border border-default">
          <div #formContent class="form-content-wrapper">
            @if (mode() === 'login') {
              <h2 class="text-xl font-bold text-primary mb-6">Iniciar Sesión</h2>

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
                      placeholder="tu&#64;email.cl"
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
                        placeholder="usuario&#64;empresa.com"
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

        <!-- Selector de roles (solo desarrollo, eliminar en producción) -->
        <section class="roles-section w-full flex flex-col gap-3">
          @for (role of roles; track role.id) {
            <button
              type="button"
              (click)="selectRole(role.id)"
              class="role-card w-full flex items-center gap-4 p-4 rounded-xl bg-surface border border-default hover:border-primary hover:shadow-md transition-all text-left"
              [class.role-card--selected]="selectedRole() === role.id"
              appPressFeedback
            >
              <div
                class="role-icon w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                [ngClass]="role.iconBgClass"
              >
                <i [class]="role.icon" class="text-lg text-primary"></i>
              </div>
              <div class="flex-1 min-w-0">
                <span class="font-semibold text-primary block">{{ role.label }}</span>
                <span class="text-sm text-secondary block">{{ role.description }}</span>
              </div>
              <i class="pi pi-chevron-right text-muted flex-shrink-0"></i>
            </button>
          }
        </section>

        <!-- Footer -->
        <footer class="mt-4">
          <a
            routerLink="/"
            class="text-sm text-muted hover:text-primary transition-colors"
            appPressFeedback
          >
            - Volver al sitio público
          </a>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .login-logo {
      border-color: var(--color-primary);
    }

    .role-icon {
      background: var(--color-primary-muted);
    }

    .role-icon.role-icon--success {
      background: var(--state-success-bg);
    }

    .role-icon.role-icon--info {
      background: var(--state-info-bg);
    }

    .role-icon.role-icon--warning {
      background: var(--state-warning-bg);
    }

    .role-card--selected {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-md);
    }

    .border-primary {
      border-color: var(--color-primary);
    }

    .border-default {
      border-color: var(--border-default);
    }

    .recovery-success {
      background: var(--state-success-bg);
      border: 1px solid var(--state-success-border);
    }
  `],
})
/**
 * Página de inicio de sesión para Escuela de Conductores.
 * Incluye formulario de credenciales, selector de roles y enlace al demo.
 * Usa tokens del design system (text-primary, bg-primary-muted, etc.).
 */
export class LoginComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private title = inject(Title);
  private gsap = inject(GsapAnimationsService);
  private doc = inject(DOCUMENT);

  formContentRef = viewChild<ElementRef<HTMLElement>>('formContent');
  recoverySuccessRef = viewChild<ElementRef<HTMLElement>>('recoverySuccessRef');
  loginContainerRef = viewChild<ElementRef<HTMLElement>>('loginContainer');
  emailFieldRef = viewChild<ElementRef<HTMLElement>>('emailField');
  passwordFieldRef = viewChild<ElementRef<HTMLElement>>('passwordField');
  recoveryEmailFieldRef = viewChild<ElementRef<HTMLElement>>('recoveryEmailField');

  loading = signal(false);
  recoveryLoading = signal(false);
  recoverySuccess = signal(false);
  selectedRole = signal<UserRole | null>(null);
  mode = signal<'login' | 'recovery'>('login');
  buttonLabel = signal('Ingresar');

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [false],
  });

  recoveryForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.title.setTitle('Iniciar Sesión - Escuela de Conductores');

    effect(() => {
      const m = this.mode();
      this.title.setTitle(
        m === 'recovery'
          ? 'Recuperación de acceso - Escuela de Conductores'
          : 'Iniciar Sesión - Escuela de Conductores'
      );
    });
  }

  ngAfterViewInit(): void {
    // Animación de entrada del formulario
    const container = this.loginContainerRef()?.nativeElement;
    if (container) {
      this.gsap.animatePageEnter(container);
    }
  }

  roles: RoleOption[] = [
    {
      id: 'administrador',
      label: 'Administrador',
      description: 'Acceso completo al sistema',
      icon: 'pi pi-shield',
      iconBgClass: '',
    },
    {
      id: 'instructor',
      label: 'Instructor',
      description: 'Gestión de clases y alumnos',
      icon: 'pi pi-check-circle',
      iconBgClass: 'role-icon--success',
    },
    {
      id: 'relator',
      label: 'Relator',
      description: 'Cursos teóricos y asistencia',
      icon: 'pi pi-book',
      iconBgClass: 'role-icon--info',
    },
    {
      id: 'secretaria',
      label: 'Secretaria',
      description: 'Matrículas y operaciones',
      icon: 'pi pi-file',
      iconBgClass: '',
    },
    {
      id: 'alumno',
      label: 'Alumno',
      description: 'Portal del estudiante',
      icon: 'pi pi-book',
      iconBgClass: 'role-icon--warning',
    },
  ];

  selectRole(role: UserRole): void {
    this.selectedRole.set(this.selectedRole() === role ? null : role);
    // Por el momento: al hacer clic en un rol, navegar a la app
    this.router.navigate(['/app/dashboard']);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      this.form.markAllAsTouched();
      
      // Shake en campos inválidos
      const emailField = this.emailFieldRef()?.nativeElement;
      const passwordField = this.passwordFieldRef()?.nativeElement;
      
      if (emailField && this.form.get('email')?.invalid) {
        this.gsap.animateInputError(emailField);
      }
      if (passwordField && this.form.get('password')?.invalid) {
        this.gsap.animateInputError(passwordField);
      }
      return;
    }
    
    this.loading.set(true);
    this.buttonLabel.set('Ingresando...');
    
    // TODO: Integrar con auth service
    setTimeout(() => {
      this.loading.set(false);
      this.buttonLabel.set('¡Listo!');
      
      // Feedback de éxito antes de navegar
      setTimeout(() => {
        this.router.navigate(['/app/dashboard']);
      }, 400);
    }, 800);
  }

  switchToRecovery(event: Event): void {
    event.preventDefault();
    const el = this.formContentRef()?.nativeElement;
    if (!el) return;

    this.gsap.animateContentSwap(
      el,
      () => {
        this.mode.set('recovery');
        this.recoverySuccess.set(false);
        this.recoveryForm.reset();
        this.buttonLabel.set('Ingresar');
      },
      () => this.focusRecoveryEmail()
    );
  }

  goBackToLogin(event: Event): void {
    event.preventDefault();
    const el = this.formContentRef()?.nativeElement;
    if (!el) return;

    this.gsap.animateContentSwap(
      el,
      () => {
        this.mode.set('login');
        this.recoverySuccess.set(false);
        this.recoveryForm.reset();
        this.buttonLabel.set('Ingresar');
      },
      () => this.focusLoginEmail()
    );
  }

  private focusLoginEmail(): void {
    setTimeout(() => {
      (this.doc.getElementById('email') as HTMLInputElement | null)?.focus();
    }, 0);
  }

  private focusRecoveryEmail(): void {
    setTimeout(() => {
      (this.doc.getElementById('recovery-email') as HTMLInputElement | null)?.focus();
    }, 0);
  }

  onRecoverySubmit(): void {
    if (this.recoveryForm.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      this.recoveryForm.markAllAsTouched();
      
      // Shake en campo inválido
      const recoveryEmailField = this.recoveryEmailFieldRef()?.nativeElement;
      if (recoveryEmailField && this.recoveryForm.get('email')?.invalid) {
        this.gsap.animateInputError(recoveryEmailField);
      }
      return;
    }
    
    this.recoveryLoading.set(true);
    // TODO: Integrar con API de recuperación
    setTimeout(() => {
      this.recoveryLoading.set(false);
      this.recoverySuccess.set(true);
      setTimeout(() => {
        const successEl = this.recoverySuccessRef()?.nativeElement;
        if (successEl) this.gsap.animateSkeletonToContent(successEl);
      }, 50);
    }, 800);
  }
}
