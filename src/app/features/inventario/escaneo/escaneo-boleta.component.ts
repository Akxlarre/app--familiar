import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { AuthService } from '@core/services/auth.service';
import { ReceiptService } from '@core/services/receipt.service';
import { ReceiptScannerService } from '@core/services/receipt-scanner.service';
import {
  ProductService,
  type UpdateProductInput,
} from '@core/services/product.service';
import { ProductAliasService } from '@core/services/product-alias.service';
import { PriceHistoryService } from '@core/services/price-history.service';
import { InventoryLogService } from '@core/services/inventory-log.service';
import { SupabaseService } from '@core/services/supabase.service';
import { ProductCategoryService } from '@core/services/product-category.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import type {
  ReceiptScanResult,
  ReceiptScanItem,
  ProductLocation,
  ProductCategory,
} from '@core/models/inventory.model';

type Step = 'capture' | 'processing' | 'review' | 'done';

interface EditableScanItem extends ReceiptScanItem {
  id: string;
  expiryDate: Date | null;
}

@Component({
  selector: 'app-escaneo-boleta',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    PageHeaderComponent,
  ],
  template: `
    <div class="flex flex-col gap-6 font-body pb-16">
      <app-page-header
        title="Escanear boleta"
        description="Fotografía la boleta del supermercado y actualiza tu inventario en segundos."
        parentHref="/app/inventario"
        parentLabel="Volver a despensa"
        [titleId]="'escaneo-title'"
      />

      <!-- Paso 1: captura -->
      @if (step() === 'capture') {
        <section class="rounded-xl border border-dashed border-default bg-subtle/40 p-6 text-center">
          <p class="text-primary font-semibold mb-2">Sube una foto de tu boleta</p>
          <p class="text-secondary text-sm mb-4">
            Idealmente tomada de frente, con buena luz. Puedes usar la cámara del teléfono o elegir una foto de tu galería.
          </p>
          <div class="flex flex-col items-center gap-3">
            <input
              #fileInput
              type="file"
              accept="image/*"
              class="hidden"
              (change)="onFileSelected($event)"
            />
            <button
              pButton
              type="button"
              icon="pi pi-camera"
              label="Tomar foto / elegir imagen"
              (click)="fileInput.click()"
              [loading]="uploading()"
            ></button>
            @if (previewUrl()) {
              <img
                [src]="previewUrl()"
                alt="Boleta seleccionada"
                class="mt-4 max-h-64 rounded-lg border border-default object-contain"
              />
            }
          </div>
        </section>
      }

      <!-- Paso 2: procesando -->
      @if (step() === 'processing') {
        <section class="rounded-xl border border-default bg-surface p-6 flex flex-col items-center gap-3">
          <span class="pi pi-spin pi-spinner text-3xl text-primary"></span>
          <p class="text-primary font-semibold">Leyendo boleta...</p>
          <p class="text-secondary text-sm text-center max-w-md">
            Estamos usando Gemini 1.5 para extraer todos los productos, cantidades y precios de tu boleta.
          </p>
        </section>
      }

      <!-- Paso 3: revisión -->
      @if (step() === 'review' && scanResult()) {
        <section class="flex flex-col gap-4">
          <div class="rounded-xl border border-default bg-surface p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-sm text-secondary">
                {{ scanResult()?.store_name || 'Comercio no identificado' }}
              </p>
              <p class="text-xs text-secondary">
                {{ scanResult()?.date || 'Fecha no detectada' }}
                @if (scanResult()?.total != null) {
                  · Total aprox. {{ scanResult()?.total | number : '1.0-0' }} $
                }
              </p>
            </div>
            <button
              pButton
              type="button"
              icon="pi pi-refresh"
              label="Volver a cargar imagen"
              severity="secondary"
              (click)="reset()"
            ></button>
          </div>

          <section class="rounded-xl border border-default bg-surface p-4 shadow-sm">
            <h2 class="text-lg font-semibold text-primary mb-3">Revisa los productos detectados</h2>
            <p class="text-sm text-secondary mb-4">
              Ajusta cantidades, nombres, ubicación o fecha de vencimiento. Solo se agregarán al inventario los productos marcados.
            </p>

            <div class="grid grid-cols-[minmax(0,1.8fr)_minmax(0,0.6fr)_minmax(0,0.5fr)_minmax(0,0.65fr)_minmax(0,1fr)_auto] gap-3 px-2 py-2 text-xs font-medium text-secondary border-b border-default">
              <span>Producto</span>
              <span>Cantidad</span>
              <span>Precio</span>
              <span>Ubicación</span>
              <span>Vence</span>
              <span class="text-right">Agregar</span>
            </div>

            <div class="max-h-[24rem] overflow-y-auto">
              @for (item of editableItems(); track item.id) {
                <div class="grid grid-cols-[minmax(0,1.8fr)_minmax(0,0.6fr)_minmax(0,0.5fr)_minmax(0,0.65fr)_minmax(0,1fr)_auto] gap-3 px-2 py-2 border-b border-default last:border-b-0 items-center">
                  <div class="flex flex-col gap-1 min-w-0">
                    <input
                      type="text"
                      pInputText
                      class="w-full text-sm"
                      [(ngModel)]="item.normalized_name"
                      [ngModelOptions]="{ standalone: true }"
                      placeholder="Nombre del producto"
                    />
                    <p class="text-[11px] text-secondary truncate">
                      Raw: {{ item.raw_name }}
                    </p>
                    @if (item.is_pack && item.units_in_pack) {
                      <span class="text-[10px] text-primary font-medium">
                        Pack · {{ item.units_in_pack }} un
                      </span>
                    }
                  </div>
                  <div class="flex items-center gap-1">
                    <input
                      type="number"
                      class="w-16 border border-default rounded-md px-2 py-1 text-xs"
                      min="0"
                      step="0.1"
                      [(ngModel)]="item.quantity"
                      [ngModelOptions]="{ standalone: true }"
                    />
                    <span class="text-xs text-secondary">{{ item.unit }}</span>
                  </div>
                  <div class="text-xs tabular-nums">
                    @if (item.unit_price != null || item.total_price != null) {
                      @if (item.is_pack && item.units_in_pack) {
                        <span>{{ (item.unit_price ?? item.total_price ?? 0) | number : '1.0-0' }} $/pack</span>
                        @if (item.units_in_pack > 1) {
                          <span class="text-secondary block">
                            {{ ((item.unit_price ?? item.total_price ?? 0) / item.units_in_pack) | number : '1.0-0' }} $/un
                          </span>
                        }
                      } @else {
                        @if (item.quantity > 1 && item.total_price != null) {
                          <span>{{ (item.unit_price ?? item.total_price / item.quantity) | number : '1.0-0' }} $/un</span>
                          <span class="text-secondary block">{{ item.total_price | number : '1.0-0' }} $ total</span>
                        } @else {
                          <span>{{ (item.unit_price ?? item.total_price ?? 0) | number : '1.0-0' }} $</span>
                        }
                      }
                    } @else {
                      <span class="text-secondary">—</span>
                    }
                  </div>
                  <div>
                    <p-select
                      [options]="locationOptions"
                      [(ngModel)]="item.location"
                      [ngModelOptions]="{ standalone: true }"
                      optionLabel="label"
                      optionValue="value"
                      styleClass="w-full text-xs"
                      appendTo="body"
                    />
                  </div>
                  <div>
                    <p-datePicker
                      [(ngModel)]="item.expiryDate"
                      [ngModelOptions]="{ standalone: true }"
                      dateFormat="dd/mm/yy"
                      [iconDisplay]="'input'"
                      [showIcon]="true"
                      styleClass="w-full text-xs"
                      inputStyleClass="w-full text-xs"
                      appendTo="body"
                      placeholder="Opcional"
                    />
                  </div>
                  <div class="flex justify-end">
                    <input
                      type="checkbox"
                      class="w-4 h-4 accent-primary"
                      [(ngModel)]="item.add_to_inventory"
                      [ngModelOptions]="{ standalone: true }"
                      aria-label="Agregar al inventario"
                    />
                  </div>
                </div>
              }
            </div>

            <div class="flex justify-end mt-4 gap-2">
              <button
                pButton
                type="button"
                label="Cancelar"
                severity="secondary"
                (click)="reset()"
              ></button>
              <button
                pButton
                type="button"
                icon="pi pi-check"
                label="Confirmar todo"
                (click)="confirmAll()"
                [loading]="confirming()"
              ></button>
            </div>
          </section>
        </section>
      }

      <!-- Paso 4: resumen -->
      @if (step() === 'done') {
        <section class="rounded-xl border border-default bg-surface p-6 flex flex-col items-center gap-3 text-center">
          <span class="pi pi-check-circle text-3xl text-state-success"></span>
          <p class="text-lg font-semibold text-primary">
            Inventario actualizado
          </p>
          <p class="text-sm text-secondary">
            {{ summaryMessage() }}
          </p>
          <div class="flex flex-wrap gap-2 mt-2">
            <button
              pButton
              type="button"
              label="Volver a despensa"
              icon="pi pi-box"
              [routerLink]="['/app/inventario']"
            ></button>
            <button
              pButton
              type="button"
              label="Escanear otra boleta"
              icon="pi pi-camera"
              severity="secondary"
              (click)="reset()"
            ></button>
          </div>
        </section>
      }
    </div>
  `,
})
export class EscaneoBoletaComponent {
  private auth = inject(AuthService);
  private receiptService = inject(ReceiptService);
  private scanner = inject(ReceiptScannerService);
  private productsApi = inject(ProductService);
  private aliasApi = inject(ProductAliasService);
  private priceHistoryApi = inject(PriceHistoryService);
  private logsApi = inject(InventoryLogService);
  private categoriesApi = inject(ProductCategoryService);
  private supabase = inject(SupabaseService);

  step = signal<Step>('capture');
  uploading = signal(false);
  confirming = signal(false);
  previewUrl = signal<string | null>(null);
  scanResult = signal<ReceiptScanResult | null>(null);
  editableItems = signal<EditableScanItem[]>([]);
  updatedCount = signal(0);
  newCount = signal(0);

  receiptId: string | null = null;
  storagePath: string | null = null;
  categories: ProductCategory[] = [];

  readonly locationOptions: { label: string; value: ProductLocation }[] = [
    { label: 'Despensa', value: 'despensa' },
    { label: 'Refrigerador', value: 'refrigerador' },
    { label: 'Freezer', value: 'freezer' },
    { label: 'Otro', value: 'otro' },
  ];

  summaryMessage = computed(() => {
    const u = this.updatedCount();
    const n = this.newCount();
    const parts: string[] = [];
    if (u > 0) parts.push(`${u} productos actualizados`);
    if (n > 0) parts.push(`${n} productos nuevos`);
    return parts.length ? parts.join(' · ') : 'No se realizaron cambios en el inventario.';
  });

  constructor() {
    // Cargar categorías para poder asignar una por defecto a productos nuevos
    void this.loadCategories();
  }

  private async loadCategories(): Promise<void> {
    const { data } = await this.categoriesApi.getCategories();
    this.categories = data;
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) return;

    this.previewUrl.set(URL.createObjectURL(file));
    this.uploading.set(true);
    this.step.set('processing');

    const { path, error } = await this.receiptService.uploadReceiptImage(householdId, file);
    this.uploading.set(false);
    if (error || !path) {
      this.step.set('capture');
      return;
    }
    this.storagePath = path;

    // Crear registro de receipt básico
    const createRes = await this.receiptService.createReceipt({
      household_id: householdId,
      storage_path: path,
    });
    if (!createRes.error && createRes.data) {
      this.receiptId = createRes.data.id;
    }

    const scanRes = await this.scanner.scanReceipt(path, householdId);
    if (scanRes.error || !scanRes.data) {
      this.step.set('capture');
      return;
    }

    this.scanResult.set(scanRes.data);
    this.editableItems.set(
      (scanRes.data.items ?? []).map((item: ReceiptScanItem, index: number) => ({
        ...item,
        id: `${index}-${item.raw_name}-${item.quantity}`,
        normalized_name: item.raw_name,
        quantity: item.quantity || 1,
        unit: item.unit || 'unidad',
        unit_price: item.unit_price ?? null,
        total_price: item.total_price ?? null,
        is_pack: item.is_pack ?? false,
        units_in_pack: item.units_in_pack ?? null,
        matched_product_id: null,
        location: (item.location as ProductLocation) || 'despensa',
        add_to_inventory: true,
        expiryDate: null,
      })),
    );
    this.step.set('review');
  }

  async confirmAll(): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    const profileId = this.auth.currentUser()?.id;
    if (!householdId || !profileId || !this.storagePath) return;

    const items = this.editableItems();
    if (!items.length) {
      this.step.set('done');
      return;
    }

    this.confirming.set(true);
    let updated = 0;
    let created = 0;

    // Asegurarse de tener un receiptId
    if (!this.receiptId) {
      const createRes = await this.receiptService.createReceipt({
        household_id: householdId,
        storage_path: this.storagePath,
        merchant: this.scanResult()?.store_name ?? null,
        raw_ocr_data: this.scanResult() as unknown as Record<string, unknown>,
      });
      if (!createRes.error && createRes.data) this.receiptId = createRes.data.id;
    } else {
      // Actualizar merchant / raw_ocr_data si ya existía
      await this.supabase.client
        .from('receipts')
        .update({
          merchant: this.scanResult()?.store_name ?? null,
          raw_ocr_data: this.scanResult() as unknown as Record<string, unknown>,
          status: 'processed',
        })
        .eq('id', this.receiptId);
    }

    for (const item of items) {
      const normalizedName = (item.normalized_name || item.raw_name).trim();

      // Crear línea en receipt_items
      if (this.receiptId) {
        await this.supabase.client.from('receipt_items').insert({
          receipt_id: this.receiptId,
          product_name: item.raw_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        });
      }

      if (!item.add_to_inventory) continue;

      // Buscar alias existente
      const aliasRes = await this.aliasApi.findAlias(householdId, item.raw_name);

      let productId: string | null = aliasRes.data?.product_id ?? null;

      if (!productId) {
        // Buscar producto por nombre normalizado
        const { data: existingList } = await this.productsApi.getProducts({
          householdId,
          search: normalizedName,
        });
        const existing = existingList.find(
          (p) =>
            p.name_normalized?.toLowerCase() === normalizedName.toLowerCase() ||
            p.name.toLowerCase() === normalizedName.toLowerCase(),
        );
        if (existing) {
          productId = existing.id;
        }
      }

      let quantityBefore = 0;
      let quantityAfter = 0;

      if (productId) {
        // Actualizar producto existente
        const current = await this.productsApi.getProduct(productId);
        const product = current.data;
        if (product) {
          quantityBefore = product.quantity;
          quantityAfter = product.quantity + (item.quantity || 1);
          const updatePayload: UpdateProductInput = {
            quantity: quantityAfter,
            nameNormalized: normalizedName,
          };
          if (item.expiryDate instanceof Date) {
            updatePayload.expiryDate = item.expiryDate.toISOString().slice(0, 10);
          }
          await this.productsApi.updateProduct(product.id, updatePayload);
          updated++;
        }
      } else {
        // Crear producto nuevo
        const defaultCategoryId = this.categories[0]?.id ?? null;
        const expiryStr =
          item.expiryDate instanceof Date
            ? item.expiryDate.toISOString().slice(0, 10)
            : null;
        const createRes = await this.productsApi.createProduct({
          householdId,
          categoryId: defaultCategoryId ?? '',
          name: normalizedName,
          nameNormalized: normalizedName,
          quantity: item.quantity || 1,
          unit: item.unit || 'unidad',
          stockMinimum: 0,
          location: item.location,
          expiryDate: expiryStr,
          barcode: null,
        });
        if (!createRes.error && createRes.data) {
          productId = createRes.data.id;
          quantityBefore = 0;
          quantityAfter = createRes.data.quantity;
          created++;
        }
      }

      if (productId != null) {
        // Registrar alias si no existía
        if (!aliasRes.data) {
          await this.aliasApi.createAlias(householdId, productId, item.raw_name);
        }

        // Historial de inventario
        await this.logsApi.createLog({
          productId,
          profileId,
          quantityBefore,
          quantityAfter,
          changeType: 'restock',
        });

        // Historial de precios (pack: precio del pack; unit: precio por unidad)
        if (item.unit_price != null || item.total_price != null) {
          const price =
            item.unit_price ??
            (item.total_price != null && item.quantity
              ? item.total_price / item.quantity
              : null);
          if (price != null) {
            await this.priceHistoryApi.createRecord({
              productId,
              priceClp: price,
              purchaseDate: this.scanResult()?.date ?? null,
              storeName: this.scanResult()?.store_name ?? null,
              receiptId: this.receiptId,
              unitsInPack: item.is_pack ? item.units_in_pack ?? null : null,
            });
          }
        }
      }
    }

    this.updatedCount.set(updated);
    this.newCount.set(created);
    this.confirming.set(false);
    this.step.set('done');
  }

  reset(): void {
    this.step.set('capture');
    this.previewUrl.set(null);
    this.scanResult.set(null);
    this.editableItems.set([]);
    this.updatedCount.set(0);
    this.newCount.set(0);
    this.receiptId = null;
    this.storagePath = null;
  }
}

