import {
  Directive,
  ElementRef,
  inject,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';

/**
 * Feedback interactivo — hover (scale 1.02, y: -1) + press (scale 0.98).
 * Coherente con pills del sidebar. Respetando prefers-reduced-motion.
 * 
 * Modos:
 * - 'full' (default): hover + press (addInteractiveFeedback)
 * - 'press': solo press, sin hover (addPressFeedback) - útil para botones PrimeNG que ya tienen hover
 */
@Directive({
  selector: '[appPressFeedback]',
  standalone: true,
})
export class PressFeedbackDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private gsap = inject(GsapAnimationsService);

  /** 'press' = solo press; cualquier otro valor o vacío = full (hover + press) */
  @Input() appPressFeedback: string = 'full';

  private cleanup: (() => void) | null = null;

  ngOnInit(): void {
    // Si es string vacío, undefined o 'full', usar modo completo (hover + press)
    // Solo usar 'press' si explícitamente se especifica
    const mode = this.appPressFeedback === 'press' ? 'press' : 'full';
    
    if (mode === 'press') {
      this.cleanup = this.gsap.addPressFeedback(this.el.nativeElement);
    } else {
      this.cleanup = this.gsap.addInteractiveFeedback(this.el.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.cleanup?.();
  }
}
