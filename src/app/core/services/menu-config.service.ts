import { Injectable, computed, inject } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { EmailTransactionLogService } from './email-transaction-log.service';

/**
 * MenuConfigService - Configuración del menú lateral
 *
 * Items genéricos para navegación. Los datos mostrados en cada ruta
 * dependen de SchoolService.currentSchool cuando se implementen features.
 *
 * @see src/app/core/layout/sidebar/ARCHITECTURE.md
 */
@Injectable({
  providedIn: 'root',
})
export class MenuConfigService {
  private emailLogService = inject(EmailTransactionLogService);

  readonly menuItems = computed<MenuItem[]>(() => {
    const pendingCount = this.emailLogService.pendingCount();
    return [
    {
      label: 'Inicio',
      items: [
        { label: 'Dashboard', icon: 'pi pi-home', routerLink: '/app/dashboard' },
        { label: 'Página 1', icon: 'pi pi-file', routerLink: '/app/pagina-1' },
      ],
    },
    {
      label: 'Finanzas',
      items: [
        { label: 'Resumen', icon: 'pi pi-chart-pie', routerLink: '/app/finanzas' },
        {
          label: 'Transacciones',
          icon: 'pi pi-list',
          routerLink: '/app/finanzas/transacciones',
          badge: pendingCount > 0 ? String(pendingCount) : undefined,
        },
        { label: 'Presupuesto', icon: 'pi pi-wallet', routerLink: '/app/finanzas/presupuesto' },
        { label: 'Mi cuenta', icon: 'pi pi-user', routerLink: '/app/finanzas/mi-cuenta' },
        { label: 'Cuentas', icon: 'pi pi-credit-card', routerLink: '/app/finanzas/cuentas' },
        { label: 'Deudas', icon: 'pi pi-calendar-minus', routerLink: '/app/finanzas/deudas' },
        { label: 'Recurrentes', icon: 'pi pi-refresh', routerLink: '/app/finanzas/recurrentes' },
        { label: 'Metas de ahorro', icon: 'pi pi-bullseye', routerLink: '/app/finanzas/metas-ahorro' },
        { label: 'Reportes', icon: 'pi pi-chart-bar', routerLink: '/app/finanzas/reportes' },
      ],
    },
    {
      label: 'Operación',
      items: [
        { label: 'Página 2', icon: 'pi pi-file', routerLink: '/app/pagina-2' },
        { label: 'Página 3', icon: 'pi pi-file', routerLink: '/app/pagina-3' },
      ],
    },
    {
      label: 'Alumnos',
      items: [
        { label: 'Página 4', icon: 'pi pi-file', routerLink: '/app/pagina-4' },
        { label: 'Página 5', icon: 'pi pi-file', routerLink: '/app/pagina-5' },
      ],
    },
    {
      label: 'Administración',
      items: [
        { label: 'Página 6', icon: 'pi pi-file', routerLink: '/app/pagina-6' },
        { label: 'Correos procesados', icon: 'pi pi-envelope', routerLink: '/app/pagina-7' },
      ],
    },
    {
      label: 'Configuración',
      items: [
        { label: 'Mi hogar', icon: 'pi pi-home', routerLink: '/app/configuracion/mi-hogar' },
        { label: 'Integración email', icon: 'pi pi-envelope', routerLink: '/app/configuracion/email' },
      ],
    },
  ];
  });
}
