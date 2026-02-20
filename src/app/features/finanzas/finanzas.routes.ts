import { Routes } from '@angular/router';

export const FINANZAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./finanzas-dashboard/finanzas-dashboard.component').then(
        (m) => m.FinanzasDashboardComponent
      ),
  },
  {
    path: 'transacciones',
    loadComponent: () =>
      import('./transacciones/transacciones.component').then(
        (m) => m.TransaccionesComponent
      ),
  },
  {
    path: 'presupuesto',
    loadComponent: () =>
      import('./presupuesto/presupuesto.component').then(
        (m) => m.PresupuestoComponent
      ),
  },
  {
    path: 'cuentas',
    loadComponent: () =>
      import('./cuentas/cuentas.component').then(
        (m) => m.CuentasComponent
      ),
  },
  {
    path: 'recurrentes',
    loadComponent: () =>
      import('./recurrentes/recurrentes.component').then(
        (m) => m.RecurrentesComponent
      ),
  },
  {
    path: 'reportes',
    loadComponent: () =>
      import('./reportes/reportes.component').then(
        (m) => m.ReportesComponent
      ),
  },
];
