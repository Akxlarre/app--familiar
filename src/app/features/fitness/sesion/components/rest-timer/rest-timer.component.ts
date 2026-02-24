import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  OnDestroy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';

const PRESETS = [60, 120, 180, 240]; // 1:00, 2:00, 3:00, 4:00
const STORAGE_KEY = 'fitness_rest_timer_seconds';

@Component({
  selector: 'app-rest-timer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DialogModule, ButtonModule, FormsModule],
  template: `
    <p-dialog
      [visible]="visible()"
      [header]="'Temporizador de descanso'"
      [modal]="true"
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
          <div
            class="relative w-48 h-48 rounded-full flex items-center justify-center border-4 border-primary/30"
            [style.background]="circleBackground()"
          >
            <span class="text-4xl font-bold tabular-nums">{{ formatTime(secondsLeft()) }}</span>
            <span class="absolute bottom-6 text-sm text-secondary">{{ formatTime(totalSeconds()) }} total</span>
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
  visible = input.required<boolean>();
  /** Duración por defecto cuando se abre desde "descanso automático" (segundos). */
  defaultSeconds = input<number>(90);

  readonly timerEnd = output<void>();
  readonly closed = output<void>();

  readonly presets = PRESETS;
  customMinutes = 1;
  customSeconds = 30;

  readonly running = signal(false);
  readonly secondsLeft = signal(0);
  readonly totalSeconds = signal(0);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  readonly circleBackground = computed(() => {
    const total = this.totalSeconds();
    const left = this.secondsLeft();
    if (total <= 0) return 'transparent';
    const pct = left / total;
    const deg = 360 * (1 - pct);
    return `conic-gradient(var(--p-primary-500, #3b82f6) 0deg ${deg}deg, var(--p-surface-200, #e5e7eb) ${deg}deg 360deg)`;
  });

  constructor() {
    effect(() => {
      const v = this.visible();
      if (!v) this.stop();
      else this.loadSavedCustom();
    });
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
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  startCustom(): void {
    const sec = this.customMinutes * 60 + this.customSeconds;
    if (sec <= 0) return;
    this.start(sec);
  }

  private tick(): void {
    const n = this.secondsLeft();
    if (n <= 1) {
      this.stop();
      this.timerEnd.emit();
      return;
    }
    this.secondsLeft.set(n - 1);
  }

  adjust(delta: number): void {
    this.secondsLeft.update((s) => Math.max(0, Math.min(this.totalSeconds(), s + delta)));
  }

  skip(): void {
    this.stop();
    this.timerEnd.emit();
  }

  private stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
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

  private saveCustom(seconds: number): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, String(seconds));
    } catch {
      // ignore
    }
  }
}
