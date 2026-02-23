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
import { AuthService } from '@core/services/auth.service';
import { AccountService } from '@core/services/account.service';
import { HouseholdService } from '@core/services/household.service';
import { CreditCardDetailsService } from '@core/services/credit-card-details.service';
import { EmailIntegrationService } from '@core/services/email-integration.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import { ConfirmModalService } from '@core/services/confirm-modal.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ColorPickerComponent } from '@shared/components/color-picker';
import type { Account } from '@core/models/finance.model';
import { PURPOSE_OPTIONS as PURPOSE_OPTIONS_SHARED, getPurposeLabel } from '@core/constants/purpose';

const ACCOUNT_TYPES: { label: string; value: Account['type'] }[] = [
  { label: 'Banco', value: 'bank' },
  { label: 'Efectivo', value: 'cash' },
  { label: 'Tarjeta de crédito', value: 'credit_card' },
  { label: 'Tarjeta de débito', value: 'debit_card' },
  { label: 'Ahorro', value: 'savings' },
  { label: 'Billetera digital', value: 'digital_wallet' },
];

const PURPOSE_OPTIONS = PURPOSE_OPTIONS_SHARED;

interface PurposeGroup {
  key: string | null;
  accounts: Account[];
}

interface OwnerOption {
  label: string;
  value: string | null;
}

@Component({
  selector: 'app-cuentas',
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
    PressFeedbackDirective,
    EmptyStateComponent,
    ColorPickerComponent,
  ],
  styles: [
    `
    .balance-hero {
      background: var(--gradient-subtle);
      transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
    }
    .balance-hero:hover {
      box-shadow: var(--shadow-md);
    }
    .balance-hero.balance-positive {
      border-left: 4px solid var(--state-success);
    }
    .balance-hero.balance-negative {
      border-left: 4px solid var(--state-error);
    }
    .balance-hero__icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      background: var(--color-primary-muted);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--text-xl);
    }
    .balance-hero__label {
      margin-bottom: var(--space-1);
    }
    `,
  ],
  template: `
    <div #container class="flex flex-col gap-6 font-body">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold font-display text-primary">Cuentas</h1>
          <p class="text-secondary text-lg">Tus cuentas y billeteras del hogar</p>
        </div>
        <button
          pButton
          icon="pi pi-plus"
          label="Nueva cuenta"
          (click)="openCreateDialog()"
          appPressFeedback="press"
        ></button>
      </div>

      @if (loading()) {
        <div class="rounded-xl border border-default bg-surface p-8 shadow-sm animate-pulse">
          <div class="h-24 bg-subtle rounded-xl mb-4"></div>
          <div class="h-24 bg-subtle rounded-xl mb-4"></div>
          <div class="h-24 bg-subtle rounded-xl w-2/3"></div>
        </div>
      } @else {
        <!-- Saldo total -->
        <section
          class="balance-hero flex items-center gap-4 rounded-xl border border-default bg-surface p-5 shadow-sm"
          [class.balance-positive]="totalBalance() >= 0"
          [class.balance-negative]="totalBalance() < 0"
        >
          <div class="balance-hero__icon shrink-0">
            <i class="pi pi-wallet"></i>
          </div>
          <div class="balance-hero__content flex-1 min-w-0">
            <p class="balance-hero__label text-sm font-medium text-secondary">Saldo total</p>
            <p
              class="balance-hero__value font-display text-2xl font-bold tabular-nums tracking-tight"
              [class.text-state-success]="totalBalance() >= 0"
              [class.text-state-error]="totalBalance() < 0"
            >
              {{ totalBalance() | number : '1.0-0' }} $
            </p>
          </div>
        </section>

        <!-- Cuentas agrupadas por propósito -->
        @if (accounts().length > 0) {
          @for (group of accountsByPurpose(); track group.key) {
            <section class="flex flex-col gap-3">
              @if (group.key) {
                <h2 class="text-sm font-semibold text-secondary uppercase tracking-wide">{{ getPurposeLabel(group.key) }}</h2>
              } @else {
                <h2 class="text-sm font-semibold text-secondary uppercase tracking-wide">Sin propósito definido</h2>
              }
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                @for (acc of group.accounts; track acc.id) {
                <div
                  class="rounded-xl border border-default bg-surface p-4 shadow-sm flex flex-col gap-2 cursor-pointer transition hover:border-primary/50"
                  [style.borderLeftWidth]="'4px'"
                  [style.borderLeftColor]="acc.color || 'var(--color-primary)'"
                  (click)="openEditDialog(acc)"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-2 flex-wrap">
                      @if (acc.icon) {
                        <i [class]="acc.icon" class="text-xl text-secondary"></i>
                      }
                      <span class="font-semibold text-primary">{{ acc.name }}</span>
                      @if (getOwnerName(acc.owner_profile_id ?? null); as ownerName) {
                        <span class="text-xs px-2 py-0.5 rounded-full bg-subtle text-secondary">{{ ownerName }}</span>
                      }
                    </div>
                    <button
                      pButton
                      icon="pi pi-ellipsis-v"
                      [text]="true"
                      [rounded]="true"
                      severity="secondary"
                      (click)="openEditDialog(acc); $event.stopPropagation()"
                      appPressFeedback="press"
                    ></button>
                  </div>
                  <p class="text-sm text-secondary">
                    {{ getTypeLabel(acc.type) }}
                    @if (acc.card_last4) {
                      <span class="ml-1 font-mono text-muted">•••• {{ acc.card_last4 }}</span>
                    }
                  </p>
                  @if (acc.bank_name) {
                    <p class="text-xs text-secondary">{{ acc.bank_name }}</p>
                  }
                  <p class="text-xl font-bold tabular-nums text-primary mt-1">
                    {{ getBalance(acc.id) | number : '1.0-0' }} $
                  </p>
                </div>
                }
              </div>
            </section>
          }
        }

        @if (accounts().length === 0) {
          <app-empty-state
            message="No hay cuentas"
            subtitle="Crea tu primera cuenta para empezar a registrar transacciones"
            actionLabel="Nueva cuenta"
            (action)="openCreateDialog()"
          />
        }
      }

      <p-dialog
        [(visible)]="dialogVisible"
        [header]="editingAccount() ? 'Editar cuenta' : 'Nueva cuenta'"
        [modal]="true"
        appendTo="body"
        [style]="{ width: 'min(100%, 22rem)' }"
        [draggable]="false"
        [resizable]="false"
        (onHide)="resetForm()"
      >
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
          <div>
            <label for="name" class="text-sm font-medium text-primary block mb-2">Nombre</label>
            <input id="name" type="text" pInputText formControlName="name" class="w-full" placeholder="Ej: Cuenta Corriente BCI" />
            @if (form.get('name')?.invalid && form.get('name')?.touched) {
              <p class="text-error text-xs mt-1">El nombre es requerido</p>
            }
          </div>
          <div>
            <label for="type" class="text-sm font-medium text-primary block mb-2">Tipo</label>
            <p-select
              id="type"
              formControlName="type"
              [options]="accountTypeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Selecciona tipo"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div>
            <label for="owner" class="text-sm font-medium text-primary block mb-2">Dueño (opcional)</label>
            <p-select
              id="owner"
              formControlName="owner_profile_id"
              [options]="ownerOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="Compartida"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div>
            <label for="purpose" class="text-sm font-medium text-primary block mb-2">Propósito (opcional)</label>
            <p-select
              id="purpose"
              formControlName="purpose"
              [options]="purposeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Sin definir"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div>
            <label for="bank_name" class="text-sm font-medium text-primary block mb-2">Banco (opcional)</label>
            <input id="bank_name" type="text" pInputText formControlName="bank_name" class="w-full" placeholder="Ej: BCI, Banco Estado" />
          </div>
          <div>
            <label for="linked_email" class="text-sm font-medium text-primary block mb-2">Email vinculado (opcional)</label>
            <div class="flex gap-2">
              <input
                id="linked_email"
                type="email"
                pInputText
                formControlName="linked_email"
                class="flex-1"
                placeholder="Ej: mi.email&#64;gmail.com"
              />
              @if (connectedGmail()) {
                <button
                  pButton
                  type="button"
                  label="Usar mi Gmail"
                  severity="secondary"
                  [outlined]="true"
                  size="small"
                  (click)="fillLinkedEmailFromGmail()"
                  appPressFeedback="press"
                ></button>
              }
            </div>
            <p class="text-xs text-secondary mt-1">Email del Gmail que recibe transacciones. La cuenta se identifica por banco + email (varias cuentas pueden compartir el mismo email si son de distintos bancos).</p>
          </div>
          <div>
            <label for="initial_balance" class="text-sm font-medium text-primary block mb-2">Saldo inicial (CLP)</label>
            <p-inputNumber
              id="initial_balance"
              formControlName="initial_balance"
              mode="currency"
              currency="CLP"
              locale="es-CL"
              [minFractionDigits]="0"
              styleClass="w-full"
              inputStyleClass="w-full"
            />
          </div>
          @if (form.get('type')?.value === 'credit_card') {
            <div class="border-t border-default pt-4 mt-2 space-y-4">
              <p class="text-sm font-semibold text-primary">Datos de tarjeta de crédito</p>
              <div>
                <label for="credit_limit" class="text-sm font-medium text-primary block mb-2">Límite de crédito (CLP)</label>
                <p-inputNumber id="credit_limit" formControlName="credit_limit" mode="currency" currency="CLP" locale="es-CL" [minFractionDigits]="0" styleClass="w-full" inputStyleClass="w-full" />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="billing_cycle_day" class="text-sm font-medium text-primary block mb-2">Día de corte</label>
                  <p-inputNumber id="billing_cycle_day" formControlName="billing_cycle_day" [min]="1" [max]="31" styleClass="w-full" inputStyleClass="w-full" />
                </div>
                <div>
                  <label for="payment_due_day" class="text-sm font-medium text-primary block mb-2">Día de vencimiento</label>
                  <p-inputNumber id="payment_due_day" formControlName="payment_due_day" [min]="1" [max]="31" styleClass="w-full" inputStyleClass="w-full" />
                </div>
              </div>
              <div>
                <label for="current_statement_balance" class="text-sm font-medium text-primary block mb-2">Saldo estado de cuenta (CLP)</label>
                <p-inputNumber id="current_statement_balance" formControlName="current_statement_balance" mode="currency" currency="CLP" locale="es-CL" [minFractionDigits]="0" styleClass="w-full" inputStyleClass="w-full" />
              </div>
              <div>
                <label for="minimum_payment" class="text-sm font-medium text-primary block mb-2">Pago mínimo (CLP)</label>
                <p-inputNumber id="minimum_payment" formControlName="minimum_payment" mode="currency" currency="CLP" locale="es-CL" [minFractionDigits]="0" styleClass="w-full" inputStyleClass="w-full" />
              </div>
            </div>
          }
          <app-color-picker
            formControlName="color"
            label="Color (opcional)"
            inputId="color"
          />
        </form>
        <ng-template pTemplate="footer">
          @if (editingAccount()) {
            <button
              pButton
              label="Eliminar"
              severity="danger"
              [outlined]="true"
              (click)="onDelete()"
              appPressFeedback="press"
            ></button>
          }
          <span class="flex-1"></span>
          <button pButton label="Cancelar" severity="secondary" (click)="dialogVisible = false"></button>
          <button
            pButton
            label="Guardar"
            (click)="onSubmit()"
            [loading]="saving()"
            [disabled]="form.invalid"
            appPressFeedback="press"
          ></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
})
export class CuentasComponent implements OnInit, AfterViewInit {
  private auth = inject(AuthService);
  private accountService = inject(AccountService);
  private householdService = inject(HouseholdService);
  private creditCardDetailsService = inject(CreditCardDetailsService);
  private emailIntegrationService = inject(EmailIntegrationService);
  private gsap = inject(GsapAnimationsService);
  private confirmModal = inject(ConfirmModalService);
  private fb = inject(FormBuilder);

  containerRef = viewChild<ElementRef<HTMLElement>>('container');

  loading = signal(true);
  saving = signal(false);
  connectedGmail = signal<string | null>(null);
  accounts = signal<Account[]>([]);
  members = signal<{ id: string; display_name: string | null }[]>([]);
  balancesMap = signal<Map<string, number>>(new Map());
  dialogVisible = false;
  editingAccount = signal<Account | null>(null);

  accountTypeOptions = ACCOUNT_TYPES;
  purposeOptions = PURPOSE_OPTIONS;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    type: ['bank' as Account['type'], Validators.required],
    owner_profile_id: [null as string | null],
    purpose: ['' as string],
    bank_name: ['' as string],
    card_last4: ['' as string],
    linked_email: ['' as string],
    initial_balance: [0],
    color: [''],
    credit_limit: [0],
    billing_cycle_day: [1],
    payment_due_day: [10],
    current_statement_balance: [0],
    minimum_payment: [0],
  });

  ownerOptions = computed(() => {
    const list: OwnerOption[] = [{ label: 'Compartida (hogar)', value: null }];
    this.members().forEach((m) => list.push({ label: m.display_name || m.id.slice(0, 8), value: m.id }));
    return list;
  });

  accountsByPurpose = computed((): PurposeGroup[] => {
    const accs = this.accounts();
    const map = new Map<string | null, Account[]>();
    for (const acc of accs) {
      const key = acc.purpose?.trim() || null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(acc);
    }
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a.localeCompare(b);
    });
    return keys.map((key) => ({ key, accounts: map.get(key)! }));
  });

  totalBalance = computed(() => {
    let sum = 0;
    this.balancesMap().forEach((v) => (sum += v));
    return sum;
  });

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    const el = this.containerRef()?.nativeElement;
    if (el) this.gsap.animatePageEnter(el);
  }

  private async loadData(): Promise<void> {
    const user = this.auth.currentUser();
    const householdId = user?.householdId;
    if (!householdId) {
      this.loading.set(false);
      return;
    }
    const [accRes, balRes, membersRes, gmailRes] = await Promise.all([
      this.accountService.getAccounts(householdId, false),
      this.accountService.getBalancesForHousehold(householdId),
      this.householdService.getHouseholdMembers(householdId),
      user?.id ? this.emailIntegrationService.getGmailIntegration(user.id) : Promise.resolve({ data: null, error: null }),
    ]);
    if (gmailRes.data?.inbox_email) this.connectedGmail.set(gmailRes.data.inbox_email);
    this.loading.set(false);
    if (accRes.data.length) this.accounts.set(accRes.data);
    if (membersRes.data.length) this.members.set(membersRes.data);
    const map = new Map<string, number>();
    (balRes.data ?? []).forEach((b) => map.set(b.accountId, b.balance));
    this.balancesMap.set(map);
  }

  getPurposeLabel(purpose: string): string {
    return getPurposeLabel(purpose);
  }

  getOwnerName(profileId: string | null): string | null {
    if (!profileId) return null;
    const m = this.members().find((x) => x.id === profileId);
    return m?.display_name ?? null;
  }

  getBalance(accountId: string): number {
    return this.balancesMap().get(accountId) ?? 0;
  }

  getTypeLabel(type: Account['type']): string {
    return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
  }

  fillLinkedEmailFromGmail(): void {
    const email = this.connectedGmail();
    if (email) this.form.patchValue({ linked_email: email });
  }

  openCreateDialog(): void {
    this.editingAccount.set(null);
    this.form.reset({
      name: '',
      type: 'bank',
      owner_profile_id: null,
      purpose: '',
      bank_name: '',
      card_last4: '',
      linked_email: '',
      initial_balance: 0,
      color: '',
      credit_limit: 0,
      billing_cycle_day: 1,
      payment_due_day: 10,
      current_statement_balance: 0,
      minimum_payment: 0,
    });
    this.dialogVisible = true;
  }

  openEditDialog(acc: Account): void {
    this.editingAccount.set(acc);
    this.form.patchValue({
      name: acc.name,
      type: acc.type,
      owner_profile_id: acc.owner_profile_id ?? null,
      purpose: acc.purpose ?? '',
      bank_name: acc.bank_name ?? '',
      card_last4: acc.card_last4 ?? '',
      linked_email: acc.linked_email ?? '',
      initial_balance: acc.initial_balance,
      color: acc.color ?? '',
    });
    this.dialogVisible = true;
  }

  resetForm(): void {
    this.form.reset({
      name: '',
      type: 'bank',
      owner_profile_id: null,
      purpose: '',
      bank_name: '',
      card_last4: '',
      linked_email: '',
      initial_balance: 0,
      color: '',
      credit_limit: 0,
      billing_cycle_day: 1,
      payment_due_day: 10,
      current_statement_balance: 0,
      minimum_payment: 0,
    });
    this.editingAccount.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) return;

    const { name, type, owner_profile_id, purpose, bank_name, card_last4, linked_email, initial_balance, color } = this.form.getRawValue();
    const editing = this.editingAccount();
    const last4 = card_last4?.replace(/\D/g, '').slice(0, 4) || null;

    this.saving.set(true);
    if (editing) {
      const res = await this.accountService.updateAccount(editing.id, {
        name,
        type,
        owner_profile_id: owner_profile_id ?? null,
        purpose: purpose || null,
        bank_name: bank_name || null,
        card_last4: last4,
        linked_email: linked_email?.trim() || null,
        initial_balance: initial_balance ?? 0,
        color: color || null,
      });
      this.saving.set(false);
      if (res.error) return;
      if (type === 'credit_card') {
        const v = this.form.getRawValue();
        await this.creditCardDetailsService.upsert({
          accountId: editing.id,
          creditLimit: v.credit_limit ?? 0,
          billingCycleDay: v.billing_cycle_day ?? 1,
          paymentDueDay: v.payment_due_day ?? 10,
          currentStatementBalance: v.current_statement_balance ?? 0,
          minimumPayment: v.minimum_payment ?? 0,
        });
      }
      this.dialogVisible = false;
      await this.loadData();
      return;
    }
    const res = await this.accountService.createAccount({
      householdId,
      name,
      type,
      ownerProfileId: owner_profile_id ?? null,
      purpose: purpose || null,
      bankName: bank_name || null,
      cardLast4: last4,
      linkedEmail: linked_email?.trim() || null,
      initialBalance: initial_balance ?? 0,
      color: color || null,
    });
    this.saving.set(false);
    if (res.error) return;
    const accountId = res.data?.id;
    if (type === 'credit_card' && accountId) {
      const v = this.form.getRawValue();
      await this.creditCardDetailsService.upsert({
        accountId,
        creditLimit: v.credit_limit ?? 0,
        billingCycleDay: v.billing_cycle_day ?? 1,
        paymentDueDay: v.payment_due_day ?? 10,
        currentStatementBalance: v.current_statement_balance ?? 0,
        minimumPayment: v.minimum_payment ?? 0,
      });
    }
    this.dialogVisible = false;
    await this.loadData();
  }

  async onDelete(): Promise<void> {
    const acc = this.editingAccount();
    if (!acc) return;
    const confirmed = await this.confirmModal.confirm({
      title: 'Eliminar cuenta',
      message: `¿Eliminar la cuenta "${acc.name}"? Solo se puede eliminar si no tiene transacciones.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      severity: 'danger',
    });
    if (!confirmed) return;
    this.saving.set(true);
    const { error } = await this.accountService.deleteAccount(acc.id);
    this.saving.set(false);
    if (error) return;
    this.dialogVisible = false;
    await this.loadData();
  }
}
