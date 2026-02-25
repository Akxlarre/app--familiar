import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import type { Product, ProductCategory, ProductLocation } from '@core/models/inventory.model';

@Component({
  selector: 'app-product-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DatePickerModule,
  ],
  template: `
    <form [formGroup]="form" class="flex flex-col gap-4" (ngSubmit)="submit.emit()">
      <div>
        <label class="text-sm font-medium text-primary block mb-1">Nombre *</label>
        <input
          type="text"
          pInputText
          formControlName="name"
          class="w-full"
          placeholder="Ej: Leche Descremada Soprole 1L"
        />
        @if (form.get('name')?.invalid && form.get('name')?.touched) {
          <p class="text-error text-xs mt-1">Ingresa un nombre</p>
        }
      </div>

      <div>
        <label class="text-sm font-medium text-primary block mb-1">Categoría *</label>
        <p-select
          formControlName="categoryId"
          [options]="categories()"
          optionLabel="name"
          optionValue="id"
          placeholder="Selecciona categoría"
          styleClass="w-full"
          appendTo="body"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm font-medium text-primary block mb-1">Cantidad actual *</label>
          <p-inputNumber
            formControlName="quantity"
            [minFractionDigits]="0"
            [maxFractionDigits]="2"
            [min]="0"
            styleClass="w-full"
            inputStyleClass="w-full"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-primary block mb-1">Unidad *</label>
          <input
            type="text"
            pInputText
            formControlName="unit"
            class="w-full"
            placeholder="unidad, L, kg, g..."
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm font-medium text-primary block mb-1">Stock mínimo</label>
          <p-inputNumber
            formControlName="stockMinimum"
            [minFractionDigits]="0"
            [maxFractionDigits]="2"
            [min]="0"
            styleClass="w-full"
            inputStyleClass="w-full"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-primary block mb-1">Ubicación *</label>
          <p-select
            formControlName="location"
            [options]="locationOptions"
            optionLabel="label"
            optionValue="value"
            styleClass="w-full"
            appendTo="body"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm font-medium text-primary block mb-1">Fecha de vencimiento</label>
          <p-datePicker
            formControlName="expiryDate"
            dateFormat="dd/mm/yy"
            [iconDisplay]="'input'"
            appendTo="body"
            styleClass="w-full"
            inputStyleClass="w-full"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-primary block mb-1">Código de barras</label>
          <input
            type="text"
            pInputText
            formControlName="barcode"
            class="w-full"
            placeholder="Opcional"
          />
        </div>
      </div>
    </form>
  `,
})
export class ProductFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);

  product = input<Product | null>(null);
  categories = input<ProductCategory[]>([]);

  submit = output<void>();

  readonly locationOptions: { label: string; value: ProductLocation }[] = [
    { label: 'Despensa', value: 'despensa' },
    { label: 'Refrigerador', value: 'refrigerador' },
    { label: 'Freezer', value: 'freezer' },
    { label: 'Otro', value: 'otro' },
  ];

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    categoryId: ['', Validators.required],
    quantity: [0 as number, [Validators.required, Validators.min(0)]],
    unit: ['unidad', Validators.required],
    stockMinimum: [0 as number, [Validators.min(0)]],
    location: ['despensa' as ProductLocation, Validators.required],
    expiryDate: [null as Date | null],
    barcode: [''],
  });

  ngOnInit(): void {
    const p = this.product();
    if (!p) return;
    this.form.patchValue({
      name: p.name,
      categoryId: p.category_id,
      quantity: p.quantity,
      unit: p.unit,
      stockMinimum: p.stock_minimum,
      location: p.location,
      expiryDate: p.expiry_date ? new Date(p.expiry_date) : null,
      barcode: p.barcode ?? '',
    });
  }

  getValue(): {
    name: string;
    categoryId: string;
    quantity: number;
    unit: string;
    stockMinimum: number;
    location: ProductLocation;
    expiryDate: Date | null;
    barcode: string | null;
  } {
    const raw = this.form.getRawValue();
    return {
      name: raw.name ?? '',
      categoryId: raw.categoryId ?? '',
      quantity: raw.quantity ?? 0,
      unit: raw.unit ?? 'unidad',
      stockMinimum: raw.stockMinimum ?? 0,
      location: raw.location ?? 'despensa',
      expiryDate: raw.expiryDate ?? null,
      barcode: raw.barcode?.trim() ? raw.barcode.trim() : null,
    };
  }
}

