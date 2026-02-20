import { Routes } from '@angular/router';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { householdGuard } from './core/guards/household.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [authGuard, householdGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'setup-hogar',
        loadComponent: () =>
          import('./features/setup-hogar/setup-hogar.component').then(
            (m) => m.SetupHogarComponent
          ),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'finanzas',
        loadChildren: () =>
          import('./features/finanzas/finanzas.routes').then((m) => m.FINANZAS_ROUTES),
      },
      {
        path: 'pagina-1',
        loadComponent: () =>
          import('./features/pagina-1/pagina-1.component').then((m) => m.Pagina1Component),
      },
      {
        path: 'pagina-2',
        loadComponent: () =>
          import('./features/pagina-2/pagina-2.component').then((m) => m.Pagina2Component),
      },
      {
        path: 'pagina-3',
        loadComponent: () =>
          import('./features/pagina-3/pagina-3.component').then((m) => m.Pagina3Component),
      },
      {
        path: 'pagina-4',
        loadComponent: () =>
          import('./features/pagina-4/pagina-4.component').then((m) => m.Pagina4Component),
      },
      {
        path: 'pagina-5',
        loadComponent: () =>
          import('./features/pagina-5/pagina-5.component').then((m) => m.Pagina5Component),
      },
      {
        path: 'pagina-6',
        loadComponent: () =>
          import('./features/pagina-6/pagina-6.component').then((m) => m.Pagina6Component),
      },
      {
        path: 'pagina-7',
        loadComponent: () =>
          import('./features/pagina-7/pagina-7.component').then((m) => m.Pagina7Component),
      },
      {
        path: 'configuracion',
        children: [
          { path: '', redirectTo: 'mi-hogar', pathMatch: 'full' },
          {
            path: 'mi-hogar',
            loadComponent: () =>
              import('./features/configuracion/mi-hogar/mi-hogar.component').then(
                (m) => m.MiHogarComponent
              ),
          },
        ],
      },
    ],
  },
];
