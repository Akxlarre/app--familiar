import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@core/services/auth.service';
import { ProductService } from '@core/services/product.service';
import { PriceHistoryService } from '@core/services/price-history.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import type { Product, PriceRecord } from '@core/models/inventory.model';

@Component({
  selector: 'app-historial-precios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SelectModule, ButtonModule, PageHeaderComponent],
  template: `
    <div class="flex flex-col gap-6 font-body pb-16">
      <app-page-header
        title="Historial de precios"
        description="Sigue cómo cambian los precios de tus productos a lo largo del tiempo."
        parentHref="/app/inventario"
        parentLabel="Volver a despensa"
        [titleId]="'precios-title'"
      />

      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1,2,3]; track i) {
            <div class="h-20 bg-subtle rounded-xl animate-pulse"></div>
          }
        </div>
      } @else {
        <section class="rounded-xl border border-default bg-surface p-4 shadow-sm flex flex-wrap items-end gap-4">
          <div class="flex flex-col gap-1 min-w-[14rem]">
            <label class="text-sm font-medium text-primary">Producto</label>
            <p-select
              [options]="productOptions()"
              [(ngModel)]="selectedProductId"
              optionLabel="label"
              optionValue="value"
              placeholder="Selecciona un producto"
              styleClass="w-full"
              appendTo="body"
              (ngModelChange)="onProductChange()"
            />
          </div>
          <div class="flex-1 text-sm text-secondary">
            @if (selectedProduct()) {
              <p>
                Último precio:
                <span class="font-semibold text-primary">
                  {{ lastPriceDisplay() }}
                </span>
                @if (priceChangeLabel()) {
                  <span [ngClass]="priceChangeClass()">
                    · {{ priceChangeLabel() }}
                  </span>
                }
              </p>
            } @else {
              <p>Elige un producto para ver su evolución de precios.</p>
            }
          </div>
        </section>

        @if (selectedProduct() && history().length > 0) {
          <section class="rounded-xl border border-default bg-surface p-4 shadow-sm flex flex-col gap-4">
            <h2 class="text-lg font-semibold text-primary">
              Historial de {{ selectedProduct()!.name }}
            </h2>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="text-xs text-secondary border-b border-default">
                  <tr>
                    <th class="py-2 pr-4 text-left font-medium">Fecha</th>
                    <th class="py-2 pr-4 text-left font-medium">Supermercado</th>
                    <th class="py-2 pr-4 text-right font-medium">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of history(); track r.id) {
                    <tr class="border-b border-default last:border-b-0">
                      <td class="py-2 pr-4">
                        {{ r.purchase_date | date: 'd/MM/yyyy' }}
                      </td>
                      <td class="py-2 pr-4">
                        {{ r.store_name || '—' }}
                      </td>
                      <td class="py-2 pr-4 text-right tabular-nums">
                        {{ formatPrice(r) }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <section class="mt-2">
              <h3 class="text-sm font-semibold text-primary mb-2">Comparación por supermercado</h3>
              @if (perStore().length === 0) {
                <p class="text-xs text-secondary">Aún no hay suficientes registros para comparar.</p>
              } @else {
                <div class="flex flex-wrap gap-3 text-xs">
                  @for (s of perStore(); track s.store) {
                    <div class="rounded-lg border border-default bg-subtle px-3 py-2">
                      <p class="font-medium text-primary">{{ s.store || '—' }}</p>
                      <p class="tabular-nums">
                        Promedio: {{ s.avg | number : '1.0-0' }} $
                      </p>
                      <p class="text-secondary">
                        Min: {{ s.min | number : '1.0-0' }} $ · Max: {{ s.max | number : '1.0-0' }} $
                      </p>
                    </div>
                  }
                </div>
              }
            </section>
          </section>
        }
      }
    </div>
  `,
})
export class HistorialPreciosComponent implements OnInit {
  private auth = inject(AuthService);
  private productsApi = inject(ProductService);
  private priceApi = inject(PriceHistoryService);

  loading = signal(true);
  products = signal<Product[]>([]);
  history = signal<PriceRecord[]>([]);
  selectedProductId: string | null = null;

  productOptions = computed(() =>
    this.products()
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({ label: p.name, value: p.id })),
  );

  selectedProduct = computed(() =>
    this.products().find((p) => p.id === this.selectedProductId) ?? null,
  );

  lastPrice = computed(() => (this.history()[0]?.price_clp ?? 0));

  lastPriceDisplay = computed(() => {
    const r = this.history()[0];
    if (!r) return '—';
    return this.formatPrice(r);
  });

  formatPrice(r: PriceRecord): string {
    const fmt = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 0 });
    if (r.units_in_pack != null && r.units_in_pack > 1) {
      const perUnit = Math.round(r.price_clp / r.units_in_pack);
      return `${fmt(r.price_clp)} $/pack (${r.units_in_pack} un) · ${fmt(perUnit)} $/un`;
    }
    return `${fmt(r.price_clp)} $`;
  }

  priceChangeLabel = computed(() => {
    if (this.history().length < 2) return '';
    const last = this.history()[0].price_clp;
    const prev = this.history()[1].price_clp;
    if (!prev) return '';
    const diff = last - prev;
    const pct = (diff / prev) * 100;
    if (Math.abs(pct) < 1) return '';
    const sign = diff > 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}% vs compra anterior`;
  });

  priceChangeClass = computed(() => {
    const label = this.priceChangeLabel();
    if (!label) return 'text-secondary';
    return label.startsWith('+') ? 'text-state-error' : 'text-state-success';
  });

  perStore = computed(() => {
    const byStore = new Map<string | null, number[]>();
    for (const r of this.history()) {
      const key = r.store_name ?? null;
      const list = byStore.get(key) ?? [];
      list.push(r.price_clp);
      byStore.set(key, list);
    }
    return Array.from(byStore.entries()).map(([store, list]) => {
      const sum = list.reduce((s, v) => s + v, 0);
      const avg = sum / list.length;
      const min = Math.min(...list);
      const max = Math.max(...list);
      return { store, avg, min, max };
    });
  });

  async ngOnInit(): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) {
      this.loading.set(false);
      return;
    }
    const { data: products } = await this.productsApi.getProducts({ householdId });
    this.products.set(products);
    this.loading.set(false);
  }

  async onProductChange(): Promise<void> {
    const id = this.selectedProductId;
    if (!id) {
      this.history.set([]);
      return;
    }
    const res = await this.priceApi.getHistory(id);
    if (!res.error) this.history.set(res.data);
  }
}

