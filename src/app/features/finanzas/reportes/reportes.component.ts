import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  viewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@core/services/auth.service';
import { TransactionService } from '@core/services/transaction.service';
import { FinanceSummaryService } from '@core/services/finance-summary.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { CategoryBreakdownCardComponent } from '@shared/components/category-breakdown-card/category-breakdown-card.component';
import type { CategoryBreakdownItem } from '@shared/components/category-breakdown-card/category-breakdown-card.types';
import type { Transaction } from '@core/models/finance.model';

@Component({
  selector: 'app-reportes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    CategoryBreakdownCardComponent,
  ],
  template: `
    <div #container class="flex flex-col gap-6 font-body">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold font-display text-primary">Reportes</h1>
          <p class="text-secondary text-lg">Análisis y tendencias</p>
        </div>
        <div class="flex items-center gap-2">
          <p-select
            [options]="periodOptions"
            [(ngModel)]="selectedPeriod"
            (ngModelChange)="loadData()"
            optionLabel="label"
            optionValue="value"
            styleClass="w-40"
            appendTo="body"
          />
        </div>
      </div>

      @if (loading()) {
        <div class="rounded-xl border border-default bg-surface p-8 shadow-sm animate-pulse">
          <div class="h-48 bg-subtle rounded mb-4"></div>
          <div class="h-32 bg-subtle rounded"></div>
        </div>
      } @else {
        <section class="rounded-xl border border-default bg-surface p-4 shadow-sm">
          <h2 class="text-xl font-semibold text-primary mb-4">Gastos por categoría</h2>
          @if (categoryBreakdownItems().length > 0) {
            <app-category-breakdown-card
              title=""
              [items]="categoryBreakdownItems()"
              totalLabel="Total gastos"
              variant="expense"
              size="3x2"
              [inGrid]="false"
              [showDetailLabel]="false"
            />
          } @else {
            <p class="text-muted text-sm">Sin datos para el período seleccionado.</p>
          }
        </section>

        <section class="rounded-xl border border-default bg-surface p-4 shadow-sm">
          <h2 class="text-xl font-semibold text-primary mb-4">Gastos por mes</h2>
          @if (monthBarData().length > 0) {
            <div class="space-y-3">
              @for (row of monthBarData(); track row.name) {
                <div class="flex flex-col gap-1">
                  <div class="flex justify-between text-sm">
                    <span class="font-medium text-primary">{{ row.name }}</span>
                    <span class="text-secondary tabular-nums">{{ row.value | number : '1.0-0' }} $</span>
                  </div>
                  <div
                    class="h-2 rounded-full bg-subtle overflow-hidden"
                    role="progressbar"
                    [attr.aria-valuenow]="monthBarPercent(row.value)"
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    <div
                      class="h-full rounded-full bg-primary transition-all"
                      [style.width.%]="monthBarPercent(row.value)"
                    ></div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="text-muted text-sm">Sin datos.</p>
          }
        </section>

        <section class="rounded-xl border border-default bg-surface p-4 shadow-sm">
          <h2 class="text-xl font-semibold text-primary mb-4">Top 10 gastos del período</h2>
          @if (topExpenses().length > 0) {
            <ul class="space-y-2">
              @for (tx of topExpenses(); track tx.id) {
                <li class="flex justify-between items-center py-2 border-b border-default last:border-0">
                  <div class="min-w-0">
                    <p class="font-medium truncate">{{ tx.category?.name ?? '—' }}</p>
                    <p class="text-sm text-secondary">{{ tx.date | date : 'd/M/yyyy' }} · {{ tx.note || '—' }}</p>
                  </div>
                  <span class="font-semibold tabular-nums text-state-error shrink-0 ml-2">
                    {{ tx.amount | number : '1.0-0' }} $
                  </span>
                </li>
              }
            </ul>
          } @else {
            <p class="text-muted text-sm">Sin gastos en el período.</p>
          }
        </section>

        @if (comparison(); as comp) {
          <section class="rounded-xl border border-default bg-surface p-4 shadow-sm">
            <h2 class="text-xl font-semibold text-primary mb-4">Comparativa con mes anterior</h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="p-3 rounded-lg bg-subtle/50">
                <p class="text-sm text-secondary">Ingresos</p>
                <p class="text-lg font-semibold" [class.text-state-success]="(comp.incomeVsLastMonth ?? 0) >= 0" [class.text-state-error]="(comp.incomeVsLastMonth ?? 0) < 0">
                  {{ comp.incomeVsLastMonth != null ? (comp.incomeVsLastMonth >= 0 ? '+' : '') + (comp.incomeVsLastMonth | number : '1.1-1') + '%' : '—' }}
                </p>
              </div>
              <div class="p-3 rounded-lg bg-subtle/50">
                <p class="text-sm text-secondary">Gastos</p>
                <p class="text-lg font-semibold" [class.text-state-error]="(comp.expensesVsLastMonth ?? 0) > 0" [class.text-state-success]="(comp.expensesVsLastMonth ?? 0) <= 0">
                  {{ comp.expensesVsLastMonth != null ? (comp.expensesVsLastMonth >= 0 ? '+' : '') + (comp.expensesVsLastMonth | number : '1.1-1') + '%' : '—' }}
                </p>
              </div>
            </div>
          </section>
        }
      }
    </div>
  `,
})
export class ReportesComponent implements OnInit, AfterViewInit {
  private auth = inject(AuthService);
  private transactionService = inject(TransactionService);
  private financeSummary = inject(FinanceSummaryService);
  private gsap = inject(GsapAnimationsService);

  containerRef = viewChild<ElementRef<HTMLElement>>('container');

  loading = signal(true);
  categoryData = signal<{ categoryId: string; categoryName: string; value: number }[]>([]);
  monthData = signal<{ name: string; value: number }[]>([]);
  allExpenses = signal<Transaction[]>([]);
  comparisonData = signal<{ incomeVsLastMonth?: number; expensesVsLastMonth?: number } | null>(null);

  selectedPeriod: '1' | '3' | '6' = '3';
  periodOptions = [
    { label: 'Este mes', value: '1' as const },
    { label: 'Últimos 3 meses', value: '3' as const },
    { label: 'Últimos 6 meses', value: '6' as const },
  ];

  categoryBreakdownItems = computed<CategoryBreakdownItem[]>(() =>
    this.categoryData().map((c) => ({ id: c.categoryId, label: c.categoryName, value: c.value }))
  );

  monthBarData = computed(() => this.monthData());

  topExpenses = computed(() =>
    [...this.allExpenses()]
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
  );

  comparison = computed(() => this.comparisonData());

  monthBarPercent(value: number): number {
    const data = this.monthData();
    const max = data.length ? Math.max(...data.map((r) => r.value)) : 1;
    return max > 0 ? Math.min(100, (value / max) * 100) : 0;
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    const el = this.containerRef()?.nativeElement;
    if (el) this.gsap.animatePageEnter(el);
  }

  private getDateRange(): { from: string; to: string } {
    const now = new Date();
    const months = this.selectedPeriod === '1' ? 1 : this.selectedPeriod === '3' ? 3 : 6;
    const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-01`,
      to: `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`,
    };
  }

  async loadData(): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) {
      this.loading.set(false);
      return;
    }
    const { from, to } = this.getDateRange();
    const months = this.selectedPeriod === '1' ? 1 : this.selectedPeriod === '3' ? 3 : 6;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [catRes, monthRes, txRes, summaryRes] = await Promise.all([
      this.transactionService.getExpensesAggregatedByCategory(householdId, from, to),
      this.transactionService.getExpensesAggregatedByMonth(householdId, months),
      this.transactionService.getTransactions({ householdId, fromDate: from, toDate: to }),
      this.financeSummary.getSummaryWithComparison(householdId, year, month),
    ]);

    this.loading.set(false);
    this.categoryData.set(catRes.data ?? []);
    this.monthData.set((monthRes.data ?? []).map((d) => ({ name: d.name, value: d.value })));
    this.allExpenses.set(txRes.data ?? []);
    if (summaryRes.data?.incomeVsLastMonth != null || summaryRes.data?.expensesVsLastMonth != null) {
      this.comparisonData.set({
        incomeVsLastMonth: summaryRes.data.incomeVsLastMonth,
        expensesVsLastMonth: summaryRes.data.expensesVsLastMonth,
      });
    } else {
      this.comparisonData.set(null);
    }
  }
}
