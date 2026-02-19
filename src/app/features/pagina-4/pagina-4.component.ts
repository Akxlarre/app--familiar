import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ModalComponent, ModalFooterDirective } from '@shared/components/modal';
import { ModalOverlayDirective } from '@core/directives/modal-overlay.directive';
import { PageHeaderComponent, PageHeaderTrailingDirective } from '@shared/components/page-header';
import { ConfirmModalService } from '@core/services/confirm-modal.service';
import { AlertCardComponent } from '@shared/components/alert-card';
import { EmptyStateComponent } from '@shared/components/empty-state';
import { FileUploadComponent } from '@shared/components/file-upload';
import { GsapAnimationsService } from '@core/services/gsap-animations.service';

@Component({
  selector: 'app-pagina-4',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TabsModule,
    StepperModule,
    InputTextModule,
    ModalComponent,
    ModalFooterDirective,
    ModalOverlayDirective,
    PageHeaderComponent,
    PageHeaderTrailingDirective,
    AlertCardComponent,
    EmptyStateComponent,
    FileUploadComponent,
  ],
  template: `
    <div class="flex flex-col gap-6 font-body">
      <app-page-header title="Página 4" description="Categoría: Alumnos">
        <ng-container appPageHeaderTrailing>
          <button
            type="button"
            pButton
            label="Abrir modal"
            icon="pi pi-external-link"
            (click)="openModal()"
          ></button>
        </ng-container>
      </app-page-header>

      <div class="rounded-xl border border-default bg-surface p-6 shadow-sm">
        <h2 class="text-xl font-semibold font-display text-primary mb-3">AlertCards de ejemplo</h2>
        <p class="text-muted mb-4">
          Alertas con severidad (error, warning, info, success), dismissible y con acción.
        </p>
        <div class="flex flex-col gap-3 mb-6">
          <app-alert-card severity="error" title="3 Documentos vencidos">
            Vehículos requieren atención
          </app-alert-card>
          <app-alert-card severity="warning" title="12 Pagos pendientes">
            Revisar cuentas por cobrar
          </app-alert-card>
          <app-alert-card severity="info" title="Nueva funcionalidad disponible">
            Ya puedes exportar reportes en PDF.
          </app-alert-card>
          <app-alert-card severity="success" title="Matrícula completada">
            María González se registró correctamente en Clase B.
          </app-alert-card>
          @if (!dismissed()) {
            <app-alert-card
              severity="info"
              title="Aviso de prueba"
              [dismissible]="true"
              (dismissed)="dismissed.set(true)"
            >
              Este aviso se puede cerrar con el botón X.
            </app-alert-card>
          }
          <app-alert-card
            severity="warning"
            title="Examen pendiente"
            actionLabel="Ver detalles"
            actionIcon="pi-external-link"
            (action)="showToast('info')"
          >
            Juan Pérez tiene examen teórico programado para mañana.
          </app-alert-card>
        </div>
      </div>

      <div class="rounded-xl border border-default bg-surface p-6 shadow-sm">
        <h2 class="text-xl font-semibold font-display text-primary mb-3">EmptyState de ejemplo</h2>
        <p class="text-muted mb-4">
          Estado vacío para listas, búsquedas sin resultados, etc.
        </p>
        <app-empty-state
          message="No hay alumnos registrados"
          subtitle="Añade el primer alumno para comenzar"
          icon="pi-users"
          actionLabel="Nuevo alumno"
          actionIcon="pi-plus"
          (action)="showToast('info')"
        />
      </div>

      <div class="rounded-xl border border-default bg-surface p-6 shadow-sm">
        <h2 class="text-xl font-semibold font-display text-primary mb-3">FileUpload de ejemplo</h2>
        <p class="text-muted mb-4">
          Subida de archivos con drag & drop, límites y tipos aceptados.
        </p>
        <p-tabs value="0">
          <p-tablist>
            <p-tab value="0">Básico</p-tab>
            <p-tab value="1">Solo imágenes</p-tab>
            <p-tab value="2">Solo PDF</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="0">
              <app-file-upload
                chooseLabel="Elegir archivos"
                (filesChange)="uploadedFiles.set($event)"
              />
              @if (uploadedFiles().length > 0) {
                <p class="text-sm text-muted mt-2">{{ uploadedFiles().length }} archivo(s) seleccionado(s)</p>
              }
            </p-tabpanel>
            <p-tabpanel value="1">
              <app-file-upload
                accept="image/*"
                [maxFiles]="3"
                [maxFileSize]="2097152"
                chooseLabel="Subir fotos"
                (filesChange)="uploadedFiles.set($event)"
              />
            </p-tabpanel>
            <p-tabpanel value="2">
              <app-file-upload
                accept=".pdf"
                [multiple]="false"
                chooseLabel="Adjuntar PDF"
                (filesChange)="uploadedFiles.set($event)"
              />
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </div>

      <div class="rounded-xl border border-default bg-surface p-6 shadow-sm">
        <h2 class="text-xl font-semibold font-display text-primary mb-3">Stepper de ejemplo</h2>
        <p class="text-muted mb-4">
          Flujo tipo wizard con progreso visual, modo lineal y microinteracciones GSAP.
        </p>
        <div
          #stepperContainer
          class="stepper-premium max-w-2xl"
          [class.stepper-premium--step-1]="stepperStep() === 1"
          [class.stepper-premium--step-2]="stepperStep() === 2"
          [class.stepper-premium--step-3]="stepperStep() === 3"
        >
          <p-stepper
            [value]="stepperStep()"
            (valueChange)="onStepperStepChange($event)"
            [linear]="true"
            class="w-full"
          >
            <p-step-list>
              <p-step [value]="1">Datos personales</p-step>
              <p-step [value]="2">Contacto</p-step>
              <p-step [value]="3">Confirmación</p-step>
            </p-step-list>
            <p-step-panels>
              <p-step-panel [value]="1">
                <ng-template #content let-activateCallback="activateCallback">
                  <div class="stepper-step-content flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-3">
                      <label class="text-sm font-medium text-primary">Nombre completo</label>
                      <input
                        pInputText
                        [(ngModel)]="stepperForm.nombre"
                        placeholder="Ej: Juan Pérez"
                        class="w-full"
                      />
                    </div>
                    <div class="flex flex-col gap-3">
                      <label class="text-sm font-medium text-primary">DNI / RUT</label>
                      <input
                        pInputText
                        [(ngModel)]="stepperForm.dni"
                        placeholder="Ej: 12.345.678-9"
                        class="w-full"
                      />
                    </div>
                    <div class="flex justify-end">
                      <button
                        type="button"
                        pButton
                        label="Siguiente"
                        icon="pi pi-arrow-right"
                        iconPos="right"
                        (click)="activateCallback(2)"
                      ></button>
                    </div>
                  </div>
                </ng-template>
              </p-step-panel>
              <p-step-panel [value]="2">
                <ng-template #content let-activateCallback="activateCallback">
                  <div class="stepper-step-content flex flex-col gap-4 py-4">
                    <div class="flex flex-col gap-3">
                      <label class="text-sm font-medium text-primary">Email</label>
                      <input
                        pInputText
                        [(ngModel)]="stepperForm.email"
                        type="email"
                        placeholder="correo&#64;ejemplo.com"
                        class="w-full"
                      />
                    </div>
                    <div class="flex flex-col gap-3">
                      <label class="text-sm font-medium text-primary">Teléfono</label>
                      <input
                        pInputText
                        [(ngModel)]="stepperForm.telefono"
                        placeholder="+56 9 1234 5678"
                        class="w-full"
                      />
                    </div>
                    <div class="flex justify-between">
                      <button
                        type="button"
                        pButton
                        label="Atrás"
                        severity="secondary"
                        icon="pi pi-arrow-left"
                        (click)="activateCallback(1)"
                      ></button>
                      <button
                        type="button"
                        pButton
                        label="Siguiente"
                        icon="pi pi-arrow-right"
                        iconPos="right"
                        (click)="activateCallback(3)"
                      ></button>
                    </div>
                  </div>
                </ng-template>
              </p-step-panel>
              <p-step-panel [value]="3">
                <ng-template #content let-activateCallback="activateCallback">
                  <div class="stepper-step-content flex flex-col gap-4 py-4">
                    <div class="rounded-lg border border-default bg-elevated p-4 space-y-2">
                      <p class="text-sm text-muted">Resumen de los datos ingresados:</p>
                      <p class="text-primary"><strong>Nombre:</strong> {{ stepperForm.nombre || '—' }}</p>
                      <p class="text-primary"><strong>DNI:</strong> {{ stepperForm.dni || '—' }}</p>
                      <p class="text-primary"><strong>Email:</strong> {{ stepperForm.email || '—' }}</p>
                      <p class="text-primary"><strong>Teléfono:</strong> {{ stepperForm.telefono || '—' }}</p>
                    </div>
                    <div class="flex justify-between">
                      <button
                        type="button"
                        pButton
                        label="Atrás"
                        severity="secondary"
                        icon="pi pi-arrow-left"
                        iconPos="right"
                        (click)="activateCallback(2)"
                      ></button>
                      <button
                        type="button"
                        pButton
                        label="Confirmar"
                        icon="pi pi-check"
                        severity="success"
                        (click)="onStepperConfirm()"
                      ></button>
                    </div>
                  </div>
                </ng-template>
              </p-step-panel>
            </p-step-panels>
          </p-stepper>
        </div>
      </div>

      <div class="rounded-xl border border-default bg-surface p-6 shadow-sm">
        <h2 class="text-xl font-semibold font-display text-primary mb-3">Confirmaciones de ejemplo</h2>
        <p class="text-muted mb-4">
          Botones para probar ConfirmModalService (eliminar, guardar, confirmar pago, advertencia).
        </p>
        <div class="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            pButton
            label="Eliminar alumno"
            icon="pi pi-trash"
            severity="danger"
            (click)="confirmDelete()"
          ></button>
          <button
            type="button"
            pButton
            label="Guardar cambios"
            icon="pi pi-check"
            severity="success"
            (click)="confirmSave()"
          ></button>
          <button
            type="button"
            pButton
            label="Confirmar pago"
            icon="pi pi-credit-card"
            severity="info"
            (click)="confirmPayment()"
          ></button>
          <button
            type="button"
            pButton
            label="Advertencia"
            icon="pi pi-exclamation-triangle"
            severity="warn"
            (click)="confirmWarning()"
          ></button>
        </div>
      </div>

      <div class="rounded-xl border border-default bg-surface p-6 shadow-sm">
        <h2 class="text-xl font-semibold font-display text-primary mb-3">Toasts de ejemplo</h2>
        <p class="text-muted mb-4">
          Botones para probar cada tipo de toast (success, error, warning, info).
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            pButton
            label="Success"
            icon="pi pi-check"
            severity="success"
            (click)="showToast('success')"
          ></button>
          <button
            type="button"
            pButton
            label="Error"
            icon="pi pi-times"
            severity="danger"
            (click)="showToast('error')"
          ></button>
          <button
            type="button"
            pButton
            label="Warning"
            icon="pi pi-exclamation-triangle"
            severity="warn"
            (click)="showToast('warn')"
          ></button>
          <button
            type="button"
            pButton
            label="Info"
            icon="pi pi-info-circle"
            severity="info"
            (click)="showToast('info')"
          ></button>
        </div>
      </div>
    </div>

    <app-modal
      [appModalOverlay]="isModalOpen()"
      [isOpen]="isModalOpen()"
      (closed)="isModalOpen.set(false)"
      title="Ejemplo de modal"
    >
      <p class="text-secondary">
        Este es el contenido del modal. Puedes cerrarlo con el botón X, la tecla Escape
        o haciendo clic fuera del diálogo.
      </p>
      <ng-container appModalFooter>
        <button pButton label="Cerrar" (click)="isModalOpen.set(false)"></button>
      </ng-container>
    </app-modal>
  `,
})
export class Pagina4Component implements AfterViewInit {
  @ViewChild('stepperContainer') stepperContainer?: ElementRef<HTMLElement>;

  private messageService = inject(MessageService);
  private gsap = inject(GsapAnimationsService);
  private confirmModal = inject(ConfirmModalService);

  isModalOpen = signal(false);
  dismissed = signal(false);
  uploadedFiles = signal<File[]>([]);
  stepperStep = signal<number>(1);
  stepperForm = {
    nombre: '',
    dni: '',
    email: '',
    telefono: '',
  };

  onStepperStepChange(step: number | undefined): void {
    const next = step ?? 1;
    this.stepperStep.set(next);
    setTimeout(() => {
      const content = this.stepperContainer?.nativeElement?.querySelector(
        '.p-steppanel[data-p-active="true"] .stepper-step-content'
      ) as HTMLElement;
      if (content) this.gsap.animateStepperPanelIn(content);
    }, 50);
  }

  onStepperConfirm(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Registro completado',
      detail: `Bienvenido, ${this.stepperForm.nombre || 'usuario'}. Los datos se han guardado correctamente.`,
    });
    this.stepperStep.set(1);
    this.stepperForm = { nombre: '', dni: '', email: '', telefono: '' };
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const content = this.stepperContainer?.nativeElement?.querySelector(
        '.p-steppanel[data-p-active="true"] .stepper-step-content'
      ) as HTMLElement;
      if (content) this.gsap.animateStepperPanelIn(content);
    }, 100);
  }

  openModal(): void {
    this.isModalOpen.set(true);
  }

  async confirmDelete(): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Eliminar alumno',
      message: '¿Estás seguro? Esta acción no se puede deshacer.',
      severity: 'danger',
      confirmLabel: 'Eliminar',
    });
    this.messageService.add({
      severity: confirmed ? 'success' : 'info',
      summary: confirmed ? 'Eliminado' : 'Cancelado',
      detail: confirmed ? 'El alumno ha sido eliminado.' : 'Operación cancelada.',
    });
  }

  async confirmSave(): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Guardar cambios',
      message: '¿Deseas guardar los cambios realizados?',
      severity: 'success',
      confirmLabel: 'Guardar',
    });
    this.messageService.add({
      severity: confirmed ? 'success' : 'info',
      summary: confirmed ? 'Guardado' : 'Cancelado',
      detail: confirmed ? 'Los cambios se han guardado correctamente.' : 'No se guardaron cambios.',
    });
  }

  async confirmPayment(): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Confirmar pago',
      message: '¿Confirmas el pago de $45.000 por matrícula?',
      severity: 'info',
      confirmLabel: 'Confirmar pago',
    });
    this.messageService.add({
      severity: confirmed ? 'success' : 'info',
      summary: confirmed ? 'Pago confirmado' : 'Cancelado',
      detail: confirmed ? 'El pago se ha registrado correctamente.' : 'El pago fue cancelado.',
    });
  }

  async confirmWarning(): Promise<void> {
    const confirmed = await this.confirmModal.confirm({
      title: 'Advertencia',
      message: 'Esta acción puede afectar a otros registros. ¿Continuar?',
      severity: 'warn',
      confirmLabel: 'Continuar',
    });
    this.messageService.add({
      severity: confirmed ? 'warn' : 'info',
      summary: confirmed ? 'Procediendo' : 'Cancelado',
      detail: confirmed ? 'Se ha aplicado la acción.' : 'Operación cancelada.',
    });
  }

  showToast(severity: 'success' | 'error' | 'warn' | 'info'): void {
    const config: Record<string, { summary: string; detail: string }> = {
      success: { summary: 'Éxito', detail: 'Operación completada correctamente.' },
      error: { summary: 'Error', detail: 'Ha ocurrido un error. Inténtalo de nuevo.' },
      warn: { summary: 'Advertencia', detail: 'Revisa los datos antes de continuar.' },
      info: { summary: 'Información', detail: 'Mensaje informativo de ejemplo.' },
    };
    const { summary, detail } = config[severity];
    this.messageService.add({ severity, summary, detail });
  }
}
