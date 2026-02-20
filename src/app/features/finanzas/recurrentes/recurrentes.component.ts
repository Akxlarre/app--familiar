import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  viewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { AuthService } from '@core/services/auth.service';
import { RecurringService } from '@core/services/recurring.service';
import { AccountService } from '@core/services/account.service';
import { CategoryService } from '@core/services/category.service';
import { TransactionService } from '@core/services/transaction.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { ConfirmModalService } from '@core/services/confirm-modal.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import type { RecurringTransaction, RecurringFrequency } from '@core/models/finance.model';

const FREQUENCY_OPTIONS = [
  { label: 'Semanal', value: 'weekly' },
  { label: 'Quincenal', value: 'biweekly' },
  { label: 'Mensual', value: 'monthly' },
  { label: 'Anual', value: 'yearly' },
];

@Component({
  selector: 'app-recurrentes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TableModule,
    ToggleButtonModule,
    PressFeedbackDirective,
    EmptyStateComponent,
  ],
  template: `
    <div #container class="flex flex-col gap-6 font-body">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold font-display text-primary">Recurrentes</h1>
          <p class="text-secondary text-lg">Gastos e ingresos fijos programados</p>
        </div>
        <button
          pButton
          icon="pi pi-plus"
          label="Nuevo recurrente"
          (click)="openDialog(null)"
          appPressFeedback="press"
        ></button>
      </div>

      @if (loading()) {
        <div class="rounded-xl border border-default bg-surface p-8 shadow-sm animate-pulse">
          <div class="h-12 bg-subtle rounded w-full mb-4"></div>
          <div class="h-12 bg-subtle rounded w-full"></div>
        </div>
      } @else {
        <section class="rounded-xl border border-default bg-surface shadow-sm overflow-hidden">
          <p-table
            [value]="recurringList()"
            styleClass="p-datatable-sm p-datatable-striped"
            [tableStyle]="{ 'min-width': '40rem' }"
          >
            <ng-template pTemplate="header">
              <tr>
                <th>Descripción</th>
                <th>Tipo</th>
                <th class="text-right">Monto</th>
                <th>Frecuencia</th>
                <th>Próxima fecha</th>
                <th>Activo</th>
                <th style="width: 10rem"></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-r>
              <tr>
                <td class="font-medium">{{ r.description || r.category?.name || '—' }}</td>
                <td>{{ r.type === 'income' ? 'Ingreso' : 'Gasto' }}</td>
                <td class="text-right font-semibold">{{ r.amount | number : '1.0-0' }} $</td>
                <td>{{ getFrequencyLabel(r.frequency) }}</td>
                <td>{{ r.next_due_date | date : 'd/M/yyyy' }}</td>
                <td>
                  <p-toggleButton
                    [ngModel]="r.is_active"
                    (ngModelChange)="toggleActive(r, $event)"
                    onLabel="Sí"
                    offLabel="No"
                    [onIcon]="'pi pi-check'"
                    [offIcon]="'pi pi-times'"
                  />
                </td>
                <td>
                  <button
                    pButton
                    label="Registrar ahora"
                    size="small"
                    [outlined]="true"
                    (click)="registerNow(r)"
                    appPressFeedback="press"
                  ></button>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="7" class="text-center py-8">
                  <app-empty-state
                    message="No hay recurrentes"
                    subtitle="Crea gastos o ingresos que se repiten cada mes"
                    actionLabel="Nuevo recurrente"
                    (action)="openDialog(null)"
                  />
                </td>
              </tr>
            </ng-template>
          </p-table>
        </section>
      }

      <p-dialog
        [(visible)]="dialogVisible"
        [header]="editing() ? 'Editar recurrente' : 'Nuevo recurrente'"
        [modal]="true"
        appendTo="body"
        [style]="{ width: 'min(100%, 24rem)' }"
        [draggable]="false"
        [resizable]="false"
        (onHide)="resetForm()"
      >
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Tipo</label>
            <p-select
              formControlName="type"
              [options]="[{ label: 'Gasto', value: 'expense' }, { label: 'Ingreso', value: 'income' }]"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Descripción</label>
            <input type="text" pInputText formControlName="description" class="w-full" placeholder="Ej: Arriendo" />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Monto (CLP) *</label>
            <p-inputNumber
              formControlName="amount"
              mode="currency"
              currency="CLP"
              locale="es-CL"
              [minFractionDigits]="0"
              [min]="0.01"
              styleClass="w-full"
              inputStyleClass="w-full"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Cuenta *</label>
            <p-select
              formControlName="accountId"
              [options]="accounts()"
              optionLabel="name"
              optionValue="id"
              placeholder="Selecciona cuenta"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Categoría *</label>
            <p-select
              formControlName="categoryId"
              [options]="categoryOptions()"
              optionLabel="name"
              optionValue="id"
              placeholder="Selecciona categoría"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Frecuencia *</label>
            <p-select
              formControlName="frequency"
              [options]="frequencyOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Día del mes (1-31)</label>
            <p-inputNumber
              formControlName="dayOfMonth"
              [min]="1"
              [max]="31"
              [showButtons]="true"
              styleClass="w-full"
              inputStyleClass="w-full"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Próxima fecha *</label>
            <p-inputNumber
              formControlName="nextDueDay"
              [min]="1"
              [max]="31"
              placeholder="Día (1-31)"
              styleClass="w-full"
              inputStyleClass="w-full"
            />
          </div>
        </form>
        <ng-template pTemplate="footer">
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
export class RecurrentesComponent implements OnInit, AfterViewInit {
  private auth = inject(AuthService);
  private recurringService = inject(RecurringService);
  private accountService = inject(AccountService);
  private categoryService = inject(CategoryService);
  private transactionService = inject(TransactionService);
  private gsap = inject(GsapAnimationsService);
  private confirmModal = inject(ConfirmModalService);
  private fb = inject(FormBuilder);

  containerRef = viewChild<ElementRef<HTMLElement>>('container');

  loading = signal(true);
  saving = signal(false);
  recurringList = signal<RecurringTransaction[]>([]);
  accounts = signal<{ id: string; name: string }[]>([]);
  expenseCategories = signal<{ id: string; name: string }[]>([]);
  incomeCategories = signal<{ id: string; name: string }[]>([]);
  dialogVisible = false;
  editing = signal<RecurringTransaction | null>(null);

  frequencyOptions = FREQUENCY_OPTIONS;

  form = this.fb.nonNullable.group({
    type: ['expense' as 'income' | 'expense', Validators.required],
    description: [''],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    accountId: ['', Validators.required],
    categoryId: ['', Validators.required],
    frequency: ['monthly' as RecurringFrequency, Validators.required],
    dayOfMonth: [null as number | null],
    nextDueDay: [new Date().getDate(), Validators.required],
  });

  categoryOptions = () => {
    const type = this.form.get('type')?.value;
    if (type === 'income') return this.incomeCategories();
    return this.expenseCategories();
  };

  getFrequencyLabel(f: string): string {
    return FREQUENCY_OPTIONS.find((o) => o.value === f)?.label ?? f;
  }

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
    const [recRes, accRes, expRes, incRes] = await Promise.all([
      this.recurringService.getRecurring(householdId),
      this.accountService.getAccounts(householdId, false),
      this.categoryService.getCategories(householdId, 'expense'),
      this.categoryService.getCategories(householdId, 'income'),
    ]);
    this.loading.set(false);
    this.recurringList.set(recRes.data ?? []);
    this.accounts.set((accRes.data ?? []).map((a) => ({ id: a.id, name: a.name })));
    this.expenseCategories.set((expRes.data ?? []).map((c) => ({ id: c.id, name: c.name })));
    this.incomeCategories.set((incRes.data ?? []).map((c) => ({ id: c.id, name: c.name })));
  }

  openDialog(r: RecurringTransaction | null): void {
    this.editing.set(r);
    if (r) {
      const next = new Date(r.next_due_date);
      this.form.patchValue({
        type: r.type,
        description: r.description ?? '',
        amount: r.amount,
        accountId: r.account_id,
        categoryId: r.category_id,
        frequency: r.frequency,
        dayOfMonth: r.day_of_month,
        nextDueDay: next.getDate(),
      });
    } else {
      this.form.patchValue({
        type: 'expense',
        description: '',
        amount: 0,
        accountId: '',
        categoryId: '',
        frequency: 'monthly',
        dayOfMonth: new Date().getDate(),
        nextDueDay: new Date().getDate(),
      });
    }
    this.dialogVisible = true;
  }

  resetForm(): void {
    this.form.reset({
      type: 'expense',
      description: '',
      amount: 0,
      accountId: '',
      categoryId: '',
      frequency: 'monthly',
      dayOfMonth: null,
      nextDueDay: new Date().getDate(),
    });
    this.editing.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const householdId = this.auth.currentUser()?.householdId;
    const userId = this.auth.currentUser()?.id;
    if (!householdId || !userId) return;

    const v = this.form.getRawValue();
    const now = new Date();
    const nextDueDate = new Date(now.getFullYear(), now.getMonth(), v.nextDueDay ?? 1);
    if (nextDueDate < now) nextDueDate.setMonth(nextDueDate.getMonth() + 1);

    this.saving.set(true);
    const editing = this.editing();
    if (editing) {
      const res = await this.recurringService.updateRecurring(editing.id, {
        type: v.type,
        amount: v.amount ?? 0,
        description: v.description || null,
        account_id: v.accountId,
        category_id: v.categoryId,
        frequency: v.frequency,
        day_of_month: v.dayOfMonth,
        next_due_date: nextDueDate.toISOString().slice(0, 10),
      });
      this.saving.set(false);
      if (res.error) return;
      this.dialogVisible = false;
      await this.loadData();
      return;
    }
    const res = await this.recurringService.createRecurring({
      householdId,
      profileId: userId,
      accountId: v.accountId,
      categoryId: v.categoryId,
      type: v.type,
      amount: v.amount ?? 0,
      description: v.description || null,
      frequency: v.frequency,
      dayOfMonth: v.dayOfMonth,
      nextDueDate: nextDueDate.toISOString().slice(0, 10),
    });
    this.saving.set(false);
    if (res.error) return;
    this.dialogVisible = false;
    await this.loadData();
  }

  async toggleActive(r: RecurringTransaction, isActive: boolean): Promise<void> {
    const res = await this.recurringService.updateRecurring(r.id, { is_active: isActive });
    if (!res.error) await this.loadData();
  }

  async registerNow(r: RecurringTransaction): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    const userId = this.auth.currentUser()?.id;
    if (!householdId || !userId) return;
    const dateStr = r.next_due_date;
    this.saving.set(true);
    const txRes = await this.transactionService.createTransaction({
      householdId,
      profileId: userId,
      accountId: r.account_id,
      categoryId: r.category_id,
      type: r.type,
      amount: r.amount,
      date: dateStr,
      note: r.description ?? undefined,
      recurringId: r.id,
    });
    this.saving.set(false);
    if (txRes.error) return;
    const next = new Date(dateStr);
    next.setMonth(next.getMonth() + 1);
    await this.recurringService.updateRecurring(r.id, { next_due_date: next.toISOString().slice(0, 10) });
    await this.loadData();
  }
}
