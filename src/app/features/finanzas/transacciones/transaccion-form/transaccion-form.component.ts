import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  model,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import type { Transaction, Account, Category, Tag } from '@core/models/finance.model';
import type { HouseholdMember } from '@core/services/household.service';

export type TransactionFormType = 'expense' | 'income' | 'transfer';

@Component({
  selector: 'app-transaccion-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    MultiSelectModule,
    DatePickerModule,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit.emit()" class="flex flex-col gap-4">
      <div class="flex rounded-lg border border-default bg-elevated p-1">
        <button type="button" class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition" [class.bg-surface]="activeTabIndex() === 0" [class.text-primary]="activeTabIndex() === 0" [class.font-semibold]="activeTabIndex() === 0" [class.shadow-sm]="activeTabIndex() === 0" [class.text-secondary]="activeTabIndex() !== 0" (click)="onTabChange(0)">Gasto</button>
        <button type="button" class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition" [class.bg-surface]="activeTabIndex() === 1" [class.text-primary]="activeTabIndex() === 1" [class.font-semibold]="activeTabIndex() === 1" [class.shadow-sm]="activeTabIndex() === 1" [class.text-secondary]="activeTabIndex() !== 1" (click)="onTabChange(1)">Ingreso</button>
        <button type="button" class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition" [class.bg-surface]="activeTabIndex() === 2" [class.text-primary]="activeTabIndex() === 2" [class.font-semibold]="activeTabIndex() === 2" [class.shadow-sm]="activeTabIndex() === 2" [class.text-secondary]="activeTabIndex() !== 2" (click)="onTabChange(2)">Transferencia</button>
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
          inputStyleClass="w-full text-xl"
        />
        @if (form.get('amount')?.invalid && form.get('amount')?.touched) {
          <p class="text-error text-xs mt-1">Monto mayor a 0</p>
        }
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

      @if (currentType() !== 'transfer') {
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
            [scrollHeight]="'12rem'"
          />
        </div>
      }

      @if (currentType() === 'transfer') {
        <div>
          <label class="text-sm font-medium text-primary block mb-2">Cuenta destino *</label>
          <p-select
            formControlName="transferToAccountId"
            [options]="transferAccountOptions()"
            optionLabel="name"
            optionValue="id"
            placeholder="Selecciona cuenta destino"
            styleClass="w-full"
            appendTo="body"
          />
        </div>
      }

      <div>
        <label class="text-sm font-medium text-primary block mb-2">Fecha *</label>
        <p-datePicker
          formControlName="date"
          dateFormat="dd/mm/yy"
          [iconDisplay]="'input'"
          appendTo="body"
          styleClass="w-full"
          inputStyleClass="w-full"
        />
      </div>

      <div>
        <label class="text-sm font-medium text-primary block mb-2">Nota</label>
        <input type="text" pInputText formControlName="note" class="w-full" placeholder="Opcional" />
      </div>

      @if (currentType() === 'expense' && members().length > 1) {
        <div>
          <label class="text-sm font-medium text-primary block mb-2">Dividir entre miembros</label>
          <p class="text-xs text-secondary mb-2">Asigna montos a cada miembro (la suma debe ser {{ form.get('amount')?.value | number : '1.0-0' }} $)</p>
          <div class="space-y-2">
            @for (m of members(); track m.id) {
              <div class="flex items-center gap-2">
                <span class="min-w-24 text-sm">{{ m.display_name || 'Miembro' }}</span>
                <p-inputNumber
                  [ngModel]="getSplitAmount(m.id)"
                  (ngModelChange)="setSplitAmount(m.id, $event)"
                  [ngModelOptions]="{standalone: true}"
                  [min]="0"
                  [minFractionDigits]="0"
                  placeholder="0"
                  styleClass="flex-1"
                  inputStyleClass="text-sm"
                />
              </div>
            }
          </div>
          @if (splitError()) {
            <p class="text-error text-xs mt-1">{{ splitError() }}</p>
          }
        </div>
      }

      @if (tags().length > 0) {
        <div>
          <label class="text-sm font-medium text-primary block mb-2">Etiquetas</label>
          <p-multiselect
            [options]="tags()"
            [(ngModel)]="selectedTagIds"
            [ngModelOptions]="{standalone: true}"
            optionLabel="name"
            optionValue="id"
            placeholder="Seleccionar etiquetas"
            [showClear]="true"
            styleClass="w-full"
            appendTo="body"
          />
        </div>
      }

      <div class="flex items-center gap-2">
        <input
          #fileInput
          type="file"
          accept="image/*"
          class="hidden"
          (change)="onReceiptFile($event)"
        />
        <button
          pButton
          type="button"
          [label]="uploadingReceipt() ? 'Subiendo...' : 'Adjuntar boleta (opcional)'"
          icon="pi pi-camera"
          severity="secondary"
          [outlined]="true"
          [loading]="uploadingReceipt()"
          [disabled]="uploadingReceipt()"
          (click)="fileInput.click()"
        ></button>
        @if (receiptPreview()) {
          <span class="text-sm text-secondary">Boleta lista para vincular</span>
        }
      </div>
    </form>
  `,
})
export class TransaccionFormComponent implements OnInit {
  private fb = inject(FormBuilder);

  transaction = input<Transaction | null>(null);
  accounts = input<Account[]>([]);
  expenseCategories = input<Category[]>([]);
  incomeCategories = input<Category[]>([]);
  tags = input<Tag[]>([]);
  members = input<HouseholdMember[]>([]);
  initialTagIds = input<string[]>([]);
  initialSplits = input<{ profileId: string; amount: number }[]>([]);
  uploadingReceipt = input<boolean>(false);

  selectedTagIds = model<string[]>([]);

  submit = output<void>();
  typeChange = output<TransactionFormType>();
  receiptFile = output<File>();

  activeTabIndex = signal(0);
  receiptPreview = signal(false);
  splitAmounts = signal<Record<string, number>>({});

  currentType = computed<TransactionFormType>(() => {
    const i = this.activeTabIndex();
    return i === 0 ? 'expense' : i === 1 ? 'income' : 'transfer';
  });

  form = this.fb.nonNullable.group({
    amount: [0 as number, [Validators.required, Validators.min(0.01)]],
    accountId: ['', Validators.required],
    categoryId: ['', Validators.required],
    transferToAccountId: [''],
    date: [new Date(), Validators.required],
    note: [''],
  });

  categoryOptions = computed(() => {
    const t = this.currentType();
    if (t === 'expense') return this.expenseCategories();
    if (t === 'income') return this.incomeCategories();
    return [];
  });

  transferAccountOptions = computed(() => {
    const accId = this.form.get('accountId')?.value;
    return this.accounts().filter((a) => a.id !== accId);
  });

  splitError = computed(() => {
    if (this.currentType() !== 'expense') return null;
    const amt = this.form.get('amount')?.value ?? 0;
    const amounts = this.splitAmounts();
    const total = Object.values(amounts).reduce((s, v) => s + (Number(v) || 0), 0);
    if (total === 0) return null;
    if (Math.abs(total - amt) > 0.01) return `La suma (${total.toLocaleString()}) debe ser igual al monto (${amt.toLocaleString()})`;
    return null;
  });

  ngOnInit(): void {
    const tx = this.transaction();
    if (tx) {
      this.form.patchValue({
        amount: tx.amount,
        accountId: tx.account_id,
        categoryId: tx.category_id,
        transferToAccountId: tx.transfer_to_account_id ?? '',
        date: new Date(tx.date),
        note: tx.note ?? '',
      });
      if (tx.type === 'expense') this.activeTabIndex.set(0);
      else if (tx.type === 'income') this.activeTabIndex.set(1);
      else this.activeTabIndex.set(2);
      const cat = this.form.get('categoryId');
      if (tx.type === 'transfer') {
        cat?.clearValidators();
      } else {
        cat?.setValidators(Validators.required);
      }
      cat?.updateValueAndValidity();
    } else {
      this.form.patchValue({ date: new Date() });
    }
    this.selectedTagIds.set(this.initialTagIds());
    const splits = this.initialSplits();
    const amounts: Record<string, number> = {};
    for (const m of this.members()) amounts[m.id] = 0;
    for (const s of splits) amounts[s.profileId] = s.amount;
    this.splitAmounts.set(amounts);
  }

  getSplitAmount(profileId: string): number {
    return this.splitAmounts()[profileId] ?? 0;
  }

  setSplitAmount(profileId: string, value: number): void {
    this.splitAmounts.update((a) => ({ ...a, [profileId]: value ?? 0 }));
  }

  onTabChange(index: number): void {
    this.activeTabIndex.set(index);
    const t: TransactionFormType = index === 0 ? 'expense' : index === 1 ? 'income' : 'transfer';
    this.typeChange.emit(t);
    this.form.patchValue({ categoryId: '', transferToAccountId: '' });
    const cat = this.form.get('categoryId');
    if (t === 'transfer') {
      cat?.clearValidators();
      cat?.updateValueAndValidity();
    } else {
      cat?.setValidators(Validators.required);
      cat?.updateValueAndValidity();
    }
  }

  onReceiptFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.receiptFile.emit(file);
      this.receiptPreview.set(true);
    }
    input.value = '';
  }

  setAmountDateNote(amount: number, date: Date, note: string): void {
    this.form.patchValue({ amount, date, note });
  }

  getSplits(): { profileId: string; amount: number }[] {
    const amounts = this.splitAmounts();
    return Object.entries(amounts)
      .filter(([, v]) => (Number(v) || 0) > 0)
      .map(([profileId, amount]) => ({ profileId, amount: Number(amount) }));
  }

  getValue(): {
    type: TransactionFormType;
    amount: number;
    accountId: string;
    categoryId: string;
    transferToAccountId: string | null;
    date: Date;
    note: string;
  } {
    const type = this.currentType();
    const raw = this.form.getRawValue();
    const date = raw.date instanceof Date ? raw.date : new Date(raw.date);
    return {
      type,
      amount: raw.amount ?? 0,
      accountId: raw.accountId ?? '',
      categoryId: raw.categoryId ?? (type === 'transfer' ? '' : ''),
      transferToAccountId: type === 'transfer' && raw.transferToAccountId ? raw.transferToAccountId : null,
      date,
      note: raw.note ?? '',
    };
  }
}
