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
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { AuthService } from '@core/services/auth.service';
import { SavingsGoalService } from '@core/services/savings-goal.service';
import { AccountService } from '@core/services/account.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { ConfirmModalService } from '@core/services/confirm-modal.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import type { SavingsGoal, Account } from '@core/models/finance.model';

@Component({
  selector: 'app-metas-ahorro',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    DatePickerModule,
    SelectModule,
    PressFeedbackDirective,
    EmptyStateComponent,
  ],
  template: `
    <div #container class="flex flex-col gap-6 font-body pb-20">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold font-display text-primary">Metas de ahorro</h1>
          <p class="text-secondary text-lg">Objetivos con seguimiento visual</p>
        </div>
        <button
          pButton
          icon="pi pi-plus"
          label="Nueva meta"
          (click)="openForm(null)"
          appPressFeedback="press"
        ></button>
      </div>

      @if (loading()) {
        <div class="animate-pulse space-y-3">
          @for (i of [1,2,3]; track i) {
            <div class="h-32 bg-subtle rounded-xl"></div>
          }
        </div>
      } @else {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (goal of goals(); track goal.id) {
            <div
              class="rounded-xl border border-default bg-surface p-4 shadow-sm flex flex-col gap-3 cursor-pointer hover:border-primary/50 transition"
              (click)="openForm(goal)"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-2">
                  @if (goal.icon) {
                    <div
                      class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      [style.background]="(goal.color || '#6366f1') + '20'"
                      [style.color]="goal.color || '#6366f1'"
                    >
                      <i [class]="goal.icon" class="text-lg"></i>
                    </div>
                  } @else {
                    <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <i class="pi pi-bullseye text-primary text-lg"></i>
                    </div>
                  }
                  <div>
                    <h3 class="font-semibold text-primary">{{ goal.name }}</h3>
                    @if (goal.deadline) {
                      <p class="text-sm text-secondary">Hasta {{ goal.deadline | date : 'd/M/yyyy' }}</p>
                    }
                  </div>
                </div>
                <button
                  pButton
                  icon="pi pi-trash"
                  [text]="true"
                  [rounded]="true"
                  severity="danger"
                  (click)="deleteGoal(goal); $event.stopPropagation()"
                  appPressFeedback="press"
                ></button>
              </div>
              <div class="flex-1">
                <div
                  class="h-2 rounded-full bg-subtle overflow-hidden"
                  role="progressbar"
                  [attr.aria-valuenow]="progressPercent(goal)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div
                    class="h-full rounded-full transition-all"
                    [class.bg-state-success]="progressPercent(goal) >= 100"
                    [class.bg-primary]="progressPercent(goal) < 100"
                    [style.width.%]="minProgress(goal)"
                  ></div>
                </div>
                <p class="text-sm text-secondary mt-2">
                  {{ goal.current_amount | number : '1.0-0' }} $ / {{ goal.target_amount | number : '1.0-0' }} $
                  ({{ progressPercent(goal) | number : '1.0-0' }}%)
                </p>
              </div>
              @if (progressPercent(goal) >= 100) {
                <span class="text-state-success text-sm font-medium">¡Meta cumplida!</span>
              }
            </div>
          }
        </div>

        @if (goals().length === 0) {
          <app-empty-state
            message="Sin metas de ahorro"
            subtitle="Define objetivos y haz seguimiento de tu progreso"
            actionLabel="Crear meta"
            (action)="openForm(null)"
          />
        }
      }

      <p-dialog
        [(visible)]="formVisible"
        [header]="editingGoal() ? 'Editar meta' : 'Nueva meta de ahorro'"
        [modal]="true"
        appendTo="body"
        [style]="{ width: 'min(100%, 28rem)' }"
        [draggable]="false"
        [resizable]="false"
        (onHide)="closeForm()"
      >
        <form class="flex flex-col gap-4" (ngSubmit)="saveGoal()">
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Nombre *</label>
            <input type="text" pInputText [(ngModel)]="formName" name="name" class="w-full" placeholder="Ej: Vacaciones" required />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Monto objetivo ($) *</label>
            <p-inputNumber
              [(ngModel)]="formTargetAmount"
              name="targetAmount"
              mode="currency"
              currency="CLP"
              locale="es-CL"
              [min]="1"
              [minFractionDigits]="0"
              styleClass="w-full"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Ahorrado actual ($)</label>
            <p-inputNumber
              [(ngModel)]="formCurrentAmount"
              name="currentAmount"
              mode="currency"
              currency="CLP"
              locale="es-CL"
              [min]="0"
              [minFractionDigits]="0"
              styleClass="w-full"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Fecha límite</label>
            <p-datePicker
              [(ngModel)]="formDeadline"
              name="deadline"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              appendTo="body"
              styleClass="w-full"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-2">Cuenta vinculada</label>
            <p-select
              [(ngModel)]="formAccountId"
              name="accountId"
              [options]="accountOptions()"
              optionLabel="name"
              optionValue="id"
              placeholder="Ninguna"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
        </form>
        <ng-template pTemplate="footer">
          <button pButton label="Cancelar" severity="secondary" (click)="formVisible = false"></button>
          <button pButton label="Guardar" (click)="saveGoal()" [loading]="saving()" appPressFeedback="press"></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
})
export class MetasAhorroComponent implements OnInit, AfterViewInit {
  private messageService = inject(MessageService);
  private auth = inject(AuthService);
  private savingsGoalService = inject(SavingsGoalService);
  private accountService = inject(AccountService);
  private gsap = inject(GsapAnimationsService);
  private confirmModal = inject(ConfirmModalService);

  containerRef = viewChild<ElementRef<HTMLElement>>('container');

  loading = signal(true);
  saving = signal(false);
  goals = signal<SavingsGoal[]>([]);
  accounts = signal<Account[]>([]);
  formVisible = false;
  editingGoal = signal<SavingsGoal | null>(null);

  formName = '';
  formTargetAmount = 0;
  formCurrentAmount = 0;
  formDeadline: Date | null = null;
  formAccountId: string | null = null;

  accountOptions = computed(() => [
    { id: null, name: 'Ninguna' },
    ...this.accounts(),
  ]);

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    const el = this.containerRef()?.nativeElement;
    if (el) this.gsap.animatePageEnter(el);
  }

  progressPercent(goal: SavingsGoal): number {
    if (goal.target_amount <= 0) return 0;
    return (goal.current_amount / goal.target_amount) * 100;
  }

  minProgress(goal: SavingsGoal): number {
    return Math.min(100, this.progressPercent(goal));
  }

  private async loadData(): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) {
      this.loading.set(false);
      return;
    }
    const [goalsRes, accRes] = await Promise.all([
      this.savingsGoalService.getGoals(householdId),
      this.accountService.getAccounts(householdId, false),
    ]);
    if (goalsRes.data.length) this.goals.set(goalsRes.data);
    if (accRes.data.length) this.accounts.set(accRes.data);
    this.loading.set(false);
  }

  openForm(goal: SavingsGoal | null): void {
    this.editingGoal.set(goal);
    if (goal) {
      this.formName = goal.name;
      this.formTargetAmount = goal.target_amount;
      this.formCurrentAmount = goal.current_amount;
      this.formDeadline = goal.deadline ? new Date(goal.deadline) : null;
      this.formAccountId = goal.account_id ?? null;
    } else {
      this.formName = '';
      this.formTargetAmount = 0;
      this.formCurrentAmount = 0;
      this.formDeadline = null;
      this.formAccountId = null;
    }
    this.formVisible = true;
  }

  closeForm(): void {
    this.formVisible = false;
    this.editingGoal.set(null);
  }

  async saveGoal(): Promise<void> {
    if (!this.formName.trim() || this.formTargetAmount < 1) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Nombre y monto objetivo son obligatorios. El monto debe ser al menos 1 $.',
      });
      return;
    }
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) return;

    this.saving.set(true);
    const editing = this.editingGoal();
    const deadlineStr = this.formDeadline ? this.formDeadline.toISOString().slice(0, 10) : null;

    if (editing) {
      const res = await this.savingsGoalService.updateGoal(editing.id, {
        name: this.formName.trim(),
        targetAmount: this.formTargetAmount,
        currentAmount: this.formCurrentAmount,
        deadline: deadlineStr,
        accountId: this.formAccountId,
      });
      this.saving.set(false);
      if (res.error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error al guardar',
          detail: (res.error as { message?: string })?.message || 'No se pudo actualizar la meta',
        });
        return;
      }
      this.closeForm();
      await this.loadData();
    } else {
      const res = await this.savingsGoalService.createGoal({
        householdId,
        name: this.formName.trim(),
        targetAmount: this.formTargetAmount,
        currentAmount: this.formCurrentAmount,
        deadline: deadlineStr,
        accountId: this.formAccountId,
      });
      this.saving.set(false);
      if (res.error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error al guardar',
          detail: (res.error as { message?: string })?.message || 'No se pudo crear la meta',
        });
        return;
      }
      this.closeForm();
      await this.loadData();
    }
  }

  async deleteGoal(goal: SavingsGoal): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Eliminar meta',
      message: `¿Eliminar la meta "${goal.name}"?`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      severity: 'danger',
    });
    if (!confirmed) return;
    this.saving.set(true);
    const { error } = await this.savingsGoalService.deleteGoal(goal.id);
    this.saving.set(false);
    if (!error) await this.loadData();
  }
}
