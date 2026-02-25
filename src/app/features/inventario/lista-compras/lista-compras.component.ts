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
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '@core/services/auth.service';
import { ShoppingListService } from '@core/services/shopping-list.service';
import { ProductService } from '@core/services/product.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import type { ShoppingList, ShoppingListItem, Product } from '@core/models/inventory.model';

@Component({
  selector: 'app-lista-compras',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, InputTextModule, PageHeaderComponent],
  template: `
    <div class="flex flex-col gap-6 font-body pb-20">
      <app-page-header
        title="Lista de compras"
        description="Tu lista viva del supermercado, siempre sincronizada con el inventario."
        parentHref="/app/inventario"
        parentLabel="Volver a despensa"
        [titleId]="'lista-title'"
      />

      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1,2,3,4]; track i) {
            <div class="h-16 bg-subtle rounded-xl animate-pulse"></div>
          }
        </div>
      } @else {
        <section class="rounded-xl border border-default bg-surface p-4 shadow-sm flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-sm text-secondary">
                {{ list()?.name || 'Lista de compras' }}
              </p>
              <p class="text-xs text-secondary">
                {{ openItems().length }} ítems pendientes
                @if (estimatedTotal() > 0) {
                  · Estimado: {{ estimatedTotal() | number : '1.0-0' }} $
                }
              </p>
            </div>
            <button
              pButton
              type="button"
              icon="pi pi-sync"
              label="Generar desde despensa"
              severity="secondary"
              (click)="generateFromInventory()"
              [loading]="generating()"
            ></button>
          </div>

          <!-- Campo para agregar manualmente -->
          <form class="flex flex-wrap items-center gap-2" (ngSubmit)="addManualItem()">
            <input
              type="text"
              pInputText
              class="flex-1 min-w-[10rem]"
              placeholder="Agregar ítem manual (ej: jabón de manos)"
              [(ngModel)]="newItemName"
              name="newItemName"
            />
            <button
              pButton
              type="submit"
              icon="pi pi-plus"
              label="Agregar"
              [disabled]="!newItemName.trim()"
            ></button>
          </form>
        </section>

        <section class="rounded-xl border border-default bg-surface p-2 shadow-sm">
          @if (items().length === 0) {
            <p class="text-sm text-secondary text-center py-6">
              Aún no hay ítems en la lista. Genera sugerencias desde la despensa o agrega uno manualmente.
            </p>
          } @else {
            <ul class="divide-y divide-default">
              @for (item of items(); track item.id) {
                <li class="flex items-center gap-2 group">
                  <button
                    type="button"
                    class="flex-1 min-w-0 text-left flex items-center justify-between gap-3 px-3 py-3 rounded-md hover:bg-subtle/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    (click)="toggleItem(item)"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <span
                        class="inline-flex items-center justify-center w-5 h-5 rounded-full border border-default shrink-0"
                        [ngClass]="{
                          'bg-primary text-primary-contrast border-primary': item.is_checked,
                          'bg-surface': !item.is_checked
                        }"
                        aria-hidden="true"
                      >
                        @if (item.is_checked) {
                          <i class="pi pi-check text-[10px]"></i>
                        }
                      </span>
                      <div class="min-w-0">
                        <p
                          class="text-sm font-medium truncate"
                          [ngClass]="{ 'line-through text-secondary': item.is_checked }"
                        >
                          {{ item.name }}
                        </p>
                        <p class="text-xs text-secondary truncate">
                          {{ quantityLabel(item) }}
                          @if (item.source !== 'manual') {
                            · {{ sourceLabel(item.source) }}
                          }
                        </p>
                      </div>
                    </div>
                    <div class="text-right shrink-0">
                      @if (item.price_at_purchase != null) {
                        <p class="text-sm font-semibold tabular-nums">
                          {{ item.price_at_purchase | number : '1.0-0' }} $
                        </p>
                      }
                      <p class="text-[11px] text-secondary">
                        Tap para {{ item.is_checked ? 'desmarcar' : 'marcar' }}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    pButton
                    icon="pi pi-trash"
                    severity="secondary"
                    [rounded]="true"
                    [text]="true"
                    class="shrink-0 opacity-60 hover:opacity-100 hover:text-state-error"
                    [attr.aria-label]="'Eliminar ' + item.name"
                    (click)="deleteItem(item); $event.stopPropagation()"
                  ></button>
                </li>
              }
            </ul>
          }
        </section>

        <div class="flex justify-between items-center gap-3 text-xs text-secondary px-1">
          <span>
            Tip: marca ítems mientras caminas por el pasillo; todo se sincroniza en tiempo real con tu hogar.
          </span>
          <button
            pButton
            type="button"
            icon="pi pi-receipt"
            label="Cerrar compra (escanear boleta)"
            size="small"
            [routerLink]="['/app/inventario/escanear']"
          ></button>
        </div>
      }
    </div>
  `,
})
export class ListaComprasComponent implements OnInit {
  private auth = inject(AuthService);
  private shoppingApi = inject(ShoppingListService);
  private productsApi = inject(ProductService);

  loading = signal(true);
  generating = signal(false);
  list = signal<ShoppingList | null>(null);
  items = signal<ShoppingListItem[]>([]);

  newItemName = '';

  openItems = computed(() => this.items().filter((i) => !i.is_checked));

  estimatedTotal = computed(() =>
    this.openItems().reduce((sum, item) => sum + (item.price_at_purchase ?? 0), 0),
  );

  async ngOnInit(): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) {
      this.loading.set(false);
      return;
    }
    const listRes = await this.shoppingApi.ensureActiveList(householdId);
    if (!listRes.error && listRes.data) {
      this.list.set(listRes.data);
      const itemsRes = await this.shoppingApi.getItems(listRes.data.id);
      if (!itemsRes.error) this.items.set(itemsRes.data);
    }
    this.loading.set(false);
  }

  quantityLabel(item: ShoppingListItem): string {
    return `${item.quantity} ${item.unit}`;
  }

  sourceLabel(source: ShoppingListItem['source']): string {
    switch (source) {
      case 'low_stock':
        return 'Sugerido por stock bajo';
      case 'out_of_stock':
        return 'Agotado en despensa';
      case 'recurring':
        return 'Recurrente';
      default:
        return 'Manual';
    }
  }

  async addManualItem(): Promise<void> {
    const name = this.newItemName.trim();
    if (!name || !this.list()) return;
    const res = await this.shoppingApi.addItem({
      listId: this.list()!.id,
      name,
      quantity: 1,
      unit: 'unidad',
      source: 'manual',
    });
    if (!res.error && res.data) {
      this.items.update((arr) => [...arr, res.data!]);
      this.newItemName = '';
    }
  }

  async deleteItem(item: ShoppingListItem): Promise<void> {
    const res = await this.shoppingApi.deleteItem(item.id);
    if (!res.error) {
      this.items.update((arr) => arr.filter((it) => it.id !== item.id));
    }
  }

  async toggleItem(item: ShoppingListItem): Promise<void> {
    if (!this.list()) return;
    const res = await this.shoppingApi.toggleItemChecked(
      item.id,
      !item.is_checked,
      this.auth.currentUser()?.id ?? null,
    );
    if (!res.error && res.data) {
      this.items.update((arr) => arr.map((it) => (it.id === item.id ? res.data! : it)));
    }
  }

  async generateFromInventory(): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    const list = this.list();
    if (!householdId || !list) return;

    this.generating.set(true);
    const { data: products } = await this.productsApi.getProducts({ householdId });

    const low: Product[] = products.filter(
      (p) => p.stock_status === 'low' && p.stock_minimum > 0,
    );
    const out: Product[] = products.filter((p) => p.stock_status === 'out');

    const existing = this.items();

    for (const p of [...low, ...out]) {
      const already = existing.find((i) => i.product_id === p.id || i.name === p.name);
      if (already) continue;
      const source: ShoppingListItem['source'] =
        p.stock_status === 'out' ? 'out_of_stock' : 'low_stock';
      const quantityNeeded =
        p.stock_status === 'out'
          ? Math.max(1, p.stock_minimum || 1)
          : Math.max(1, (p.stock_minimum || 1) - (p.quantity || 0));

      const res = await this.shoppingApi.addItem({
        listId: list.id,
        productId: p.id,
        name: p.name,
        quantity: quantityNeeded,
        unit: p.unit,
        source,
      });
      if (!res.error && res.data) {
        this.items.update((arr) => [...arr, res.data!]);
      }
    }
    this.generating.set(false);
  }
}

