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
import { FinanceSummaryService } from '@core/services/finance-summary.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';

@Component({
  selector: 'app-presupuesto',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
  ],
  template: `
    <div #container class="flex flex-col gap-6 font-body">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold font-display text-primary">Presupuesto</h1>
          <p class="text-secondary text-lg">Por propósito (sincronizado con saldos de cuentas)</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
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

        <!-- Por propósito (sincronizado con cuentas) -->
        <section class="rounded-xl border border-default bg-surface p-4 shadow-sm space-y-4">
          <h2 class="text-xl font-semibold text-primary">Por propósito</h2>
          <p class="text-sm text-secondary">Balance y gastos del mes sincronizados con los totales de cada cuenta.</p>
          @for (row of budgetByPurpose(); track row.purpose) {
            <div class="flex flex-col gap-1 rounded-lg border border-default p-3">
              <div class="flex justify-between items-center">
                <span class="font-medium text-primary">{{ row.purposeLabel }}</span>
                <span class="tabular-nums text-secondary text-sm">
                  Disponible: {{ row.balance | number : '1.0-0' }} $
                </span>
              </div>
              <div class="flex justify-between text-sm text-muted">
                <span>Gastado este mes: {{ row.spent | number : '1.0-0' }} $</span>
                <span>Transferido este mes: {{ row.transfersIn | number : '1.0-0' }} $</span>
              </div>
            </div>
          }
          @if (budgetByPurpose().length === 0) {
            <p class="text-muted text-sm">Asigna propósitos a tus cuentas en Finanzas → Cuentas.</p>
          }
        </section>
      }

    </div>
  `,
})
export class PresupuestoComponent implements OnInit, AfterViewInit {
  private auth = inject(AuthService);
  private financeSummary = inject(FinanceSummaryService);
  private gsap = inject(GsapAnimationsService);

  containerRef = viewChild<ElementRef<HTMLElement>>('container');

  loading = signal(true);
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
  budgetByPurpose = signal<{ purpose: string; purposeLabel: string; balance: number; spent: number; transfersIn: number; accountIds: string[] }[]>([]);
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
    const [summaryRes, purposeRes] = await Promise.all([
      this.financeSummary.getSummary(householdId, this.selectedYear, this.selectedMonth),
      this.financeSummary.getBudgetByPurpose(householdId, this.selectedYear, this.selectedMonth),
    ]);
    this.loading.set(false);
    if (summaryRes.data) this.summary.set(summaryRes.data);
    if (purposeRes.data) this.budgetByPurpose.set(purposeRes.data);
  }
}
