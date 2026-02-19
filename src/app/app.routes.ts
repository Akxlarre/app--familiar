import { Routes } from '@angular/router';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'app',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
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
    ],
  },
];
