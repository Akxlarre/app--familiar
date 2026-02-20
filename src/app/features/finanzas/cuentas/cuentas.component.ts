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
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import { ConfirmModalService } from '@core/services/confirm-modal.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import type { Account } from '@core/models/finance.model';

const ACCOUNT_TYPES: { label: string; value: Account['type'] }[] = [
  { label: 'Banco', value: 'bank' },
  { label: 'Efectivo', value: 'cash' },
  { label: 'Tarjeta de crédito', value: 'credit_card' },
  { label: 'Tarjeta de débito', value: 'debit_card' },
  { label: 'Ahorro', value: 'savings' },
];

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
          class="rounded-xl border-2 border-primary/30 bg-surface p-5 shadow-sm"
          [style.background]="'linear-gradient(135deg, var(--color-primary) 0%, transparent 60%)'"
        >
          <p class="text-secondary text-sm font-medium">Saldo total</p>
          <p class="text-2xl font-bold text-primary tabular-nums">
            {{ totalBalance() | number : '1.0-0' }} $
          </p>
        </section>

        <!-- Grid de cuentas -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (acc of accounts(); track acc.id) {
            <div
              class="rounded-xl border border-default bg-surface p-4 shadow-sm flex flex-col gap-2 cursor-pointer transition hover:border-primary/50"
              [style.borderLeftWidth]="'4px'"
              [style.borderLeftColor]="acc.color || 'var(--color-primary)'"
              (click)="openEditDialog(acc)"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-2">
                  @if (acc.icon) {
                    <i [class]="acc.icon" class="text-xl text-secondary"></i>
                  }
                  <span class="font-semibold text-primary">{{ acc.name }}</span>
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
              <p class="text-sm text-secondary">{{ getTypeLabel(acc.type) }}</p>
              <p class="text-xl font-bold tabular-nums text-primary mt-1">
                {{ getBalance(acc.id) | number : '1.0-0' }} $
              </p>
            </div>
          }
        </div>

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
          <div>
            <label for="color" class="text-sm font-medium text-primary block mb-2">Color (opcional)</label>
            <input id="color" type="text" pInputText formControlName="color" class="w-full" placeholder="#3B82F6" />
          </div>
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
  private gsap = inject(GsapAnimationsService);
  private confirmModal = inject(ConfirmModalService);
  private fb = inject(FormBuilder);

  containerRef = viewChild<ElementRef<HTMLElement>>('container');

  loading = signal(true);
  saving = signal(false);
  accounts = signal<Account[]>([]);
  balancesMap = signal<Map<string, number>>(new Map());
  dialogVisible = false;
  editingAccount = signal<Account | null>(null);

  accountTypeOptions = ACCOUNT_TYPES;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    type: ['bank' as Account['type'], Validators.required],
    initial_balance: [0],
    color: [''],
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
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) {
      this.loading.set(false);
      return;
    }
    const [accRes, balRes] = await Promise.all([
      this.accountService.getAccounts(householdId, false),
      this.accountService.getBalancesForHousehold(householdId),
    ]);
    this.loading.set(false);
    if (accRes.data.length) this.accounts.set(accRes.data);
    const map = new Map<string, number>();
    (balRes.data ?? []).forEach((b) => map.set(b.accountId, b.balance));
    this.balancesMap.set(map);
  }

  getBalance(accountId: string): number {
    return this.balancesMap().get(accountId) ?? 0;
  }

  getTypeLabel(type: Account['type']): string {
    return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
  }

  openCreateDialog(): void {
    this.editingAccount.set(null);
    this.form.reset({ name: '', type: 'bank', initial_balance: 0, color: '' });
    this.dialogVisible = true;
  }

  openEditDialog(acc: Account): void {
    this.editingAccount.set(acc);
    this.form.patchValue({
      name: acc.name,
      type: acc.type,
      initial_balance: acc.initial_balance,
      color: acc.color ?? '',
    });
    this.dialogVisible = true;
  }

  resetForm(): void {
    this.form.reset({ name: '', type: 'bank', initial_balance: 0, color: '' });
    this.editingAccount.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) return;

    const { name, type, initial_balance, color } = this.form.getRawValue();
    const editing = this.editingAccount();

    this.saving.set(true);
    if (editing) {
      const res = await this.accountService.updateAccount(editing.id, {
        name,
        type,
        initial_balance: initial_balance ?? 0,
        color: color || null,
      });
      this.saving.set(false);
      if (res.error) return;
      this.dialogVisible = false;
      await this.loadData();
      return;
    }
    const res = await this.accountService.createAccount({
      householdId,
      name,
      type,
      initialBalance: initial_balance ?? 0,
      color: color || null,
    });
    this.saving.set(false);
    if (res.error) return;
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
