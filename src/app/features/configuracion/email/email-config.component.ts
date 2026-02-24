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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AuthService } from '@core/services/auth.service';
import { AccountService } from '@core/services/account.service';
import { EmailIntegrationService } from '@core/services/email-integration.service';
import { BankEmailParserService } from '@core/services/bank-email-parser.service';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';
import { ConfirmModalService } from '@core/services/confirm-modal.service';
import { PressFeedbackDirective } from '@core/directives/press-feedback.directive';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import type { BankEmailParser, BankEmailType } from '@core/models/finance.model';
import { environment } from '../../../../../environments/environment';

const EMAIL_TYPE_OPTIONS: { label: string; value: BankEmailType }[] = [
  { label: 'Alerta de compra', value: 'purchase_alert' },
  { label: 'Estado de cuenta', value: 'statement' },
  { label: 'Confirmación de pago', value: 'payment_confirmation' },
  { label: 'Pago recibido', value: 'payment_received' },
  { label: 'Aviso de cuota', value: 'installment_notice' },
];

@Component({
  selector: 'app-email-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    ToggleSwitchModule,
    PressFeedbackDirective,
    EmptyStateComponent,
  ],
  template: `
    <div #container class="flex flex-col gap-6 font-body pb-20">
      <div>
        <h1 class="text-3xl font-bold font-display text-primary">Integración email</h1>
        <p class="text-secondary text-lg">Conecta Gmail para importar transacciones bancarias</p>
      </div>

      <!-- Gmail -->
      <section class="rounded-xl border border-default bg-surface p-6 shadow-sm">
        <h2 class="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
          <i class="pi pi-envelope text-primary"></i>
          Gmail
        </h2>
        @if (!hasGoogleClientId) {
          <p class="text-warning mb-4">
            Configura <code class="bg-subtle px-1 rounded">googleClientId</code> en el environment para habilitar la conexión.
          </p>
        }
        @if (gmailLoading()) {
          <div class="animate-pulse h-16 bg-subtle rounded-lg"></div>
        } @else if (gmailError()) {
          <p class="text-error">{{ gmailError() }}</p>
        } @else if (gmailIntegration()) {
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="font-medium text-primary">Gmail conectado</p>
              @if (gmailIntegration()!.last_error) {
                <p class="text-sm text-error mt-1">{{ gmailIntegration()!.last_error }}</p>
              }
            </div>
            <div class="flex gap-2">
              <button
                pButton
                icon="pi pi-refresh"
                label="Sincronizar ahora"
                severity="secondary"
                [outlined]="true"
                [loading]="syncing()"
                (click)="syncNow()"
                appPressFeedback="press"
              ></button>
              <button
                pButton
                label="Desconectar"
                severity="danger"
                [outlined]="true"
                [loading]="disconnecting()"
                (click)="disconnectGmail()"
                appPressFeedback="press"
              ></button>
            </div>
          </div>
        } @else {
          <div class="flex flex-wrap items-center justify-between gap-4">
            <p class="text-secondary">Conecta tu cuenta de Gmail para importar correos bancarios automáticamente.</p>
            <button
              pButton
              icon="pi pi-google"
              label="Conectar Gmail"
              [disabled]="!hasGoogleClientId"
              (click)="connectGmail()"
              appPressFeedback="press"
            ></button>
          </div>
        }
      </section>

      <!-- Parsers de banco -->
      <section class="rounded-xl border border-default bg-surface p-6 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4 mb-2">
          <h2 class="text-xl font-semibold text-primary flex items-center gap-2">
            <i class="pi pi-building text-primary"></i>
            Parsers por banco
          </h2>
          <button
            pButton
            icon="pi pi-plus"
            label="Nuevo banco"
            severity="secondary"
            [outlined]="true"
            (click)="openParserDialog(null, null)"
            appPressFeedback="press"
          ></button>
        </div>
        <p class="text-secondary text-sm mb-5">
          Cada banco puede tener varios parsers (alerta de compra, estado de cuenta, etc.). Define reglas para extraer monto, comercio y tarjeta.
        </p>
        @if (parsersLoading()) {
          <div class="animate-pulse space-y-4">
            @for (i of [1,2,3]; track i) {
              <div class="h-24 bg-subtle rounded-xl"></div>
            }
          </div>
        } @else if (parsersByBank().length === 0) {
          <app-empty-state
            message="No hay parsers configurados"
            subtitle="Añade un parser para empezar a importar transacciones desde el correo"
            actionLabel="Nuevo parser"
            (action)="openParserDialog(null, null)"
          />
        } @else {
          <div class="flex flex-col gap-5">
            @for (group of parsersByBank(); track group.bankName) {
              <div class="parser-bank-card rounded-xl border border-default bg-elevated overflow-hidden">
                <div class="parser-bank-header px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-subtle/50 border-b border-default">
                  <h3 class="font-semibold text-primary flex items-center gap-2">
                    <i class="pi pi-credit-card text-muted"></i>
                    {{ group.bankName }}
                  </h3>
                  <button
                    pButton
                    icon="pi pi-plus"
                    label="Añadir parser"
                    size="small"
                    severity="secondary"
                    [text]="true"
                    (click)="openParserDialog(null, group.bankName)"
                    appPressFeedback="press"
                  ></button>
                </div>
                <div class="parser-bank-body divide-y divide-default">
                  @for (p of group.parsers; track p.id) {
                    <div class="parser-row px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-subtle/30 transition-colors">
                      <div class="flex flex-col gap-1 min-w-0">
                        <span class="parser-type-badge inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit" [attr.data-type]="p.email_type">
                          {{ getEmailTypeLabel(p.email_type) }}
                        </span>
                        <p class="text-sm text-secondary truncate" [title]="p.sender_pattern">{{ p.sender_pattern }}</p>
                      </div>
                      <div class="flex items-center gap-3 shrink-0">
                        <div class="flex items-center gap-2">
                          <p-toggleSwitch
                            [(ngModel)]="p.is_active"
                            inputId="active-{{ p.id }}"
                            (ngModelChange)="toggleParserActive(p)"
                          ></p-toggleSwitch>
                          <label [for]="'active-' + p.id" class="text-xs text-muted cursor-pointer">Activo</label>
                        </div>
                        <div class="flex gap-1">
                          <button
                            pButton
                            icon="pi pi-pencil"
                            [text]="true"
                            [rounded]="true"
                            size="small"
                            severity="secondary"
                            (click)="openParserDialog(p, null)"
                            appPressFeedback="press"
                            aria-label="Editar"
                          ></button>
                          <button
                            pButton
                            icon="pi pi-trash"
                            [text]="true"
                            [rounded]="true"
                            size="small"
                            severity="danger"
                            (click)="deleteParser(p)"
                            appPressFeedback="press"
                            aria-label="Eliminar"
                          ></button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </section>

      <!-- Dialog parser -->
      <p-dialog
        [(visible)]="parserDialogVisible"
        [header]="editingParser() ? 'Editar parser' : 'Nuevo parser'"
        [modal]="true"
        appendTo="body"
        [style]="{ width: 'min(100%, 28rem)' }"
        [draggable]="false"
        [resizable]="false"
        (onHide)="closeParserDialog()"
      >
        <form [formGroup]="parserForm" class="flex flex-col gap-4">
          <div>
            <label class="text-sm font-medium text-primary block mb-1">Nombre del banco *</label>
            <input pInputText formControlName="bankName" placeholder="ej. BCI, Banco Estado" class="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-1">Patrón remitente *</label>
            <input pInputText formControlName="senderPattern" placeholder="ej. alertas@bci.cl" class="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-1">Patrón asunto (opcional)</label>
            <input pInputText formControlName="subjectPattern" placeholder="regex para filtrar asunto" class="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-1">Tipo de email *</label>
            <p-select
              formControlName="emailType"
              [options]="emailTypeOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full"
              appendTo="body"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-1">Regex monto *</label>
            <input pInputText formControlName="amountRegex" placeholder="ej. (\\d{1,3}(?:\\.\\d{3})*)" class="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-1">Regex comercio (opcional)</label>
            <input pInputText formControlName="merchantRegex" placeholder="regex para comercio" class="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium text-primary block mb-1">Cuenta por defecto (opcional)</label>
            <p-select
              formControlName="defaultAccountId"
              [options]="accountOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccionar cuenta"
              styleClass="w-full"
              appendTo="body"
              [showClear]="true"
            />
            <p class="text-xs text-secondary mt-1">Si el matching por banco+email falla, se usará esta cuenta. Útil cuando el reproceso sigue pendiente.</p>
          </div>
          <p class="text-xs text-muted break-words">La cuenta se enlaza por <strong>banco + email</strong>: en Finanzas → Cuentas usa el mismo <strong>Nombre del banco</strong> de aquí y el <strong>Email vinculado</strong> (tu Gmail). O asigna <strong>Cuenta por defecto</strong> arriba.</p>
        </form>
        <ng-template pTemplate="footer">
          <button pButton label="Cancelar" severity="secondary" (click)="parserDialogVisible = false"></button>
          <button
            pButton
            label="Guardar"
            (click)="saveParser()"
            [loading]="savingParser()"
            [disabled]="parserForm.invalid"
            appPressFeedback="press"
          ></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .parser-type-badge {
      background: var(--bg-subtle);
      color: var(--text-secondary);
    }
    .parser-type-badge[data-type="purchase_alert"] { background: var(--state-info-bg); color: var(--state-info); }
    .parser-type-badge[data-type="statement"] { background: var(--bg-elevated); color: var(--text-primary); }
    .parser-type-badge[data-type="payment_confirmation"],
    .parser-type-badge[data-type="payment_received"] { background: var(--state-success-bg); color: var(--state-success); }
    .parser-type-badge[data-type="installment_notice"] { background: var(--state-warning-bg); color: var(--state-warning); }
  `],
})
export class EmailConfigComponent implements OnInit, AfterViewInit {
  private auth = inject(AuthService);
  private accountService = inject(AccountService);
  private emailIntegration = inject(EmailIntegrationService);
  private parserService = inject(BankEmailParserService);
  private route = inject(ActivatedRoute);
  private gsap = inject(GsapAnimationsService);
  private confirmModal = inject(ConfirmModalService);
  private fb = inject(FormBuilder);

  containerRef = viewChild<ElementRef<HTMLElement>>('container');

  hasGoogleClientId = !!((environment as { googleClientId?: string }).googleClientId);
  emailTypeOptions = EMAIL_TYPE_OPTIONS;

  gmailLoading = signal(true);
  gmailError = signal<string | null>(null);
  gmailIntegration = signal<{ id: string; last_error: string | null } | null>(null);
  disconnecting = signal(false);
  syncing = signal(false);

  parsersLoading = signal(true);
  parsers = signal<BankEmailParser[]>([]);
  accountsForDialog = signal<{ id: string; name: string; bank_name: string | null }[]>([]);
  parserDialogVisible = false;
  editingParser = signal<BankEmailParser | null>(null);
  savingParser = signal(false);

  accountOptions = computed(() => {
    const accs = this.accountsForDialog();
    return [
      { label: '— Sin cuenta por defecto —', value: null },
      ...accs.map((a) => ({
        label: a.bank_name ? `${a.name} (${a.bank_name})` : a.name,
        value: a.id,
      })),
    ];
  });

  /** Parsers agrupados por banco (bank_name). */
  parsersByBank = computed(() => {
    const list = this.parsers();
    const map = new Map<string, BankEmailParser[]>();
    for (const p of list) {
      const key = p.bank_name.trim() || 'Sin nombre';
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bankName, parsers]) => ({ bankName, parsers }));
  });

  parserForm = this.fb.group({
    bankName: ['', Validators.required],
    senderPattern: ['', Validators.required],
    subjectPattern: [''],
    emailType: ['purchase_alert' as BankEmailType, Validators.required],
    amountRegex: ['', Validators.required],
    merchantRegex: [''],
    defaultAccountId: [null as string | null],
  });

  ngOnInit(): void {
    this.handleOAuthCallback();
    this.loadData();
  }

  ngAfterViewInit(): void {
    const el = this.containerRef()?.nativeElement;
    if (el) this.gsap.animatePageEnter(el);
  }

  private async handleOAuthCallback(): Promise<void> {
    const params = this.route.snapshot.queryParams;
    const code = params['code'] as string | undefined;
    if (!code) return;

    const { error } = await this.emailIntegration.completeGmailConnect(code);
    if (error) {
      this.gmailError.set(error.message);
    }
    window.history.replaceState({}, '', '/app/configuracion/email');
    this.loadGmailStatus();
  }

  private async loadData(): Promise<void> {
    await this.loadGmailStatus();
    await this.loadParsers();
  }

  private async loadGmailStatus(): Promise<void> {
    const profileId = this.auth.currentUser()?.id;
    if (!profileId) {
      this.gmailLoading.set(false);
      return;
    }
    this.gmailLoading.set(true);
    this.gmailError.set(null);
    const { data, error } = await this.emailIntegration.getGmailIntegration(profileId);
    this.gmailLoading.set(false);
    if (error) this.gmailError.set(error.message ?? 'Error al cargar');
    else this.gmailIntegration.set(data);
  }

  private async loadParsers(): Promise<void> {
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) {
      this.parsersLoading.set(false);
      return;
    }
    this.parsersLoading.set(true);
    const { data, error } = await this.parserService.getParsers(householdId);
    this.parsersLoading.set(false);
    if (!error && data) this.parsers.set(data);
  }

  connectGmail(): void {
    this.emailIntegration.connectGmail();
  }

  async syncNow(): Promise<void> {
    this.syncing.set(true);
    this.gmailError.set(null);
    const { data, error } = await this.emailIntegration.processBankEmails();
    this.syncing.set(false);
    if (error) {
      this.gmailError.set(error.message);
      return;
    }
    await this.loadGmailStatus();
  }

  async disconnectGmail(): Promise<void> {
    const profileId = this.auth.currentUser()?.id;
    if (!profileId) return;
    const ok = await this.confirmModal.confirm({ title: '¿Desconectar Gmail?', message: 'Dejarás de importar correos automáticamente.' });
    if (!ok) return;
    this.disconnecting.set(true);
    const { error } = await this.emailIntegration.disconnectGmail(profileId);
    this.disconnecting.set(false);
    if (error) this.gmailError.set(error.message);
    else {
      this.gmailIntegration.set(null);
      this.gmailError.set(null);
    }
  }

  getEmailTypeLabel(type: BankEmailType): string {
    return EMAIL_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
  }

  async openParserDialog(parser: BankEmailParser | null, prefillBank: string | null): Promise<void> {
    this.editingParser.set(parser);
    const householdId = this.auth.currentUser()?.householdId;
    if (householdId) {
      const { data } = await this.accountService.getAccounts(householdId, true);
      this.accountsForDialog.set(
        (data ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          bank_name: a.bank_name ?? null,
        }))
      );
    }
    const bankName = parser?.bank_name ?? prefillBank ?? '';
    this.parserForm.reset({
      bankName,
      senderPattern: parser?.sender_pattern ?? '',
      subjectPattern: parser?.subject_pattern ?? '',
      emailType: parser?.email_type ?? 'purchase_alert',
      amountRegex: parser?.body_rules?.['amount_regex'] ?? '',
      merchantRegex: parser?.body_rules?.['merchant_regex'] ?? '',
      defaultAccountId: parser?.default_account_id ?? null,
    });
    this.parserDialogVisible = true;
  }

  closeParserDialog(): void {
    this.parserDialogVisible = false;
    this.editingParser.set(null);
  }

  async saveParser(): Promise<void> {
    if (this.parserForm.invalid) return;
    const householdId = this.auth.currentUser()?.householdId;
    if (!householdId) return;

    const v = this.parserForm.getRawValue();
    const bodyRules: Record<string, string> = {};
    if (v.amountRegex) bodyRules['amount_regex'] = v.amountRegex;
    if (v.merchantRegex) bodyRules['merchant_regex'] = v.merchantRegex;

    this.savingParser.set(true);
    const editing = this.editingParser();
    if (editing) {
      const { error } = await this.parserService.updateParser(editing.id, {
        bank_name: v.bankName ?? '',
        sender_pattern: v.senderPattern ?? '',
        subject_pattern: v.subjectPattern || null,
        body_rules: bodyRules,
        email_type: (v.emailType as BankEmailType) ?? 'purchase_alert',
        default_account_id: v.defaultAccountId || null,
      });
      this.savingParser.set(false);
      if (!error) {
        this.closeParserDialog();
        this.loadParsers();
      }
    } else {
      const { error } = await this.parserService.createParser({
        householdId,
        bankName: v.bankName ?? '',
        senderPattern: v.senderPattern ?? '',
        subjectPattern: v.subjectPattern || null,
        bodyRules,
        emailType: (v.emailType as BankEmailType) ?? 'purchase_alert',
        defaultAccountId: v.defaultAccountId || null,
      });
      this.savingParser.set(false);
      if (!error) {
        this.closeParserDialog();
        this.loadParsers();
      }
    }
  }

  async toggleParserActive(parser: BankEmailParser): Promise<void> {
    const { error } = await this.parserService.updateParser(parser.id, { is_active: parser.is_active });
    if (error) await this.loadParsers();
  }

  async deleteParser(parser: BankEmailParser): Promise<void> {
    const ok = await this.confirmModal.confirm({ title: 'Eliminar parser', message: `¿Eliminar el parser de ${parser.bank_name}?` });
    if (!ok) return;
    const { error } = await this.parserService.deleteParser(parser.id);
    if (!error) this.loadParsers();
  }
}
