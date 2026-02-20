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
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@core/services/auth.service';
import { FinanceSummaryService } from '@core/services/finance-summary.service';
import { TransactionService } from '@core/services/transaction.service';
import { RecurringService } from '@core/services/recurring.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { KpiCardComponent } from '@shared/components/kpi-card/kpi-card.component';
import { CategoryBreakdownCardComponent } from '@shared/components/category-breakdown-card/category-breakdown-card.component';
import type { KpiData } from '@shared/components/kpi-card/kpi-card.component';
import type { CategoryBreakdownItem } from '@shared/components/category-breakdown-card/category-breakdown-card.types';
import type { Transaction, RecurringTransaction } from '@core/models/finance.model';

@Component({
  selector: 'app-finanzas-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    KpiCardComponent,
    CategoryBreakdownCardComponent,
  ],
  template: `
    <div #container class="flex flex-col gap-6 font-body">
      <div>
        <h1 class="text-3xl font-bold font-display text-primary">Resumen Financiero</h1>
        <p class="text-secondary text-lg">Vista general del mes</p>
      </div>

      @if (loading()) {
        <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          @for (i of [1,2,3,4]; track i) {
            <div class="h-24 bg-subtle rounded-xl animate-pulse"></div>
          }
        </div>
      } @else {
        <section class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          @for (kpi of kpiData(); track kpi.id) {
            <app-kpi-card [data]="kpi" size="1x1" />
          }
        </section>

        <section class="rounded-xl border border-default bg-surface p-4 shadow-sm">
          <div class="flex justify-between items-center mb-2">
            <h2 class="text-xl font-semibold text-primary">Presupuesto del mes</h2>
            <a pButton [routerLink]="['/app/finanzas/presupuesto']" label="Ver detalle" [text]="true" size="small"></a>
          </div>
          <div
            class="h-3 rounded-full bg-subtle overflow-hidden"
            role="progressbar"
            [attr.aria-valuenow]="summary().budgetUsedPercent"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="h-full rounded-full transition-all"
              [class.bg-state-success]="summary().budgetUsedPercent < 80"
              [class.bg-state-warn]="summary().budgetUsedPercent >= 80 && summary().budgetUsedPercent < 100"
              [class.bg-state-error]="summary().budgetUsedPercent >= 100"
              [style.width.%]="progressWidth()"
            ></div>
          </div>
          <p class="text-sm text-secondary mt-2">
            {{ summary().totalSpent | number : '1.0-0' }} $ / {{ summary().totalBudget | number : '1.0-0' }} $
            ({{ summary().budgetUsedPercent | number : '1.0-1' }}%)
          </p>
        </section>

        <div class="grid gap-6 lg:grid-cols-2">
          <section class="rounded-xl border border-default bg-surface p-4 shadow-sm">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold text-primary">Top categorías</h2>
              <a pButton [routerLink]="['/app/finanzas/reportes']" label="Reportes" [text]="true" size="small"></a>
            </div>
            @if (topCategoriesItems().length > 0) {
              <app-category-breakdown-card
                title="Gastos por categoría"
                [items]="topCategoriesItems()"
                totalLabel="Total"
                variant="expense"
                size="2x2"
                [inGrid]="false"
                [showDetailLabel]="false"
              />
            } @else {
              <p class="text-muted text-sm">Sin gastos este mes.</p>
            }
          </section>

          <section class="rounded-xl border border-default bg-surface p-4 shadow-sm">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold text-primary">Últimas transacciones</h2>
              <a pButton [routerLink]="['/app/finanzas/transacciones']" label="Ver todas" [text]="true" size="small"></a>
            </div>
            @if (lastTransactions().length > 0) {
              <ul class="space-y-2">
                @for (tx of lastTransactions(); track tx.id) {
                  <li class="flex justify-between items-center py-2 border-b border-default last:border-0">
                    <span class="font-medium truncate flex-1 mr-2">{{ tx.category?.name ?? '—' }}</span>
                    <span
                      class="tabular-nums shrink-0"
                      [class.text-state-success]="tx.type === 'income'"
                      [class.text-state-error]="tx.type === 'expense'"
                    >
                      {{ tx.type === 'income' ? '+' : '-' }}{{ tx.amount | number : '1.0-0' }} $
                    </span>
                  </li>
                }
              </ul>
            } @else {
              <p class="text-muted text-sm">Sin transacciones recientes.</p>
            }
          </section>
        </div>

        @if (upcomingRecurring().length > 0) {
          <section class="rounded-xl border border-default bg-surface p-4 shadow-sm">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold text-primary">Próximos recurrentes</h2>
              <a pButton [routerLink]="['/app/finanzas/recurrentes']" label="Ver todos" [text]="true" size="small"></a>
            </div>
            <ul class="space-y-2">
              @for (r of upcomingRecurring(); track r.id) {
                <li class="flex justify-between items-center py-2 border-b border-default last:border-0">
                  <span class="font-medium">{{ r.description || r.category?.name || 'Recurrente' }}</span>
                  <span class="tabular-nums text-secondary">
                    {{ r.amount | number : '1.0-0' }} $ · {{ r.next_due_date | date : 'd/M' }}
                  </span>
                </li>
              }
            </ul>
          </section>
        }
      }
    </div>
  `,
})
export class FinanzasDashboardComponent implements OnInit, AfterViewInit {
  private auth = inject(AuthService);
  private financeSummary = inject(FinanceSummaryService);
  private transactionService = inject(TransactionService);
  private recurringService = inject(RecurringService);
  private gsap = inject(GsapAnimationsService);

  containerRef = viewChild<ElementRef<HTMLElement>>('container');

  loading = signal(true);
  summary = signal<{
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    savingsRate: number;
    totalBudget: number;
    totalSpent: number;
    budgetUsedPercent: number;
    topCategories: { categoryId: string; categoryName: string; value: number }[];
    incomeVsLastMonth?: number;
    expensesVsLastMonth?: number;
  }>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    savingsRate: 0,
    totalBudget: 0,
    totalSpent: 0,
    budgetUsedPercent: 0,
    topCategories: [],
  });
  lastTransactions = signal<Transaction[]>([]);
  upcomingRecurring = signal<RecurringTransaction[]>([]);

  kpiData = computed<KpiData[]>(() => {
    const s = this.summary();
    const formatMoney = (n: number) => `${n.toLocaleString('es-CL', { maximumFractionDigits: 0 })} $`;
    const formatPct = (n: number) => `${n.toFixed(1)}%`;
    return [
      {
        id: 'income',
        label: 'Ingresos',
        value: s.totalIncome,
        valueDisplay: formatMoney(s.totalIncome),
        icon: 'pi pi-arrow-down-right',
        trend: s.incomeVsLastMonth != null && s.incomeVsLastMonth !== 0 ? (s.incomeVsLastMonth > 0 ? 'up' : 'down') : undefined,
        trendValue: s.incomeVsLastMonth != null ? `${s.incomeVsLastMonth > 0 ? '+' : ''}${s.incomeVsLastMonth.toFixed(1)}% vs mes ant.` : undefined,
      },
      {
        id: 'expenses',
        label: 'Gastos',
        value: s.totalExpenses,
        valueDisplay: formatMoney(s.totalExpenses),
        icon: 'pi pi-arrow-up-right',
        trend: s.expensesVsLastMonth != null && s.expensesVsLastMonth !== 0 ? (s.expensesVsLastMonth > 0 ? 'up' : 'down') : undefined,
        trendValue: s.expensesVsLastMonth != null ? `${s.expensesVsLastMonth > 0 ? '+' : ''}${s.expensesVsLastMonth.toFixed(1)}% vs mes ant.` : undefined,
      },
      {
        id: 'balance',
        label: 'Balance',
        value: s.balance,
        valueDisplay: formatMoney(s.balance),
        icon: 'pi pi-wallet',
      },
      {
        id: 'savings',
        label: 'Tasa ahorro',
        value: s.savingsRate,
        valueDisplay: formatPct(s.savingsRate),
        icon: 'pi pi-percentage',
      },
    ];
  });

  topCategoriesItems = computed<CategoryBreakdownItem[]>(() =>
    this.summary()
      .topCategories.slice(0, 5)
      .map((c) => ({ id: c.categoryId, label: c.categoryName, value: c.value }))
  );

  progressWidth = computed(() => Math.min(100, this.summary().budgetUsedPercent));

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    const el = this.containerRef()?.nativeElement;
    if (el) this.gsap.animatePageEnter(el);
  }

  private async loadData(): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) {
      this.loading.set(false);
      return;
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [summaryRes, txRes, recRes] = await Promise.all([
      this.financeSummary.getSummaryWithComparison(householdId, year, month),
      this.transactionService.getTransactions({
        householdId,
        fromDate: `${year}-${String(month).padStart(2, '0')}-01`,
        toDate: now.toISOString().slice(0, 10),
      }),
      this.recurringService.getUpcoming(householdId, 30),
    ]);

    this.loading.set(false);
    if (summaryRes.data) this.summary.set(summaryRes.data);
    if (txRes.data.length) this.lastTransactions.set(txRes.data.slice(0, 5));
    if (recRes.data.length) this.upcomingRecurring.set(recRes.data.slice(0, 5));
  }
}
