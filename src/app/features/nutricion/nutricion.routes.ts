import { Routes } from '@angular/router';

export const NUTRICION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./nutricion-dashboard/nutricion-dashboard.component').then(
        (m) => m.NutricionDashboardComponent
      ),
  },
  {
    path: 'perfil',
    loadComponent: () =>
      import('./perfil-nutricional/perfil-nutricional.component').then(
        (m) => m.PerfilNutricionalComponent
      ),
  },
  {
    path: 'log',
    loadComponent: () =>
      import('./food-log/food-log-diario.component').then(
        (m) => m.FoodLogDiarioComponent
      ),
  },
  {
    path: 'comidas-guardadas',
    loadComponent: () =>
      import('./comidas-guardadas/comidas-guardadas.component').then(
        (m) => m.ComidasGuardadasComponent
      ),
  },
  {
    path: 'historial',
    loadComponent: () =>
      import('./historial/historial-nutricion.component').then(
        (m) => m.HistorialNutricionComponent
      ),
  },
];
