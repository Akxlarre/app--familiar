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
        label: 'Inventario',
        items: [
          { label: 'Despensa', icon: 'pi pi-box', routerLink: '/app/inventario' },
          { label: 'Escanear boleta', icon: 'pi pi-camera', routerLink: '/app/inventario/escanear' },
          {
            label: 'Lista de compras',
            icon: 'pi pi-shopping-cart',
            routerLink: '/app/inventario/lista-compras',
          },
          { label: 'Precios', icon: 'pi pi-chart-line', routerLink: '/app/inventario/precios' },
          { label: 'Vencimientos', icon: 'pi pi-clock', routerLink: '/app/inventario/vencimientos' },
        ],
      },
      {
        label: 'Cuidado Físico',
        items: [
          { label: 'Dashboard', icon: 'pi pi-heart', routerLink: '/app/fitness' },
          { label: 'Iniciar sesión', icon: 'pi pi-play', routerLink: '/app/fitness/sesion' },
          { label: 'Rutinas', icon: 'pi pi-list-check', routerLink: '/app/fitness/rutinas' },
          { label: 'Ejercicios', icon: 'pi pi-bolt', routerLink: '/app/fitness/ejercicios' },
          { label: 'Historial', icon: 'pi pi-history', routerLink: '/app/fitness/historial' },
          { label: 'Mi cuerpo', icon: 'pi pi-chart-line', routerLink: '/app/fitness/cuerpo' },
          { label: 'Progreso', icon: 'pi pi-chart-bar', routerLink: '/app/fitness/progreso' },
        ],
      },
      {
        label: 'Nutrición',
        items: [
          { label: 'Dashboard', icon: 'pi pi-apple', routerLink: '/app/nutricion' },
          { label: 'Mi perfil', icon: 'pi pi-user', routerLink: '/app/nutricion/perfil' },
          { label: 'Registro del día', icon: 'pi pi-list', routerLink: '/app/nutricion/log' },
          { label: 'Comidas guardadas', icon: 'pi pi-bookmark', routerLink: '/app/nutricion/comidas-guardadas' },
          { label: 'Historial', icon: 'pi pi-chart-line', routerLink: '/app/nutricion/historial' },
        ],
      },
      {
        label: 'Comidas',
        items: [
          { label: 'Dashboard', icon: 'pi pi-utensils', routerLink: '/app/comidas' },
          { label: 'Recetario', icon: 'pi pi-book', routerLink: '/app/comidas/recetario' },
          { label: 'Planificador semanal', icon: 'pi pi-calendar', routerLink: '/app/comidas/planificador' },
          { label: 'Nutrición semanal', icon: 'pi pi-chart-pie', routerLink: '/app/comidas/nutricion' },
          { label: 'Lista de compras', icon: 'pi pi-shopping-cart', routerLink: '/app/comidas/lista-compras' },
        ],
      },
      {
        label: 'Sistema',
        items: [
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
