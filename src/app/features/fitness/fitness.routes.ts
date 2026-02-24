import { Routes } from '@angular/router';

export const FITNESS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./fitness-dashboard/fitness-dashboard.component').then((m) => m.FitnessDashboardComponent),
  },
  {
    path: 'sesion',
    loadComponent: () =>
      import('./sesion/sesion.component').then((m) => m.SesionComponent),
  },
  {
    path: 'sesion/:id',
    loadComponent: () =>
      import('./sesion/sesion.component').then((m) => m.SesionComponent),
  },
  {
    path: 'rutinas',
    loadComponent: () =>
      import('./rutinas/rutinas.component').then((m) => m.RutinasComponent),
  },
  {
    path: 'rutinas/nueva',
    loadComponent: () =>
      import('./rutinas/rutina-form/rutina-form.component').then((m) => m.RutinaFormComponent),
  },
  {
    path: 'rutinas/:id',
    loadComponent: () =>
      import('./rutinas/rutina-form/rutina-form.component').then((m) => m.RutinaFormComponent),
  },
  {
    path: 'ejercicios',
    loadComponent: () =>
      import('./ejercicios/ejercicios.component').then((m) => m.EjerciciosComponent),
  },
  {
    path: 'historial',
    loadComponent: () =>
      import('./historial/historial.component').then((m) => m.HistorialComponent),
  },
  {
    path: 'historial/:id',
    loadComponent: () =>
      import('./historial/sesion-detalle/sesion-detalle.component').then((m) => m.SesionDetalleComponent),
  },
  {
    path: 'cuerpo',
    loadComponent: () =>
      import('./cuerpo/cuerpo.component').then((m) => m.CuerpoComponent),
  },
  {
    path: 'progreso',
    loadComponent: () =>
      import('./progreso/progreso.component').then((m) => m.ProgresoComponent),
  },
  {
    path: 'progreso/:exerciseId',
    loadComponent: () =>
      import('./progreso/progreso.component').then((m) => m.ProgresoComponent),
  },
];
