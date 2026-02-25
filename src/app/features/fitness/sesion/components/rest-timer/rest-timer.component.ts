import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  OnDestroy,
  effect,
  inject,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import gsap from 'gsap';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';

const PRESETS = [60, 120, 180, 240]; // 1:00, 2:00, 3:00, 4:00
const STORAGE_KEY = 'fitness_rest_timer_seconds';

const CONIC_GRADIENT = (deg: number) =>
  `conic-gradient(var(--p-primary-500, #3b82f6) 0deg ${deg}deg, var(--p-surface-200, #e5e7eb) ${deg}deg 360deg)`;

@Component({
  selector: 'app-rest-timer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DialogModule, ButtonModule, FormsModule],
  template: `
    <p-dialog
      [visible]="dialogVisible()"
      (visibleChange)="onVisibleChange($event)"
      [header]="'Temporizador de descanso'"
      [modal]="true"
      appendTo="body"
      [closable]="!running()"
      [style]="{ width: 'min(360px, 95vw)' }"
      (onHide)="onHide()"
      [draggable]="false"
    >
      @if (!running()) {
        <p class="text-secondary text-sm mb-4">
          Elige la duración abajo o establece la tuya. Las duraciones personalizadas se guardan para la próxima vez.
        </p>
        <div class="flex flex-col gap-2 mb-4">
          @for (sec of presets; track sec) {
            <button
              type="button"
              class="w-full rounded-lg bg-primary/15 text-primary hover:bg-primary/25 py-3 font-medium transition"
              (click)="start(sec)"
            >
              {{ formatTime(sec) }}
            </button>
          }
        </div>
        <div class="flex items-center gap-2">
          <input
            type="number"
            [(ngModel)]="customMinutes"
            min="0"
            max="99"
            class="w-20 rounded border border-default px-2 py-1 text-center"
            placeholder="Min"
          />
          <span class="text-secondary">min</span>
          <input
            type="number"
            [(ngModel)]="customSeconds"
            min="0"
            max="59"
            class="w-20 rounded border border-default px-2 py-1 text-center"
            placeholder="Seg"
          />
          <span class="text-secondary">seg</span>
          <button
            pButton
            label="Crear temporizador personalizado"
            (click)="startCustom()"
            class="flex-1"
          ></button>
        </div>
      } @else {
        <p class="text-secondary text-sm mb-2">Ajustar la duración con los botones +/-.</p>
        <div class="flex flex-col items-center gap-4 py-4">
          <div class="relative w-48 h-48 rounded-full border-4 border-primary/30 flex items-center justify-center overflow-hidden">
            <div
              #circleRef
              class="absolute inset-0 rounded-full"
              [style.background]="circleBackground()"
            ></div>
            <div
              #pulseOverlayRef
              class="absolute inset-0 rounded-full pointer-events-none z-[1] opacity-0"
              style="box-shadow: 0 0 28px rgba(239, 68, 68, 0.5)"
            ></div>
            <div class="relative z-10 flex items-center gap-0.5 text-4xl font-bold" style="perspective: 200px">
              <span #minRef class="tabular-nums inline-block" style="transform-style: preserve-3d; min-width: 1ch"></span>
              <span class="tabular-nums">:</span>
              <span #secTensRef class="tabular-nums inline-block" style="transform-style: preserve-3d; min-width: 1ch"></span>
              <span #secOnesRef class="tabular-nums inline-block" style="transform-style: preserve-3d; min-width: 1ch"></span>
            </div>
            <span class="absolute bottom-6 left-0 right-0 text-center text-sm text-secondary z-10">{{ formatTime(totalSeconds()) }} total</span>
          </div>
          <div class="flex gap-2 w-full">
            <button pButton label="-30 seg" severity="secondary" (click)="adjust(-30)" class="flex-1"></button>
            <button pButton label="+30 seg" severity="secondary" (click)="adjust(30)" class="flex-1"></button>
            <button pButton label="Omitir" (click)="skip()" class="flex-1"></button>
          </div>
        </div>
      }
    </p-dialog>
  `,
})
export class RestTimerComponent implements OnDestroy {
  private readonly gsap = inject(GsapAnimationsService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('circleRef') circleRef?: ElementRef<HTMLElement>;
  @ViewChild('pulseOverlayRef') pulseOverlayRef?: ElementRef<HTMLElement>;
  @ViewChild('minRef') minRef?: ElementRef<HTMLElement>;
  @ViewChild('secTensRef') secTensRef?: ElementRef<HTMLElement>;
  @ViewChild('secOnesRef') secOnesRef?: ElementRef<HTMLElement>;

  visible = input.required<boolean>();
  /** Duración por defecto cuando se abre desde "descanso automático" (segundos). */
  defaultSeconds = input<number>(90);

  readonly timerEnd = output<void>();
  readonly closed = output<void>();

  readonly presets = PRESETS;
  customMinutes = 1;
  customSeconds = 30;

  /** Estado interno para two-way binding con p-dialog (el close button requiere poder actualizar visible). */
  readonly dialogVisible = signal(false);

  readonly running = signal(false);
  readonly secondsLeft = signal(0);
  readonly totalSeconds = signal(0);

  private progressTween: gsap.core.Tween | null = null;
  private progress = { value: 1 };
  private pulseCleanup: (() => void) | null = null;
  private lastDisplayedSeconds = 0;

  readonly circleBackground = computed(() => {
    const total = this.totalSeconds();
    const left = this.secondsLeft();
    if (total <= 0) return 'transparent';
    const pct = left / total;
    const deg = 360 * (1 - pct);
    return CONIC_GRADIENT(deg);
  });

  constructor() {
    effect(() => {
      const v = this.visible();
      this.dialogVisible.set(v);
      if (!v) this.stop();
      else this.loadSavedCustom();
    });
  }

  onVisibleChange(v: boolean): void {
    this.dialogVisible.set(v);
    if (!v) this.onHide();
  }

  private loadSavedCustom(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const sec = parseInt(saved, 10);
        if (!Number.isNaN(sec) && sec > 0) {
          this.customMinutes = Math.floor(sec / 60);
          this.customSeconds = sec % 60;
        }
      }
    } catch {
      // ignore
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }

  start(seconds: number): void {
    this.saveCustom(seconds);
    this.totalSeconds.set(seconds);
    this.secondsLeft.set(seconds);
    this.running.set(true);
    this.lastDisplayedSeconds = seconds;
    this.progress.value = 1;

    this.cdr.detectChanges();
    setTimeout(() => this.setupTimerAnimations(), 0);
  }

  startCustom(): void {
    const sec = this.customMinutes * 60 + this.customSeconds;
    if (sec <= 0) return;
    this.start(sec);
  }

  private setupTimerAnimations(): void {
    const circleEl = this.circleRef?.nativeElement;
    if (!circleEl || !this.minRef?.nativeElement) return;

    const total = this.totalSeconds();
    const left = this.secondsLeft();

    this.setDigitDisplay(left);

    if (this.gsap.canAnimate()) {
      this.gsap.animateRestTimerCircleIn(circleEl);
    }

    this.startProgressTween(left);

    if (left <= 10 && this.gsap.canAnimate()) {
      const overlayEl = this.pulseOverlayRef?.nativeElement;
      if (overlayEl) this.pulseCleanup = this.gsap.animateRestTimerPulse(overlayEl);
    }
  }

  private startProgressTween(durationSeconds: number): void {
    this.killProgressTween();

    const circleEl = this.circleRef?.nativeElement;
    const minEl = this.minRef?.nativeElement;
    const secTensEl = this.secTensRef?.nativeElement;
    const secOnesEl = this.secOnesRef?.nativeElement;
    const total = this.totalSeconds();

    this.progress.value = durationSeconds / total;

    this.progressTween = gsap.to(this.progress, {
      value: 0,
      duration: durationSeconds,
      ease: 'none',
      onUpdate: () => {
        const pct = this.progress.value;
        const secs = Math.ceil(pct * total);

        if (circleEl) {
          const deg = 360 * (1 - pct);
          circleEl.style.background = CONIC_GRADIENT(deg);
        }

        if (secs !== this.lastDisplayedSeconds) {
          const [prevMin, prevSecTens, prevSecOnes] = this.getTimeParts(this.lastDisplayedSeconds);
          const [newMin, newSecTens, newSecOnes] = this.getTimeParts(secs);

          this.lastDisplayedSeconds = secs;
          this.secondsLeft.set(secs);

          if (this.gsap.canAnimate()) {
            if (newMin !== prevMin && minEl) {
              this.gsap.animateRestTimerDigitFlip(minEl, String(newMin));
            }
            if (newSecTens !== prevSecTens && secTensEl) {
              this.gsap.animateRestTimerDigitFlip(secTensEl, String(newSecTens));
            }
            if (newSecOnes !== prevSecOnes && secOnesEl) {
              this.gsap.animateRestTimerDigitFlip(secOnesEl, String(newSecOnes));
            }
          } else {
            this.setDigitDisplay(secs);
          }

          if (secs <= 10 && secs > 0 && !this.pulseCleanup && this.gsap.canAnimate()) {
            const overlayEl = this.pulseOverlayRef?.nativeElement;
            if (overlayEl) this.pulseCleanup = this.gsap.animateRestTimerPulse(overlayEl);
          }
        }
      },
      onComplete: () => {
        this.killProgressTween();
        this.pulseCleanup?.();
        this.pulseCleanup = null;

        if (circleEl && this.gsap.canAnimate()) {
          this.gsap.animateRestTimerComplete(circleEl, () => {
            this.stop();
            this.timerEnd.emit();
          });
        } else {
          this.stop();
          this.timerEnd.emit();
        }
      },
    });
  }

  private killProgressTween(): void {
    if (this.progressTween) {
      this.progressTween.kill();
      this.progressTween = null;
    }
  }

  adjust(delta: number): void {
    const total = this.totalSeconds();
    const current = this.secondsLeft();
    const newLeft = Math.max(0, Math.min(total, current + delta));

    if (newLeft === 0) {
      this.skip();
      return;
    }

    this.secondsLeft.set(newLeft);
    this.lastDisplayedSeconds = newLeft;

    this.setDigitDisplay(newLeft);

    const circleEl = this.circleRef?.nativeElement;
    if (circleEl) {
      const pct = newLeft / total;
      const deg = 360 * (1 - pct);
      circleEl.style.background = CONIC_GRADIENT(deg);
    }

    this.pulseCleanup?.();
    this.pulseCleanup = null;
    if (newLeft <= 10 && this.gsap.canAnimate()) {
      const overlayEl = this.pulseOverlayRef?.nativeElement;
      if (overlayEl) this.pulseCleanup = this.gsap.animateRestTimerPulse(overlayEl);
    }

    this.startProgressTween(newLeft);
  }

  skip(): void {
    const circleEl = this.circleRef?.nativeElement;
    this.killProgressTween();
    this.pulseCleanup?.();
    this.pulseCleanup = null;

    if (circleEl && this.gsap.canAnimate()) {
      this.gsap.animateRestTimerComplete(circleEl, () => {
        this.stop();
        this.timerEnd.emit();
      });
    } else {
      this.stop();
      this.timerEnd.emit();
    }
  }

  private stop(): void {
    this.killProgressTween();
    this.pulseCleanup?.();
    this.pulseCleanup = null;
    this.running.set(false);
  }

  onHide(): void {
    this.stop();
    this.closed.emit();
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /** Devuelve [minutos, decenasSegundos, unidadesSegundos] para flip selectivo. */
  private getTimeParts(seconds: number): [number, number, number] {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return [m, Math.floor(s / 10), s % 10];
  }

  private setDigitDisplay(seconds: number): void {
    const [min, secTens, secOnes] = this.getTimeParts(seconds);
    const minEl = this.minRef?.nativeElement;
    const secTensEl = this.secTensRef?.nativeElement;
    const secOnesEl = this.secOnesRef?.nativeElement;
    if (minEl) minEl.textContent = String(min);
    if (secTensEl) secTensEl.textContent = String(secTens);
    if (secOnesEl) secOnesEl.textContent = String(secOnes);
  }

  private saveCustom(seconds: number): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, String(seconds));
    } catch {
      // ignore
    }
  }
}
