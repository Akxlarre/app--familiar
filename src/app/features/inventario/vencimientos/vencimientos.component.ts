import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { ProductService } from '@core/services/product.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import type { Product } from '@core/models/inventory.model';

@Component({
  selector: 'app-vencimientos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <div class="flex flex-col gap-6 font-body pb-16">
      <app-page-header
        title="Vence pronto"
        description="Productos que están por vencer para que se consuman a tiempo."
        parentHref="/app/inventario"
        parentLabel="Volver a despensa"
        [titleId]="'vencimientos-title'"
      />

      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1,2,3,4]; track i) {
            <div class="h-20 bg-subtle rounded-xl animate-pulse"></div>
          }
        </div>
      } @else if (items().length === 0) {
        <section class="rounded-xl border border-default bg-surface p-6 text-center">
          <p class="text-primary font-semibold mb-1">No hay productos por vencer</p>
          <p class="text-secondary text-sm">
            Ningún producto tiene fecha de vencimiento en los próximos 7 días.
          </p>
        </section>
      } @else {
        <section class="rounded-xl border border-default bg-surface p-2 shadow-sm">
          <ul class="divide-y divide-default">
            @for (p of items(); track p.id) {
              <li class="px-3 py-3 flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-primary truncate">
                    {{ p.name }}
                  </p>
                  <p class="text-xs text-secondary truncate">
                    {{ p.category_name || 'Sin categoría' }} · {{ locationLabel(p.location) }}
                  </p>
                  <p class="text-xs" [ngClass]="expiryClass(p.expiry_date!)">
                    {{ expiryLabel(p.expiry_date!) }}
                  </p>
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-sm tabular-nums">
                    {{ p.quantity }} {{ p.unit }}
                  </p>
                </div>
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
})
export class VencimientosComponent implements OnInit {
  private auth = inject(AuthService);
  private productsApi = inject(ProductService);

  loading = signal(true);
  items = signal<Product[]>([]);

  async ngOnInit(): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) {
      this.loading.set(false);
      return;
    }
    const { data } = await this.productsApi.getProducts({ householdId });
    const list = data.filter((p) => p.expiry_date);
    const today = new Date();
    const soon = list.filter((p) => {
      if (!p.expiry_date) return false;
      const exp = new Date(p.expiry_date);
      const diffMs = exp.getTime() - today.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    });
    soon.sort((a, b) => (a.expiry_date! < b.expiry_date! ? -1 : 1));
    this.items.set(soon);
    this.loading.set(false);
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

  expiryLabel(expiry: string): string {
    const expDate = new Date(expiry);
    const today = new Date();
    const diffMs = expDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `Vencido hace ${Math.abs(diffDays)} días`;
    if (diffDays === 0) return 'Vence hoy';
    if (diffDays === 1) return 'Vence en 1 día';
    return `Vence en ${diffDays} días`;
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
}

