import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { AuthService } from '@core/services/auth.service';
import { ProductService } from '@core/services/product.service';
import { InventoryLogService } from '@core/services/inventory-log.service';
import type { Product, InventoryLog } from '@core/models/inventory.model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputNumberModule,
    DialogModule,
    DatePickerModule,
    PageHeaderComponent,
  ],
  template: `
    <div class="flex flex-col gap-6 font-body pb-16">
      <app-page-header
        [title]="product()?.name || 'Producto'"
        [description]="productDescription()"
        parentHref="/app/inventario"
        parentLabel="Volver a despensa"
        [titleId]="'producto-title'"
      />

      @if (loading()) {
        <div class="space-y-4">
          <div class="h-24 bg-subtle rounded-xl animate-pulse"></div>
          <div class="h-32 bg-subtle rounded-xl animate-pulse"></div>
        </div>
      } @else if (!product()) {
        <p class="text-secondary">No se encontró el producto.</p>
      } @else {
        <section class="rounded-xl border border-default bg-surface p-4 shadow-sm flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-sm text-secondary">
                {{ product()?.category_name || 'Sin categoría' }} ·
                {{ locationLabel(product()!.location) }}
              </p>
              <p class="text-xl font-semibold text-primary tabular-nums">
                {{ product()!.quantity }} {{ product()!.unit }}
                @if (product()!.stock_minimum > 0) {
                  <span class="text-sm text-secondary"> · mín. {{ product()!.stock_minimum }}</span>
                }
              </p>
              <div class="mt-1">
                <label for="expiry-picker" class="text-xs text-secondary block mb-1">Fecha de vencimiento (opcional)</label>
                <p-datePicker
                  id="expiry-picker"
                  [(ngModel)]="expiryDateEdit"
                  [ngModelOptions]="{ standalone: true }"
                  dateFormat="dd/mm/yy"
                  [iconDisplay]="'input'"
                  [showIcon]="true"
                  [showClear]="true"
                  [disabled]="saving()"
                  styleClass="w-full max-w-[10rem]"
                  inputStyleClass="w-full text-sm"
                  appendTo="body"
                  placeholder="Sin fecha"
                  (ngModelChange)="onExpiryDateChange($event)"
                />
                @if (product()!.expiry_date) {
                  <p class="text-xs mt-1" [ngClass]="expiryClass(product()!.expiry_date!)">
                    {{ expiryDateHint(product()!.expiry_date!) }}
                  </p>
                }
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                pButton
                type="button"
                icon="pi pi-minus"
                label="Consumir 1"
                (click)="consumeOne()"
                [disabled]="product()!.quantity <= 0 || saving()"
              ></button>
              <button
                pButton
                type="button"
                icon="pi pi-sliders-h"
                label="Ajustar stock"
                severity="secondary"
                (click)="openAdjustDialog()"
                [disabled]="saving()"
              ></button>
            </div>
          </div>
          @if (errorMessage()) {
            <p class="text-error text-sm">{{ errorMessage() }}</p>
          }
        </section>

        <section class="rounded-xl border border-default bg-surface p-4 shadow-sm">
          <h2 class="text-lg font-semibold text-primary mb-3">Historial de inventario</h2>
          @if (logs().length === 0) {
            <p class="text-sm text-secondary">Aún no hay movimientos registrados para este producto.</p>
          } @else {
            <ul class="divide-y divide-default">
              @for (log of logs(); track log.id) {
                <li class="py-2 flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium text-primary">
                      {{ changeTypeLabel(log.change_type) }}
                    </p>
                    <p class="text-xs text-secondary">
                      {{ log.created_at | date: 'd/MM/yyyy HH:mm' }}
                      · de {{ log.quantity_before }} a {{ log.quantity_after }}
                    </p>
                  </div>
                  <span
                    class="text-sm font-semibold tabular-nums"
                    [ngClass]="{
                      'text-state-success': log.quantity_after > log.quantity_before,
                      'text-state-error': log.quantity_after < log.quantity_before,
                      'text-secondary': log.quantity_after === log.quantity_before
                    }"
                  >
                    {{
                      log.quantity_after - log.quantity_before > 0
                        ? '+' + (log.quantity_after - log.quantity_before)
                        : log.quantity_after - log.quantity_before
                    }}
                  </span>
                </li>
              }
            </ul>
          }
        </section>

        <p-dialog
          [visible]="adjustDialogVisible()"
          (visibleChange)="adjustDialogVisible.set($event)"
          header="Ajustar stock"
          [modal]="true"
          appendTo="body"
          [style]="{ width: 'min(100%, 20rem)' }"
          (onHide)="resetAdjustForm()"
        >
          <div class="flex flex-col gap-4">
            <p class="text-sm text-secondary">
              Stock actual: <strong class="text-primary">{{ product()!.quantity }} {{ product()!.unit }}</strong>
            </p>
            <div>
              <label for="new-qty" class="text-sm font-medium text-primary block mb-2">Nueva cantidad</label>
              <p-inputNumber
                id="new-qty"
                [(ngModel)]="adjustNewQuantity"
                [ngModelOptions]="{ standalone: true }"
                [min]="0"
                [maxFractionDigits]="2"
                styleClass="w-full"
                inputStyleClass="w-full"
              />
            </div>
          </div>
          <ng-template pTemplate="footer">
            <button pButton label="Cancelar" severity="secondary" (click)="adjustDialogVisible.set(false)"></button>
            <button
              pButton
              label="Aplicar"
              (click)="submitAdjust()"
              [loading]="saving()"
              [disabled]="adjustNewQuantity === null || adjustNewQuantity === undefined || adjustNewQuantity < 0"
            ></button>
          </ng-template>
        </p-dialog>
      }
    </div>
  `,
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private productsApi = inject(ProductService);
  private logsApi = inject(InventoryLogService);

  loading = signal(true);
  saving = signal(false);
  product = signal<Product | null>(null);
  logs = signal<InventoryLog[]>([]);
  errorMessage = signal<string | null>(null);

  adjustDialogVisible = signal(false);
  adjustNewQuantity: number | null = null;
  expiryDateEdit: Date | null = null;

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    const [productRes, logsRes] = await Promise.all([
      this.productsApi.getProduct(id),
      this.logsApi.getLogsByProduct(id),
    ]);
    if (!productRes.error && productRes.data) {
      this.product.set(productRes.data);
      this.expiryDateEdit = productRes.data.expiry_date
        ? new Date(productRes.data.expiry_date)
        : null;
    }
    if (!logsRes.error) this.logs.set(logsRes.data);
    this.loading.set(false);
  }

  productDescription(): string {
    const p = this.product();
    if (!p) return 'Detalle de producto';
    const loc = this.locationLabel(p.location);
    return `Inventario del hogar · ${loc.toLowerCase()}`;
  }

  locationLabel(loc: Product['location']): string {
    switch (loc) {
      case 'refrigerador':
        return 'Refrigerador';
      case 'despensa':
        return 'Despensa';
      case 'freezer':
        return 'Freezer';
      default:
        return 'Otro';
    }
  }

  expiryDateHint(expiry: string): string {
    const expDate = new Date(expiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);
    const diffMs = expDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Vencido hace ' + Math.abs(diffDays) + ' días';
    if (diffDays === 0) return 'Vence hoy';
    if (diffDays <= 3) return 'Vence en ' + diffDays + ' días';
    if (diffDays <= 7) return 'Vence en ' + diffDays + ' días';
    return 'Vence en ' + diffDays + ' días';
  }

  expiryClass(expiry: string): string {
    const expDate = new Date(expiry);
    const today = new Date();
    const diffMs = expDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'text-state-error';
    if (diffDays <= 3) return 'text-state-warn';
    if (diffDays <= 7) return 'text-secondary';
    return 'text-secondary';
  }

  changeTypeLabel(type: InventoryLog['change_type']): string {
    switch (type) {
      case 'consume':
        return 'Consumo';
      case 'restock':
        return 'Reposición';
      case 'adjust':
        return 'Ajuste';
      default:
        return 'Manual';
    }
  }

  async consumeOne(): Promise<void> {
    await this.adjustBy(-1);
  }

  openAdjustDialog(): void {
    this.adjustNewQuantity = this.product()?.quantity ?? 0;
    this.adjustDialogVisible.set(true);
  }

  resetAdjustForm(): void {
    this.adjustNewQuantity = null;
  }

  async onExpiryDateChange(value: Date | null): Promise<void> {
    const p = this.product();
    if (!p || this.saving()) return;
    const newStr = value ? value.toISOString().slice(0, 10) : null;
    const currentStr = p.expiry_date ?? null;
    if (newStr === currentStr) return;
    this.saving.set(true);
    const { error, data } = await this.productsApi.updateProduct(p.id, {
      expiryDate: newStr,
    });
    if (!error && data) {
      this.product.set(data);
      this.expiryDateEdit = data.expiry_date ? new Date(data.expiry_date) : null;
    }
    this.saving.set(false);
  }

  async submitAdjust(): Promise<void> {
    const p = this.product();
    if (!p || this.adjustNewQuantity === null || this.adjustNewQuantity === undefined) return;
    const delta = this.adjustNewQuantity - p.quantity;
    if (delta === 0) {
      this.adjustDialogVisible.set(false);
      this.resetAdjustForm();
      return;
    }
    await this.adjustBy(delta);
    this.adjustDialogVisible.set(false);
    this.resetAdjustForm();
  }

  async adjustBy(delta: number): Promise<void> {
    const p = this.product();
    const profileId = this.auth.currentUser()?.id;
    if (!p || !profileId || delta === 0) return;
    const before = p.quantity;
    const after = Math.max(0, before + delta);
    this.saving.set(true);
    const { error } = await this.productsApi.updateProduct(p.id, { quantity: after });
    if (error) {
      this.errorMessage.set('No se pudo actualizar el stock. Intenta nuevamente.');
      this.saving.set(false);
      return;
    }
    await this.logsApi.createLog({
      productId: p.id,
      profileId,
      quantityBefore: before,
      quantityAfter: after,
      changeType: delta < 0 ? 'consume' : 'adjust',
    });
    const refreshed = await this.productsApi.getProduct(p.id);
    if (!refreshed.error && refreshed.data) this.product.set(refreshed.data);
    const logsRes = await this.logsApi.getLogsByProduct(p.id);
    if (!logsRes.error) this.logs.set(logsRes.data);
    this.saving.set(false);
    this.errorMessage.set(null);
  }
}

