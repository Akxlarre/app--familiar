import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  viewChild,
  ElementRef,
  AfterViewInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '@core/services/auth.service';
import { TransactionService } from '@core/services/transaction.service';
import { AccountService } from '@core/services/account.service';
import { CategoryService } from '@core/services/category.service';
import { HouseholdService } from '@core/services/household.service';
import { ReceiptService } from '@core/services/receipt.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { ConfirmModalService } from '@core/services/confirm-modal.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { TransaccionFormComponent } from './transaccion-form/transaccion-form.component';
import type { Transaction, Account, Category } from '@core/models/finance.model';
import type { HouseholdMember } from '@core/services/household.service';

@Component({
  selector: 'app-transacciones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    DatePickerModule,
    InputTextModule,
    PressFeedbackDirective,
    EmptyStateComponent,
    TransaccionFormComponent,
  ],
  template: `
    <div #container class="flex flex-col gap-6 font-body pb-20">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold font-display text-primary">Transacciones</h1>
          <p class="text-secondary text-lg">Ingresos, gastos y transferencias</p>
        </div>
        <button
          pButton
          icon="pi pi-plus"
          label="Nueva"
          (click)="openForm(null)"
          appPressFeedback="press"
        ></button>
      </div>

      <!-- Filtros -->
      <section class="rounded-xl border border-default bg-surface p-4 shadow-sm flex flex-wrap gap-4 items-end">
        <div>
          <label class="text-sm font-medium text-primary block mb-1">Tipo</label>
          <p-select
            [options]="typeFilterOptions"
            [(ngModel)]="filterType"
            (ngModelChange)="loadTransactions()"
            optionLabel="label"
            optionValue="value"
            styleClass="min-w-32"
            appendTo="body"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-primary block mb-1">Desde</label>
          <p-datePicker
            [(ngModel)]="filterFrom"
            (ngModelChange)="loadTransactions()"
            dateFormat="dd/mm/yy"
            [showIcon]="true"
            appendTo="body"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-primary block mb-1">Hasta</label>
          <p-datePicker
            [(ngModel)]="filterTo"
            (ngModelChange)="loadTransactions()"
            dateFormat="dd/mm/yy"
            [showIcon]="true"
            appendTo="body"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-primary block mb-1">Cuenta</label>
          <p-select
            [options]="accountFilterOptions()"
            [(ngModel)]="filterAccountId"
            (ngModelChange)="loadTransactions()"
            optionLabel="name"
            optionValue="id"
            placeholder="Todas"
            styleClass="min-w-40"
            appendTo="body"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-primary block mb-1">Buscar</label>
          <input
            type="text"
            pInputText
            [(ngModel)]="filterSearch"
            (ngModelChange)="loadTransactions()"
            placeholder="En nota..."
            class="min-w-48"
          />
        </div>
      </section>

      @if (loading()) {
        <div class="animate-pulse space-y-3">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="h-20 bg-subtle rounded-xl"></div>
          }
        </div>
      } @else {
        <div class="flex flex-col gap-3">
          @for (tx of transactions(); track tx.id) {
            <div
              class="rounded-xl border border-default bg-surface p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:border-primary/50 transition"
              (click)="openForm(tx)"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  [class.bg-state-success]="tx.type === 'income'"
                  [class.bg-state-error]="tx.type === 'expense'"
                  [class.bg-primary/20]="tx.type === 'transfer'"
                >
                  @if (tx.category?.icon) {
                    <i [class]="tx.category?.icon" class="text-lg"></i>
                  } @else {
                    <i class="pi pi-wallet text-lg"></i>
                  }
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-primary truncate">
                    {{ tx.category?.name ?? (tx.type === 'transfer' ? 'Transferencia' : '—') }}
                  </p>
                  <p class="text-sm text-secondary">
                    {{ tx.date | date : 'd/M/yyyy' }}
                    @if (tx.note) {
                      · {{ tx.note }}
                    }
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span
                  class="text-lg font-bold tabular-nums"
                  [class.text-state-success]="tx.type === 'income'"
                  [class.text-state-error]="tx.type === 'expense'"
                  [class.text-primary]="tx.type === 'transfer'"
                >
                  {{ tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '→' }}
                  {{ tx.amount | number : '1.0-0' }} $
                </span>
                <button
                  pButton
                  icon="pi pi-trash"
                  [text]="true"
                  [rounded]="true"
                  severity="danger"
                  (click)="deleteTransaction(tx); $event.stopPropagation()"
                  appPressFeedback="press"
                ></button>
              </div>
            </div>
          }
        </div>

        @if (transactions().length === 0) {
          <app-empty-state
            message="No hay transacciones"
            subtitle="Registra tu primer gasto o ingreso"
            actionLabel="Nueva transacción"
            (action)="openForm(null)"
          />
        }
      }

      <!-- FAB -->
      <button
        pButton
        icon="pi pi-plus"
        class="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-10"
        (click)="openForm(null)"
        appPressFeedback="press"
      ></button>

      <p-dialog
        [(visible)]="formVisible"
        [header]="editingTransaction() ? 'Editar transacción' : 'Nueva transacción'"
        [modal]="true"
        appendTo="body"
        [style]="{ width: 'min(100%, 28rem)' }"
        [draggable]="false"
        [resizable]="false"
        (onHide)="closeForm()"
      >
        @if (formVisible) {
          <app-transaccion-form
            [transaction]="editingTransaction()"
            [accounts]="accounts()"
            [expenseCategories]="expenseCategories()"
            [incomeCategories]="incomeCategories()"
            (submit)="onFormSubmit()"
            (receiptFile)="onReceiptFile($event)"
          />
        }
        <ng-template pTemplate="footer">
          <button pButton label="Cancelar" severity="secondary" (click)="formVisible = false"></button>
          <button
            pButton
            label="Guardar"
            (click)="onFormSubmit()"
            [loading]="saving()"
            appPressFeedback="press"
          ></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
})
export class TransaccionesComponent implements OnInit, AfterViewInit {
  private auth = inject(AuthService);
  private transactionService = inject(TransactionService);
  private accountService = inject(AccountService);
  private categoryService = inject(CategoryService);
  private householdService = inject(HouseholdService);
  private receiptService = inject(ReceiptService);
  private gsap = inject(GsapAnimationsService);
  private confirmModal = inject(ConfirmModalService);

  formRef = viewChild(TransaccionFormComponent);
  containerRef = viewChild<ElementRef<HTMLElement>>('container');

  loading = signal(true);
  saving = signal(false);
  transactions = signal<Transaction[]>([]);
  accounts = signal<Account[]>([]);
  expenseCategories = signal<Category[]>([]);
  incomeCategories = signal<Category[]>([]);
  members = signal<HouseholdMember[]>([]);
  formVisible = false;
  editingTransaction = signal<Transaction | null>(null);
  pendingReceiptFile: File | null = null;
  pendingReceiptStoragePath: string | null = null;

  typeFilterOptions = [
    { label: 'Todas', value: null },
    { label: 'Gastos', value: 'expense' },
    { label: 'Ingresos', value: 'income' },
    { label: 'Transferencias', value: 'transfer' },
  ];
  filterType: 'expense' | 'income' | 'transfer' | null = null;
  filterFrom: Date | null = null;
  filterTo: Date | null = null;
  filterAccountId: string | null = null;
  filterSearch = '';

  accountFilterOptions = computed(() => [
    { id: null, name: 'Todas las cuentas' },
    ...this.accounts(),
  ]);

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
    const [accRes, expCatRes, incCatRes, memRes] = await Promise.all([
      this.accountService.getAccounts(householdId, false),
      this.categoryService.getCategories(householdId, 'expense'),
      this.categoryService.getCategories(householdId, 'income'),
      this.householdService.getHouseholdMembers(householdId),
    ]);
    if (accRes.data.length) this.accounts.set(accRes.data);
    this.expenseCategories.set(expCatRes.data);
    this.incomeCategories.set(incCatRes.data);
    if (memRes.data.length) this.members.set(memRes.data);
    await this.loadTransactions();
    this.loading.set(false);
  }

  async loadTransactions(): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) return;
    const fromStr = this.filterFrom ? this.toDateStr(this.filterFrom) : undefined;
    const toStr = this.filterTo ? this.toDateStr(this.filterTo) : undefined;
    const res = await this.transactionService.getTransactions({
      householdId,
      fromDate: fromStr,
      toDate: toStr,
      type: this.filterType ?? undefined,
      accountId: this.filterAccountId ?? undefined,
      search: this.filterSearch || undefined,
    });
    if (res.data.length) this.transactions.set(res.data);
    else this.transactions.set([]);
  }

  openForm(tx: Transaction | null): void {
    this.editingTransaction.set(tx);
    this.pendingReceiptFile = null;
    this.pendingReceiptStoragePath = null;
    this.formVisible = true;
  }

  closeForm(): void {
    this.formVisible = false;
    this.editingTransaction.set(null);
    this.pendingReceiptFile = null;
    this.pendingReceiptStoragePath = null;
  }

  async onFormSubmit(): Promise<void> {
    const form = this.formRef();
    if (!form || form.form.invalid) {
      form?.form.markAllAsTouched();
      return;
    }
    const householdId = this.auth.currentUser()?.householdId;
    const userId = this.auth.currentUser()?.id;
    if (!householdId || !userId) return;

    const v = form.getValue();
    const dateStr = v.date instanceof Date ? v.date.toISOString().slice(0, 10) : String(v.date).slice(0, 10);

    let categoryId = v.categoryId;
    if (v.type === 'transfer' && !categoryId && this.expenseCategories().length) {
      const otro = this.expenseCategories().find((c) => c.name?.toLowerCase().includes('otro'));
      categoryId = otro?.id ?? this.expenseCategories()[0]?.id ?? '';
    }

    this.saving.set(true);
    const editing = this.editingTransaction();

    if (editing) {
      const res = await this.transactionService.updateTransaction(editing.id, {
        accountId: v.accountId,
        categoryId: categoryId || undefined,
        type: v.type,
        amount: v.amount,
        date: dateStr,
        note: v.note || null,
        transferToAccountId: v.transferToAccountId,
      });
      this.saving.set(false);
      if (res.error) return;
      this.closeForm();
      await this.loadTransactions();
      return;
    }

    const res = await this.transactionService.createTransaction({
      householdId,
      profileId: userId,
      accountId: v.accountId,
      categoryId: categoryId || this.expenseCategories()[0]?.id || '',
      type: v.type,
      amount: v.amount,
      date: dateStr,
      note: v.note || undefined,
      transferToAccountId: v.transferToAccountId,
    });
    if (res.error) {
      this.saving.set(false);
      return;
    }

    if (res.data && this.pendingReceiptStoragePath) {
      const { data: receipt } = await this.receiptService.createReceipt({
        household_id: householdId,
        storage_path: this.pendingReceiptStoragePath,
      });
      if (receipt) await this.receiptService.linkReceiptToTransaction(receipt.id, res.data.id);
    }

    this.saving.set(false);
    this.closeForm();
    await this.loadTransactions();
  }

  async onReceiptFile(file: File): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) return;
    this.saving.set(true);
    const { path, error } = await this.receiptService.uploadReceiptImage(householdId, file);
    this.saving.set(false);
    if (error || !path) return;
    this.pendingReceiptStoragePath = path;
    const ocrRes = await this.receiptService.processOcr(path);
    const form = this.formRef();
    if (ocrRes.data && form) {
      form.setAmountDateNote(
        ocrRes.data.amount ?? 0,
        ocrRes.data.date ? new Date(ocrRes.data.date) : new Date(),
        ocrRes.data.merchant ?? ''
      );
    }
  }

  async deleteTransaction(tx: Transaction): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Eliminar transacción',
      message: `¿Eliminar esta transacción de ${tx.amount} $?`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      severity: 'danger',
    });
    if (!confirmed) return;
    this.saving.set(true);
    const { error } = await this.transactionService.deleteTransaction(tx.id);
    this.saving.set(false);
    if (!error) await this.loadTransactions();
  }

  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
