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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { DatePickerModule } from 'primeng/datepicker';
import { AuthService } from '@core/services/auth.service';
import { InstallmentPurchaseService } from '@core/services/installment-purchase.service';
import { AccountService } from '@core/services/account.service';
import { CategoryService } from '@core/services/category.service';
import { TransactionService } from '@core/services/transaction.service';
import { CreditCardDetailsService } from '@core/services/credit-card-details.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import { ConfirmModalService } from '@core/services/confirm-modal.service';
import type { InstallmentPurchase } from '@core/models/finance.model';
import type { Account } from '@core/models/finance.model';
import type { Category } from '@core/models/finance.model';

@Component({
  selector: 'app-deudas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ProgressBarModule,
    DatePickerModule,
    PressFeedbackDirective,
  ],
  template: `
    <div #container class="flex flex-col gap-6 font-body">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold font-display text-primary">Deudas en cuotas</h1>
          <p class="text-secondary text-lg">Compras a cuotas con tarjeta de crédito y seguimiento de pagos</p>
        </div>
        <div class="flex gap-2">
          <button
            pButton
            icon="pi pi-wallet"
            label="Pagar tarjeta de crédito"
            severity="secondary"
            [outlined]="true"
            (click)="openPayCardDialog()"
            appPressFeedback="press"
          ></button>
          <button
            pButton
            icon="pi pi-plus"
            label="Nueva compra en cuotas"
            (click)="openNewDialog()"
            appPressFeedback="press"
          ></button>
        </div>
      </div>

      @if (loading()) {
        <div class="rounded-xl border border-default bg-surface p-8 animate-pulse">
          <div class="h-24 bg-subtle rounded-xl mb-4"></div>
          <div class="h-16 bg-subtle rounded-xl w-2/3"></div>
        </div>
      } @else {
        <section class="rounded-xl border-2 border-primary/30 bg-surface p-5 shadow-sm">
          <p class="text-secondary text-sm font-medium">Deuda total activa</p>
          <p class="text-2xl font-bold text-primary tabular-nums">{{ totalDebt() | number : '1.0-0' }} $</p>
        </section>

        @if (installments().length === 0) {
          <div class="rounded-xl border border-default bg-surface p-8 text-center text-secondary">
            No hay compras en cuotas activas. Añade una compra con tarjeta de crédito en cuotas.
          </div>
        } @else {
          <div class="flex flex-col gap-4">
            @for (ip of installments(); track ip.id) {
              <div
                class="rounded-xl border border-default bg-surface p-4 shadow-sm flex flex-col gap-3"
                [style.borderLeftWidth]="'4px'"
                [style.borderLeftColor]="ip.account?.color || 'var(--color-primary)'"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p class="font-semibold text-primary">{{ ip.description }}</p>
                    <p class="text-sm text-secondary">
                      {{ ip.account?.name ?? 'Cuenta' }} · {{ ip.installments_paid }}/{{ ip.installment_count }} cuotas
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-lg font-bold text-primary tabular-nums">{{ ip.installment_amount | number : '1.0-0' }} $ / cuota</p>
                    <p class="text-sm text-secondary">Restante: {{ remainingAmount(ip) | number : '1.0-0' }} $</p>
                  </div>
                </div>
                <p-progressBar [value]="progressPercent(ip)" [showValue]="false" styleClass="h-2"></p-progressBar>
                @if (ip.installments_paid < ip.installment_count) {
                  <button
                    pButton
                    label="Registrar cuota de este mes"
                    icon="pi pi-check"
                    size="small"
                    (click)="registerPayment(ip)"
                    [loading]="registeringId() === ip.id"
                    appPressFeedback="press"
                  ></button>
                }
              </div>
            }
          </div>
        }
      }

      <p-dialog
        [(visible)]="payCardDialogVisible"
        header="Pagar tarjeta de crédito"
        [modal]="true"
        [style]="{ width: 'min(100%, 24rem)' }"
        (onHide)="resetPayCardForm()"
      >
        <form [formGroup]="payCardForm" (ngSubmit)="submitPayCard()" class="flex flex-col gap-4">
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Desde cuenta</label>
            <p-select formControlName="from_account_id" [options]="sourceAccounts()" optionLabel="name" optionValue="id" placeholder="Selecciona" styleClass="w-full" appendTo="body" />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Tarjeta de crédito (a pagar)</label>
            <p-select formControlName="to_account_id" [options]="creditAccounts()" optionLabel="name" optionValue="id" placeholder="Selecciona" styleClass="w-full" appendTo="body" />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Monto (CLP)</label>
            <p-inputNumber formControlName="amount" mode="currency" currency="CLP" locale="es-CL" [minFractionDigits]="0" styleClass="w-full" inputStyleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Fecha</label>
            <p-datePicker formControlName="date" dateFormat="dd/mm/yy" [showIcon]="true" styleClass="w-full" appendTo="body" />
          </div>
        </form>
        <ng-template pTemplate="footer">
          <button pButton label="Cancelar" severity="secondary" (click)="payCardDialogVisible = false"></button>
          <button pButton label="Registrar pago" (click)="submitPayCard()" [loading]="saving()" [disabled]="payCardForm.invalid" appPressFeedback="press"></button>
        </ng-template>
      </p-dialog>

      <p-dialog
        [(visible)]="newDialogVisible"
        header="Nueva compra en cuotas"
        [modal]="true"
        [style]="{ width: 'min(100%, 26rem)' }"
        (onHide)="resetNewForm()"
      >
        <form [formGroup]="newForm" (ngSubmit)="saveNew()" class="flex flex-col gap-4">
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Descripción</label>
            <input type="text" pInputText formControlName="description" class="w-full" placeholder="Ej: Televisor Samsung 55" />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Tarjeta de crédito</label>
            <p-select
              formControlName="account_id"
              [options]="creditAccounts()"
              optionLabel="name"
              optionValue="id"
              placeholder="Selecciona"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Categoría</label>
            <p-select
              formControlName="category_id"
              [options]="expenseCategories()"
              optionLabel="name"
              optionValue="id"
              placeholder="Selecciona"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Monto total (CLP)</label>
            <p-inputNumber formControlName="total_amount" mode="currency" currency="CLP" locale="es-CL" [minFractionDigits]="0" styleClass="w-full" inputStyleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Número de cuotas</label>
            <p-inputNumber formControlName="installment_count" [min]="1" [max]="48" styleClass="w-full" inputStyleClass="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Fecha de compra</label>
            <p-datePicker formControlName="purchase_date" dateFormat="dd/mm/yy" [showIcon]="true" styleClass="w-full" appendTo="body" />
          </div>
        </form>
        <ng-template pTemplate="footer">
          <button pButton label="Cancelar" severity="secondary" (click)="newDialogVisible = false"></button>
          <button pButton label="Guardar" (click)="saveNew()" [loading]="saving()" [disabled]="newForm.invalid" appPressFeedback="press"></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
})
export class DeudasComponent implements OnInit, AfterViewInit {
  private auth = inject(AuthService);
  private installmentService = inject(InstallmentPurchaseService);
  private accountService = inject(AccountService);
  private categoryService = inject(CategoryService);
  private transactionService = inject(TransactionService);
  private creditCardDetailsService = inject(CreditCardDetailsService);
  private gsap = inject(GsapAnimationsService);
  private confirmModal = inject(ConfirmModalService);
  private fb = inject(FormBuilder);

  containerRef = viewChild<ElementRef<HTMLElement>>('container');

  loading = signal(true);
  saving = signal(false);
  registeringId = signal<string | null>(null);
  installments = signal<InstallmentPurchase[]>([]);
  accounts = signal<Account[]>([]);
  expenseCategories = signal<Category[]>([]);
  newDialogVisible = false;
  payCardDialogVisible = false;

  payCardForm = this.fb.nonNullable.group({
    from_account_id: ['', Validators.required],
    to_account_id: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    date: [null as Date | null, Validators.required],
  });

  newForm = this.fb.nonNullable.group({
    description: ['', Validators.required],
    account_id: ['', Validators.required],
    category_id: ['', Validators.required],
    total_amount: [0, [Validators.required, Validators.min(1)]],
    installment_count: [1, [Validators.required, Validators.min(1)]],
    purchase_date: [null as Date | null, Validators.required],
  });

  creditAccounts = computed(() => this.accounts().filter((a) => a.type === 'credit_card'));
  sourceAccounts = computed(() => this.accounts().filter((a) => a.type === 'bank' || a.type === 'debit_card'));

  totalDebt = computed(() => {
    return this.installments().reduce((sum, ip) => sum + this.remainingAmount(ip), 0);
  });

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
    const [instRes, accRes, catRes] = await Promise.all([
      this.installmentService.getActiveByHousehold(householdId),
      this.accountService.getAccounts(householdId, false),
      this.categoryService.getCategories(householdId, 'expense'),
    ]);
    this.loading.set(false);
    if (instRes.data.length) this.installments.set(instRes.data);
    if (accRes.data.length) this.accounts.set(accRes.data);
    if (catRes.data.length) this.expenseCategories.set(catRes.data);
  }

  remainingAmount(ip: InstallmentPurchase): number {
    const left = ip.installment_count - ip.installments_paid;
    return left * ip.installment_amount;
  }

  progressPercent(ip: InstallmentPurchase): number {
    if (ip.installment_count <= 0) return 0;
    return (ip.installments_paid / ip.installment_count) * 100;
  }

  openNewDialog(): void {
    this.newForm.reset({
      description: '',
      account_id: this.creditAccounts()[0]?.id ?? '',
      category_id: this.expenseCategories()[0]?.id ?? '',
      total_amount: 0,
      installment_count: 1,
      purchase_date: new Date(),
    });
    this.newDialogVisible = true;
  }

  resetNewForm(): void {
    this.newForm.reset({
      description: '',
      account_id: '',
      category_id: '',
      total_amount: 0,
      installment_count: 1,
      purchase_date: null,
    });
  }

  async saveNew(): Promise<void> {
    if (this.newForm.invalid) {
      this.newForm.markAllAsTouched();
      return;
    }
    const householdId = this.auth.currentUser()?.householdId;
    const profileId = this.auth.currentUser()?.id;
    if (!householdId || !profileId) return;

    const v = this.newForm.getRawValue();
    const total = v.total_amount ?? 0;
    const count = v.installment_count ?? 1;
    const installmentAmount = count > 0 ? Math.round(total / count) : 0;
    const purchaseDate =
      v.purchase_date instanceof Date ? v.purchase_date.toISOString().slice(0, 10) : String(v.purchase_date ?? '').slice(0, 10);

    this.saving.set(true);
    const res = await this.installmentService.create({
      householdId,
      profileId,
      accountId: v.account_id,
      categoryId: v.category_id,
      description: v.description,
      totalAmount: total,
      installmentCount: count,
      installmentAmount,
      purchaseDate,
    });
    this.saving.set(false);
    if (res.error) return;
    this.newDialogVisible = false;
    await this.loadData();
  }

  async registerPayment(ip: InstallmentPurchase): Promise<void> {
    const profileId = this.auth.currentUser()?.id;
    if (!profileId) return;
    this.registeringId.set(ip.id);
    const today = new Date().toISOString().slice(0, 10);
    await this.installmentService.registerPayment(ip.id, profileId, today);
    this.registeringId.set(null);
    await this.loadData();
  }

  openPayCardDialog(): void {
    this.payCardForm.reset({
      from_account_id: this.sourceAccounts()[0]?.id ?? '',
      to_account_id: this.creditAccounts()[0]?.id ?? '',
      amount: 0,
      date: new Date(),
    });
    this.payCardDialogVisible = true;
  }

  resetPayCardForm(): void {
    this.payCardForm.reset({
      from_account_id: '',
      to_account_id: '',
      amount: 0,
      date: null,
    });
  }

  async submitPayCard(): Promise<void> {
    if (this.payCardForm.invalid) {
      this.payCardForm.markAllAsTouched();
      return;
    }
    const householdId = this.auth.currentUser()?.householdId;
    const profileId = this.auth.currentUser()?.id;
    if (!householdId || !profileId) return;

    const v = this.payCardForm.getRawValue();
    const dateStr = v.date instanceof Date ? v.date.toISOString().slice(0, 10) : String(v.date ?? '').slice(0, 10);
    const categoryId = this.expenseCategories()[0]?.id;
    if (!categoryId) return;

    this.saving.set(true);
    const txRes = await this.transactionService.createTransaction({
      householdId,
      profileId,
      accountId: v.from_account_id,
      categoryId,
      type: 'transfer',
      amount: v.amount ?? 0,
      date: dateStr,
      note: 'Pago tarjeta de crédito',
      transferToAccountId: v.to_account_id,
    });
    if (txRes.error) {
      this.saving.set(false);
      return;
    }
    await this.creditCardDetailsService.applyPayment(v.to_account_id, v.amount ?? 0);
    this.saving.set(false);
    this.payCardDialogVisible = false;
    await this.loadData();
  }
}
