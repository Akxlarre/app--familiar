import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  input,
  model,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { FoodDatabaseService } from '@core/services/food-database.service';
import type { Food } from '@core/models/nutrition.model';

@Component({
  selector: 'app-nuevo-alimento-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputNumberModule],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      header="Nuevo alimento"
      [modal]="true"
      appendTo="body"
      [style]="{ width: '90vw', maxWidth: '420px' }"
      [draggable]="false"
      [resizable]="false"
      role="dialog"
      aria-labelledby="new-food-title"
      aria-modal="true"
    >
      <ng-template pTemplate="header">
        <h2 id="new-food-title" class="font-semibold text-lg">Ingresar desde etiqueta</h2>
      </ng-template>

      <form (ngSubmit)="save()" class="flex flex-col gap-3">
        <div>
          <label for="name" class="block text-sm font-medium mb-1">Nombre del producto</label>
          <input
            id="name"
            type="text"
            [(ngModel)]="name"
            name="name"
            class="w-full rounded border border-default px-3 py-2"
            required
            aria-required="true"
          />
        </div>
        <div>
          <label for="brand" class="block text-sm font-medium mb-1">Marca (opcional)</label>
          <input
            id="brand"
            type="text"
            [(ngModel)]="brand"
            name="brand"
            class="w-full rounded border border-default px-3 py-2"
          />
        </div>
        <div>
          <label for="barcode" class="block text-sm font-medium mb-1">Código de barras (opcional)</label>
          <input
            id="barcode"
            type="text"
            [(ngModel)]="barcode"
            name="barcode"
            class="w-full rounded border border-default px-3 py-2"
            placeholder="EAN"
          />
        </div>
        <p class="text-sm text-secondary">Por 100 g o 100 ml</p>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="cal" class="block text-sm font-medium mb-1">Calorías</label>
            <p-inputNumber id="cal" [(ngModel)]="calories100" name="calories100" [min]="0" [max]="1000" inputStyleClass="w-full" [ariaRequired]="true" />
          </div>
          <div>
            <label for="protein" class="block text-sm font-medium mb-1">Proteína (g)</label>
            <p-inputNumber id="protein" [(ngModel)]="protein100" name="protein100" [min]="0" [max]="100" [step]="0.1" inputStyleClass="w-full" [ariaRequired]="true" />
          </div>
          <div>
            <label for="carbs" class="block text-sm font-medium mb-1">Carbohidratos (g)</label>
            <p-inputNumber id="carbs" [(ngModel)]="carbs100" name="carbs100" [min]="0" [max]="100" [step]="0.1" inputStyleClass="w-full" [ariaRequired]="true" />
          </div>
          <div>
            <label for="fat" class="block text-sm font-medium mb-1">Grasas (g)</label>
            <p-inputNumber id="fat" [(ngModel)]="fat100" name="fat100" [min]="0" [max]="100" [step]="0.1" inputStyleClass="w-full" [ariaRequired]="true" />
          </div>
        </div>
        <details class="text-sm">
          <summary class="cursor-pointer text-secondary">Opcionales: fibra, azúcar, sodio</summary>
          <div class="grid grid-cols-2 gap-2 mt-2">
            <div><label class="block text-sm">Fibra (g)</label><p-inputNumber [(ngModel)]="fiber100" name="fiber100" [min]="0" [max]="100" [step]="0.1" inputStyleClass="w-full" /></div>
            <div><label class="block text-sm">Azúcar (g)</label><p-inputNumber [(ngModel)]="sugar100" name="sugar100" [min]="0" [max]="100" [step]="0.1" inputStyleClass="w-full" /></div>
            <div><label class="block text-sm">Sodio (g)</label><p-inputNumber [(ngModel)]="sodium100" name="sodium100" [min]="0" [max]="10" [step]="0.01" inputStyleClass="w-full" /></div>
          </div>
        </details>
      </form>

      <ng-template pTemplate="footer">
        <button pButton label="Cancelar" severity="secondary" (click)="visible.set(false)"></button>
        <button pButton label="Guardar" icon="pi pi-check" (click)="save()" [loading]="saving()"></button>
      </ng-template>
    </p-dialog>
  `,
})
export class NuevoAlimentoDialogComponent {
  private foodDb = inject(FoodDatabaseService);

  visible = model.required<boolean>();
  householdId = input.required<string>();
  readonly created = output<Food>();

  readonly saving = signal(false);
  name = '';
  brand = '';
  barcode = '';
  calories100 = 0;
  protein100 = 0;
  carbs100 = 0;
  fat100 = 0;
  fiber100: number | null = null;
  sugar100: number | null = null;
  sodium100: number | null = null;

  async save(): Promise<void> {
    const hid = this.householdId();
    if (!this.name?.trim() || hid === '') return;
    if (
      this.calories100 < 0 ||
      this.protein100 < 0 ||
      this.carbs100 < 0 ||
      this.fat100 < 0
    )
      return;
    this.saving.set(true);
    const { data, error } = await this.foodDb.createFood({
      householdId: hid,
      name: this.name.trim(),
      brand: this.brand?.trim() || null,
      barcode: this.barcode?.trim() || null,
      calories100: this.calories100,
      protein100: this.protein100,
      carbs100: this.carbs100,
      fat100: this.fat100,
      fiber100: this.fiber100 ?? null,
      sugar100: this.sugar100 ?? null,
      sodium100: this.sodium100 ?? null,
      source: 'manual',
    });
    this.saving.set(false);
    if (!error && data) {
      this.visible.set(false);
      this.created.emit(data);
      this.reset();
    }
  }

  private reset(): void {
    this.name = '';
    this.brand = '';
    this.barcode = '';
    this.calories100 = 0;
    this.protein100 = 0;
    this.carbs100 = 0;
    this.fat100 = 0;
    this.fiber100 = null;
    this.sugar100 = null;
    this.sodium100 = null;
  }
}
