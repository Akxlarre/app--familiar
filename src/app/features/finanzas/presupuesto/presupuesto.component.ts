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
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@core/services/auth.service';
import { BudgetService } from '@core/services/budget.service';
import { CategoryService } from '@core/services/category.service';
import { TransactionService } from '@core/services/transaction.service';
import { FinanceSummaryService } from '@core/services/finance-summary.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import type { Category } from '@core/models/finance.model';

@Component({
  selector: 'app-presupuesto',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    SelectModule,
    PressFeedbackDirective,
  ],
  template: `
    <div #container class="flex flex-col gap-6 font-body">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold font-display text-primary">Presupuesto</h1>
          <p class="text-secondary text-lg">Seguimiento por categoría con % del ingreso</p>
        </div>
        <div class="flex items-center gap-2">
          <p-select
            [options]="monthOptions"
            [(ngModel)]="selectedMonth"
            (ngModelChange)="onPeriodChange()"
            optionLabel="label"
            optionValue="value"
            styleClass="w-32"
            appendTo="body"
          />
          <p-select
            [options]="yearOptions()"
            [(ngModel)]="selectedYear"
            (ngModelChange)="onPeriodChange()"
            styleClass="w-24"
            appendTo="body"
          />
          <button
            pButton
            label="Configurar"
            icon="pi pi-cog"
            severity="secondary"
            (click)="openConfigDialog()"
            appPressFeedback="press"
          ></button>
        </div>
      </div>

      @if (loading()) {
        <div class="rounded-xl border border-default bg-surface p-8 shadow-sm animate-pulse">
          <div class="h-12 bg-subtle rounded w-full mb-4"></div>
          <div class="h-12 bg-subtle rounded w-full mb-4"></div>
          <div class="h-12 bg-subtle rounded w-2/3"></div>
        </div>
      } @else {
        <!-- Resumen total -->
        <section class="rounded-xl border border-default bg-surface p-4 shadow-sm">
          <div class="flex justify-between items-center mb-2">
            <span class="font-semibold text-primary">Total del mes</span>
            <span class="text-secondary text-sm">
              {{ summary().totalIncome | number : '1.0-0' }} $ ingreso ·
              {{ summary().totalSpent | number : '1.0-0' }} $ gastado
            </span>
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
              [class.bg-state-success]="summary().budgetUsedPercent < 60"
              [class.bg-state-warn]="summary().budgetUsedPercent >= 60 && summary().budgetUsedPercent < 80"
              [class.bg-state-error]="summary().budgetUsedPercent >= 80"
              [style.width.%]="progressWidth()"
            ></div>
          </div>
          <div class="flex justify-between text-sm text-secondary mt-2">
            <span>{{ summary().totalSpent | number : '1.0-0' }} $ / {{ summary().totalBudget | number : '1.0-0' }} $</span>
            <span>{{ summary().budgetUsedPercent | number : '1.0-1' }}% del presupuesto</span>
          </div>
        </section>

        <!-- Por categoría -->
        <section class="rounded-xl border border-default bg-surface p-4 shadow-sm space-y-4">
          <h2 class="text-xl font-semibold text-primary">Por categoría</h2>
          @for (row of budgetRows(); track row.categoryId) {
            <div class="flex flex-col gap-1">
              <div class="flex justify-between items-center text-sm">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-primary">{{ row.categoryName }}</span>
                  @if (row.overThreshold) {
                    <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-state-warn/20 text-state-warn">Alerta</span>
                  }
                </div>
                <button
                  type="button"
                  class="tabular-nums text-secondary hover:text-primary"
                  (click)="editBudgetInline(row)"
                >
                  {{ row.spent | number : '1.0-0' }} $ / {{ row.budget | number : '1.0-0' }} $
                </button>
              </div>
              <div
                class="h-2 rounded-full bg-subtle overflow-hidden"
                role="progressbar"
                [attr.aria-valuenow]="row.percent"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  class="h-full rounded-full transition-all"
                  [class.bg-state-success]="row.percent < 60"
                  [class.bg-state-warn]="row.percent >= 60 && row.percent < 80"
                  [class.bg-state-error]="row.percent >= 80"
                  [style.width.%]="row.percentDisplay"
                ></div>
              </div>
              @if (summary().totalIncome > 0) {
                <p class="text-xs text-muted">{{ row.percentOfIncome | number : '1.1-1' }}% del ingreso</p>
              }
            </div>
          }
          @if (budgetRows().length === 0) {
            <p class="text-muted text-sm">Configura presupuestos por categoría.</p>
          }
        </section>

        <!-- Categorías con gasto sin presupuesto -->
        @if (categoriesWithSpendNoBudget().length > 0) {
          <section class="rounded-xl border border-default bg-surface p-4 shadow-sm">
            <h2 class="text-lg font-semibold text-primary mb-2">Gasto sin presupuesto asignado</h2>
            @for (row of categoriesWithSpendNoBudget(); track row.categoryId) {
              <div class="flex justify-between items-center py-2 border-b border-default last:border-0">
                <span class="font-medium">{{ row.categoryName }}</span>
                <span class="tabular-nums">{{ row.spent | number : '1.0-0' }} $</span>
                <button
                  pButton
                  label="Asignar"
                  size="small"
                  [text]="true"
                  (click)="assignBudget(row)"
                  appPressFeedback="press"
                ></button>
              </div>
            }
          </section>
        }
      }

      <p-dialog
        [(visible)]="configVisible"
        header="Configurar presupuesto"
        [modal]="true"
        appendTo="body"
        [style]="{ width: 'min(100%, 28rem)' }"
        [draggable]="false"
        [resizable]="false"
        (onShow)="loadConfigForm()"
      >
        <div class="flex flex-col gap-4">
          @for (cat of expenseCategories(); track cat.id) {
            <div>
              <label [for]="'budget-' + cat.id" class="text-sm font-medium text-primary block mb-2">
                {{ cat.name }}
              </label>
              <p-inputNumber
                [id]="'budget-' + cat.id"
                [ngModel]="getConfigAmount(cat.id)"
                (ngModelChange)="setConfigAmount(cat.id, $event)"
                mode="currency"
                currency="CLP"
                locale="es-CL"
                [minFractionDigits]="0"
                [min]="0"
                styleClass="w-full"
                inputStyleClass="w-full"
              />
            </div>
          }
        </div>
        <ng-template pTemplate="footer">
          <button pButton label="Cancelar" severity="secondary" (click)="configVisible = false"></button>
          <button
            pButton
            label="Guardar"
            (click)="onSaveConfig()"
            [loading]="saving()"
            appPressFeedback="press"
          ></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
})
export class PresupuestoComponent implements OnInit, AfterViewInit {
  private auth = inject(AuthService);
  private budgetService = inject(BudgetService);
  private categoryService = inject(CategoryService);
  private transactionService = inject(TransactionService);
  private financeSummary = inject(FinanceSummaryService);
  private gsap = inject(GsapAnimationsService);

  containerRef = viewChild<ElementRef<HTMLElement>>('container');

  loading = signal(true);
  saving = signal(false);
  summary = signal<{
    totalIncome: number;
    totalExpenses: number;
    totalBudget: number;
    totalSpent: number;
    budgetUsedPercent: number;
    topCategories: { categoryId: string; categoryName: string; value: number }[];
  }>({
    totalIncome: 0,
    totalExpenses: 0,
    totalBudget: 0,
    totalSpent: 0,
    budgetUsedPercent: 0,
    topCategories: [],
  });
  budgets = signal<{ id: string; category_id: string; categoryName: string; amount: number; alert_threshold: number }[]>([]);
  spentByCategory = signal<{ category_id: string; total: number }[]>([]);
  expenseCategories = signal<Category[]>([]);
  configVisible = false;
  configAmounts: Record<string, number> = {};

  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();
  monthOptions = [
    { label: 'Enero', value: 1 }, { label: 'Febrero', value: 2 }, { label: 'Marzo', value: 3 },
    { label: 'Abril', value: 4 }, { label: 'Mayo', value: 5 }, { label: 'Junio', value: 6 },
    { label: 'Julio', value: 7 }, { label: 'Agosto', value: 8 }, { label: 'Septiembre', value: 9 },
    { label: 'Octubre', value: 10 }, { label: 'Noviembre', value: 11 }, { label: 'Diciembre', value: 12 },
  ];

  yearOptions = computed(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  });

  progressWidth = computed(() => Math.min(100, this.summary().budgetUsedPercent));

  budgetRows = computed(() => {
    const cats = this.expenseCategories();
    const buds = this.budgets();
    const spent = this.spentByCategory();
    const spentMap = new Map(spent.map((s) => [s.category_id, s.total]));
    const totalIncome = this.summary().totalIncome;
    return cats
      .filter((c) => buds.some((b) => b.category_id === c.id))
      .map((cat) => {
        const b = buds.find((x) => x.category_id === cat.id);
        const budget = b ? b.amount : 0;
        const spentVal = spentMap.get(cat.id) ?? 0;
        const percent = budget > 0 ? (spentVal / budget) * 100 : 0;
        const percentOfIncome = totalIncome > 0 ? (spentVal / totalIncome) * 100 : 0;
        const threshold = b?.alert_threshold ?? 80;
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          budget,
          spent: spentVal,
          percent,
          percentDisplay: Math.min(100, percent),
          percentOfIncome,
          overThreshold: percent >= threshold,
        };
      });
  });

  categoriesWithSpendNoBudget = computed(() => {
    const cats = this.expenseCategories();
    const buds = this.budgets();
    const spent = this.spentByCategory();
    const withBudget = new Set(buds.map((b) => b.category_id));
    return spent
      .filter((s) => s.total > 0 && !withBudget.has(s.category_id))
      .map((s) => {
        const cat = cats.find((c) => c.id === s.category_id);
        return {
          categoryId: s.category_id,
          categoryName: cat?.name ?? 'Sin categoría',
          spent: s.total,
        };
      });
  });

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    const el = this.containerRef()?.nativeElement;
    if (el) this.gsap.animatePageEnter(el);
  }

  onPeriodChange(): void {
    void this.loadData();
  }

  private async loadData(): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) {
      this.loading.set(false);
      return;
    }
    const [summaryRes, budgetRes, spentRes, catRes] = await Promise.all([
      this.financeSummary.getSummary(householdId, this.selectedYear, this.selectedMonth),
      this.budgetService.getBudgets(householdId, this.selectedYear, this.selectedMonth),
      this.transactionService.getExpensesByCategoryForMonth(householdId, this.selectedYear, this.selectedMonth),
      this.categoryService.getCategories(householdId, 'expense'),
    ]);
    this.loading.set(false);
    if (summaryRes.data) this.summary.set(summaryRes.data);
    if (catRes.data.length) this.expenseCategories.set(catRes.data);
    const budgetList = (budgetRes.data ?? []).map((b) => ({
      id: b.id,
      category_id: b.category_id,
      categoryName: b.category?.name ?? '',
      amount: Number(b.amount),
      alert_threshold: b.alert_threshold ?? 80,
    }));
    this.budgets.set(budgetList);
    this.spentByCategory.set(spentRes.data ?? []);
  }

  loadConfigForm(): void {
    this.configAmounts = {};
    for (const b of this.budgets()) {
      this.configAmounts[b.category_id] = b.amount;
    }
    for (const c of this.expenseCategories()) {
      if (this.configAmounts[c.id] === undefined) this.configAmounts[c.id] = 0;
    }
  }

  getConfigAmount(categoryId: string): number {
    return this.configAmounts[categoryId] ?? 0;
  }

  setConfigAmount(categoryId: string, value: number | null): void {
    this.configAmounts[categoryId] = value ?? 0;
  }

  async onSaveConfig(): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) return;
    this.saving.set(true);
    for (const cat of this.expenseCategories()) {
      const amount = this.configAmounts[cat.id] ?? 0;
      if (amount > 0) {
        await this.budgetService.upsertBudget(
          householdId,
          cat.id,
          this.selectedYear,
          this.selectedMonth,
          amount,
          80
        );
      } else {
        const existing = this.budgets().find((b) => b.category_id === cat.id);
        if (existing) await this.budgetService.deleteBudget(existing.id);
      }
    }
    this.saving.set(false);
    this.configVisible = false;
    await this.loadData();
  }

  openConfigDialog(): void {
    this.configVisible = true;
  }

  editBudgetInline(row: { categoryId: string; categoryName: string; budget: number }): void {
    this.configAmounts[row.categoryId] = row.budget;
    this.loadConfigForm();
    this.configVisible = true;
  }

  assignBudget(row: { categoryId: string; categoryName: string; spent: number }): void {
    this.configAmounts[row.categoryId] = row.spent;
    this.loadConfigForm();
    this.configVisible = true;
  }
}
