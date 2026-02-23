import {
  Component,
  input,
  ChangeDetectionStrategy,
  forwardRef,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { ColorPicker } from 'primeng/colorpicker';

/**
 * Selector de colores del Design System — wrapper de PrimeNG ColorPicker.
 * Formato HEX por defecto, compatible con formularios reactivos.
 */
@Component({
  selector: 'app-color-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ColorPicker],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ColorPickerComponent),
      multi: true,
    },
  ],
  template: `
    <div class="flex flex-col gap-2">
      @if (label()) {
        <label
          [for]="inputId()"
          class="text-sm font-medium text-primary block"
        >
          {{ label() }}
        </label>
      }
      <p-colorpicker
        [inputId]="inputId()"
        [ngModel]="internalValue()"
        (ngModelChange)="onValueChange($event)"
        (onHide)="handleTouched()"
        format="hex"
        [styleClass]="styleClass()"
        [inline]="inline()"
        [disabled]="disabled()"
        [defaultColor]="defaultColor()"
        appendTo="body"
      />
    </div>
  `,
})
export class ColorPickerComponent implements ControlValueAccessor {
  label = input<string | undefined>(undefined);
  inputId = input<string>('color');
  styleClass = input<string>('w-full');
  inline = input<boolean>(false);
  disabled = input<boolean>(false);
  defaultColor = input<string | undefined>('#3B82F6');

  internalValue = signal<string | null>(null);

  private _onChange: (value: string | null) => void = () => {};
  private _onTouched: () => void = () => {};

  writeValue(value: string | null | undefined): void {
    this.internalValue.set(value ?? null);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  handleTouched(): void {
    this._onTouched();
  }

  setDisabledState(isDisabled: boolean): void {
    // Se maneja via input disabled - el padre puede usar [disabled]="form.get('color')?.disabled"
    // Para CVA estándar, podríamos usar un signal interno
  }

  onValueChange(value: string | null | undefined): void {
    const v = value ?? null;
    this.internalValue.set(v);
    this._onChange(v);
  }
}
