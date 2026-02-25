import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  AfterViewInit,
  viewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@core/services/auth.service';
import { ProductService } from '@core/services/product.service';
import { ProductCategoryService } from '@core/services/product-category.service';
import { ConfirmModalService } from '@core/services/confirm-modal.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { KpiCardComponent, type KpiData } from '@shared/components/kpi-card/kpi-card.component';
import type { Product, ProductCategory, ProductLocation, StockStatus } from '@core/models/inventory.model';
import { ProductFormDialogComponent } from './product-form-dialog.component';

type LocationFilter = ProductLocation | 'todas';
type StockFilter = StockStatus | 'todas';

@Component({
  selector: 'app-despensa-dashboard',
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
    PageHeaderComponent,
    KpiCardComponent,
    ProductFormDialogComponent,
  ],
  template: `
    <div #container class="flex flex-col gap-6 font-body pb-16">
      <app-page-header
        title="Despensa & alimentos"
        description="Stock en tiempo real, vencimientos y lista de reposición del hogar."
        [titleId]="'despensa-title'"
      >
        <ng-container appPageHeaderTrailing>
          <button
            pButton
            icon="pi pi-plus"
            label="Agregar producto"
            class="mr-2"
            type="button"
            (click)="openCreateProduct()"
          ></button>
          <button
            pButton
            icon="pi pi-camera"
            label="Escanear boleta"
            severity="secondary"
            [routerLink]="['/app/inventario/escanear']"
          ></button>
        </ng-container>
      </app-page-header>

      <!-- KPIs -->
      @if (loading()) {
        <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          @for (i of [1,2,3,4]; track i) {
            <div class="h-24 bg-subtle rounded-xl animate-pulse"></div>
          }
        </div>
      } @else {
        <section class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          @for (kpi of kpis(); track kpi.id) {
            <app-kpi-card [data]="kpi" size="1x1" />
          }
        </section>
      }

      <!-- Filtros -->
      <section
        class="rounded-xl border border-default bg-surface p-4 shadow-sm flex flex-wrap items-end gap-4"
        aria-label="Filtros de despensa"
      >
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-primary">Ubicación</label>
          <p-select
            [options]="locationOptions"
            [(ngModel)]="locationFilterValue"
            optionLabel="label"
            optionValue="value"
            (ngModelChange)="onFiltersChanged()"
            styleClass="min-w-40"
            appendTo="body"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-primary">Stock</label>
          <p-select
            [options]="stockOptions"
            [(ngModel)]="stockFilterValue"
            optionLabel="label"
            optionValue="value"
            (ngModelChange)="onFiltersChanged()"
            styleClass="min-w-40"
            appendTo="body"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-primary">Categoría</label>
          <p-select
            [options]="categoryOptions()"
            [(ngModel)]="categoryFilterValue"
            optionLabel="label"
            optionValue="value"
            (ngModelChange)="onFiltersChanged()"
            styleClass="min-w-40"
            appendTo="body"
          />
        </div>

        <div class="flex flex-col gap-1 flex-1 min-w-[10rem]">
          <label class="text-sm font-medium text-primary">Buscar</label>
          <input
            type="text"
            pInputText
            placeholder="Nombre o código de barras..."
            [(ngModel)]="searchValue"
            (ngModelChange)="onFiltersChanged()"
          />
        </div>

        <div class="ml-auto flex gap-2">
          <button
            type="button"
            pButton
            icon="pi pi-list"
            [text]="viewMode() !== 'lista'"
            [outlined]="viewMode() === 'lista'"
            (click)="viewMode.set('lista')"
            aria-label="Vista de lista"
          ></button>
          <button
            type="button"
            pButton
            icon="pi pi-th-large"
            [text]="viewMode() !== 'grid'"
            [outlined]="viewMode() === 'grid'"
            (click)="viewMode.set('grid')"
            aria-label="Vista de cuadrícula"
          ></button>
        </div>
      </section>

      <!-- Listado principal -->
      @if (loading()) {
        <div class="animate-pulse space-y-3">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="h-20 bg-subtle rounded-xl"></div>
          }
        </div>
      } @else {
        @if (filteredProducts().length === 0) {
          <div class="rounded-xl border border-dashed border-default bg-subtle/60 p-6 text-center">
            <p class="text-primary font-semibold mb-1">No hay productos en la despensa</p>
            <p class="text-secondary text-sm mb-4">
              Empieza agregando productos manualmente o escaneando tu próxima boleta.
            </p>
            <div class="flex flex-wrap justify-center gap-2">
              <button
                pButton
                icon="pi pi-plus"
                label="Agregar producto"
                class="mr-2"
                type="button"
                (click)="openCreateProduct()"
              ></button>
              <button
                pButton
                icon="pi pi-camera"
                label="Escanear boleta"
                severity="secondary"
                type="button"
                [routerLink]="['/app/inventario/escanear']"
              ></button>
            </div>
          </div>
        } @else {
          @if (viewMode() === 'lista') {
            <section class="rounded-xl border border-default bg-surface shadow-sm overflow-hidden">
              <div class="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-3 px-4 py-2 text-xs font-medium text-secondary border-b border-default">
                <span>Producto</span>
                <span>Cantidad</span>
                <span>Ubicación</span>
                <span class="text-right">Estado</span>
                <span></span>
              </div>
              <ul>
                @for (p of filteredProducts(); track p.id) {
                  <li
                    class="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-3 px-4 py-3 border-b border-default last:border-b-0 hover:bg-subtle/60 cursor-pointer items-center"
                    [routerLink]="['/app/inventario/producto', p.id]"
                  >
                    <div class="min-w-0">
                      <p class="font-semibold text-primary truncate">{{ p.name }}</p>
                      <p class="text-xs text-secondary truncate">
                        {{ p.category_name || 'Sin categoría' }}
                        @if (p.expiry_date) {
                          · Vence {{ p.expiry_date | date: 'd/M' }}
                        }
                      </p>
                    </div>
                    <div class="text-sm tabular-nums">
                      {{ p.quantity }} {{ p.unit }}
                      @if (p.stock_minimum > 0) {
                        <span class="text-xs text-secondary"> · mín. {{ p.stock_minimum }}</span>
                      }
                    </div>
                    <div class="text-sm">
                      <span class="inline-flex items-center rounded-full border border-default px-2 py-0.5 text-xs">
                        {{ locationLabel(p.location) }}
                      </span>
                    </div>
                    <div class="flex items-center justify-end">
                      <span
                        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        [ngClass]="{
                          'bg-state-success/15 text-state-success': p.stock_status === 'ok',
                          'bg-state-warn/15 text-state-warn': p.stock_status === 'low',
                          'bg-state-error/15 text-state-error': p.stock_status === 'out'
                        }"
                      >
                        {{ stockLabel(p.stock_status || 'ok') }}
                      </span>
                    </div>
                    <button
                      type="button"
                      pButton
                      icon="pi pi-trash"
                      severity="secondary"
                      [rounded]="true"
                      [text]="true"
                      class="shrink-0 opacity-60 hover:opacity-100 hover:text-state-error"
                      [attr.aria-label]="'Eliminar ' + p.name"
                      (click)="deleteProduct(p); $event.stopPropagation(); $event.preventDefault()"
                    ></button>
                  </li>
                }
              </ul>
            </section>
          } @else {
            <section class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              @for (p of filteredProducts(); track p.id) {
                <article
                  class="rounded-xl border border-default bg-surface p-4 shadow-sm flex flex-col gap-2 hover:border-primary/60 cursor-pointer transition relative"
                  [routerLink]="['/app/inventario/producto', p.id]"
                >
                  <button
                    type="button"
                    pButton
                    icon="pi pi-trash"
                    severity="secondary"
                    [rounded]="true"
                    [text]="true"
                    class="absolute top-2 right-2 shrink-0 opacity-60 hover:opacity-100 hover:text-state-error transition-opacity z-10"
                    [attr.aria-label]="'Eliminar ' + p.name"
                    (click)="deleteProduct(p); $event.stopPropagation(); $event.preventDefault()"
                  ></button>
                  <div class="flex justify-between gap-3">
                    <div class="min-w-0">
                      <h2 class="font-semibold text-primary leading-snug truncate">
                        {{ p.name }}
                      </h2>
                      <p class="text-xs text-secondary truncate">
                        {{ p.category_name || 'Sin categoría' }}
                      </p>
                    </div>
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0"
                      [ngClass]="{
                        'bg-state-success/15 text-state-success': p.stock_status === 'ok',
                        'bg-state-warn/15 text-state-warn': p.stock_status === 'low',
                        'bg-state-error/15 text-state-error': p.stock_status === 'out'
                      }"
                    >
                      {{ stockLabel(p.stock_status || 'ok') }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="tabular-nums">
                      {{ p.quantity }} {{ p.unit }}
                      @if (p.stock_minimum > 0) {
                        <span class="text-xs text-secondary"> · mín. {{ p.stock_minimum }}</span>
                      }
                    </span>
                    <span class="inline-flex items-center rounded-full border border-default px-2 py-0.5 text-xs">
                      {{ locationLabel(p.location) }}
                    </span>
                  </div>
                  @if (p.expiry_date) {
                    <p class="text-xs" [ngClass]="expiryClass(p.expiry_date)">
                      Vence {{ p.expiry_date | date: 'd/MM/yyyy' }}
                    </p>
                  }
                </article>
              }
            </section>
          }
        }
      }

      <p-dialog
        [(visible)]="formVisible"
        [header]="editingProduct() ? 'Editar producto' : 'Nuevo producto'"
        [modal]="true"
        appendTo="body"
        [style]="{ width: 'min(100%, 26rem)' }"
        [draggable]="false"
        [resizable]="false"
        (onHide)="closeForm()"
      >
        @if (formVisible) {
          <app-product-form-dialog
            [product]="editingProduct()"
            [categories]="categories()"
            (submit)="onFormSubmit()"
          />
        }
        <ng-template pTemplate="footer">
          <button
            pButton
            type="button"
            label="Cancelar"
            severity="secondary"
            (click)="formVisible = false"
          ></button>
          <button
            pButton
            type="button"
            label="Guardar"
            (click)="onFormSubmit()"
            [loading]="saving()"
          ></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
})
export class DespensaDashboardComponent implements OnInit, AfterViewInit {
  private auth = inject(AuthService);
  private productsApi = inject(ProductService);
  private categoriesApi = inject(ProductCategoryService);
  private gsap = inject(GsapAnimationsService);
  private confirmModal = inject(ConfirmModalService);

  containerRef = viewChild<ElementRef<HTMLElement>>('container');
  formRef = viewChild(ProductFormDialogComponent);

  loading = signal(true);
  products = signal<Product[]>([]);
  categories = signal<ProductCategory[]>([]);

  formVisible = false;
  editingProduct = signal<Product | null>(null);
  saving = signal(false);

  // Filtros controlados por ngModel en template
  locationFilterValue: LocationFilter = 'todas';
  stockFilterValue: StockFilter = 'todas';
  categoryFilterValue: string | null = null;
  searchValue = '';

  viewMode = signal<'lista' | 'grid'>('grid');

  readonly locationOptions: { label: string; value: LocationFilter }[] = [
    { label: 'Todas las ubicaciones', value: 'todas' },
    { label: 'Despensa', value: 'despensa' },
    { label: 'Refrigerador', value: 'refrigerador' },
    { label: 'Freezer', value: 'freezer' },
    { label: 'Otro', value: 'otro' },
  ];

  readonly stockOptions: { label: string; value: StockFilter }[] = [
    { label: 'Todo el stock', value: 'todas' },
    { label: 'OK', value: 'ok' },
    { label: 'Bajo', value: 'low' },
    { label: 'Agotado', value: 'out' },
  ];

  categoryOptions = computed(() => {
    const opts = this.categories().map((c) => ({ label: c.name, value: c.id }));
    return [{ label: 'Todas las categorías', value: null }, ...opts];
  });

  filteredProducts = computed(() => {
    const term = this.searchValue.trim().toLowerCase();
    return this.products().filter((p) => {
      if (this.locationFilterValue !== 'todas' && p.location !== this.locationFilterValue) {
        return false;
      }
      if (this.stockFilterValue !== 'todas' && (p.stock_status ?? 'ok') !== this.stockFilterValue) {
        return false;
      }
      if (this.categoryFilterValue && p.category_id !== this.categoryFilterValue) {
        return false;
      }
      if (term) {
        const haystack = `${p.name} ${p.name_normalized ?? ''} ${p.barcode ?? ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  });

  kpis = computed<KpiData[]>(() => {
    const items = this.products();
    const total = items.length;
    const low = items.filter((p) => p.stock_status === 'low').length;
    const out = items.filter((p) => p.stock_status === 'out').length;
    const expiringSoon = items.filter((p) => this.isExpiringSoon(p.expiry_date)).length;
    return [
      {
        id: 'total',
        label: 'Productos en despensa',
        value: total,
        suffix: '',
        icon: 'pi pi-box',
      },
      {
        id: 'low',
        label: 'Stock bajo',
        value: low,
        suffix: '',
        icon: 'pi pi-exclamation-triangle',
      },
      {
        id: 'out',
        label: 'Agotados',
        value: out,
        suffix: '',
        icon: 'pi pi-times-circle',
      },
      {
        id: 'expiring',
        label: 'Vence pronto',
        value: expiringSoon,
        suffix: '',
        icon: 'pi pi-clock',
      },
    ];
  });

  async ngOnInit(): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) {
      this.loading.set(false);
      return;
    }
    const [productsRes, categoriesRes] = await Promise.all([
      this.productsApi.getProducts({ householdId }),
      this.categoriesApi.getCategories(),
    ]);
    if (!productsRes.error) this.products.set(productsRes.data);
    if (!categoriesRes.error) this.categories.set(categoriesRes.data);
    this.loading.set(false);
  }

  ngAfterViewInit(): void {
    const el = this.containerRef()?.nativeElement;
    if (el) this.gsap.animatePageEnter(el);
  }

  onFiltersChanged(): void {
    // No-op: los filtros están conectados a computed(filteredProducts)
  }

  openCreateProduct(): void {
    this.editingProduct.set(null);
    this.formVisible = true;
  }

  closeForm(): void {
    this.formVisible = false;
    this.editingProduct.set(null);
  }

  async onFormSubmit(): Promise<void> {
    const form = this.formRef();
    if (!form || form.form.invalid) {
      form?.form.markAllAsTouched();
      return;
    }

    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) return;

    const v = form.getValue();
    this.saving.set(true);

    const existing = this.editingProduct();
    if (existing) {
      const res = await this.productsApi.updateProduct(existing.id, {
        name: v.name,
        categoryId: v.categoryId,
        quantity: v.quantity,
        unit: v.unit,
        stockMinimum: v.stockMinimum,
        location: v.location,
        expiryDate: v.expiryDate ? v.expiryDate.toISOString().slice(0, 10) : null,
        barcode: v.barcode,
      });
      if (!res.error && res.data) {
        this.replaceProductInList(res.data);
      }
    } else {
      const res = await this.productsApi.createProduct({
        householdId,
        categoryId: v.categoryId,
        name: v.name,
        quantity: v.quantity,
        unit: v.unit,
        stockMinimum: v.stockMinimum,
        location: v.location,
        expiryDate: v.expiryDate ? v.expiryDate.toISOString().slice(0, 10) : null,
        barcode: v.barcode ?? undefined,
      });
      if (!res.error && res.data) {
        this.products.update((list) => [res.data as Product, ...list]);
      }
    }

    this.saving.set(false);
    this.closeForm();
  }

  locationLabel(loc: ProductLocation): string {
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

  stockLabel(status: StockStatus): string {
    switch (status) {
      case 'low':
        return 'Bajo';
      case 'out':
        return 'Agotado';
      default:
        return 'OK';
    }
  }

  expiryClass(expiry: string | null): string {
    if (!expiry) return 'text-secondary';
    const expDate = new Date(expiry);
    const today = new Date();
    const diffMs = expDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'text-state-error';
    if (diffDays <= 3) return 'text-state-warn';
    if (diffDays <= 7) return 'text-secondary';
    return 'text-secondary';
  }

  private isExpiringSoon(expiry: string | null | undefined): boolean {
    if (!expiry) return false;
    const expDate = new Date(expiry);
    const today = new Date();
    const diffMs = expDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }

  async deleteProduct(product: Product): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Eliminar producto',
      message: `¿Eliminar "${product.name}" de la despensa? Se borrará del inventario y del historial.`,
      severity: 'danger',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;
    const res = await this.productsApi.deleteProduct(product.id);
    if (!res.error) {
      this.products.update((list) => list.filter((p) => p.id !== product.id));
    }
  }

  private replaceProductInList(updated: Product): void {
    this.products.update((list) =>
      list.map((p) => (p.id === updated.id ? updated : p)),
    );
  }
}

