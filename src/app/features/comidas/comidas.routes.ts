import { Routes } from '@angular/router';

export const COMIDAS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./comidas-dashboard/comidas-dashboard.component').then(
                (m) => m.ComidasDashboardComponent
            ),
    },
    {
        path: 'recetario',
        loadComponent: () =>
            import('./recetario/recetario.component').then((m) => m.RecetarioComponent),
    },
    {
        // Ruta específica ANTES de :id para que no colisione
        path: 'recetario/nueva',
        loadComponent: () =>
            import('./recetario/receta-form.component').then((m) => m.RecetaFormComponent),
    },
    {
        path: 'recetario/:id',
        loadComponent: () =>
            import('./recetario/receta-detalle.component').then((m) => m.RecetaDetalleComponent),
    },
    {
        path: 'recetario/:id/editar',
        loadComponent: () =>
            import('./recetario/receta-form.component').then((m) => m.RecetaFormComponent),
    },
    {
        path: 'planificador',
        loadComponent: () =>
            import('./planificador/planificador.component').then((m) => m.PlanificadorComponent),
    },
    {
        path: 'lista-compras',
        loadComponent: () =>
            import('./lista-compras/lista-comidas.component').then(
                (m) => m.ListaComidasComponent
            ),
    },
    {
        path: 'nutricion',
        loadComponent: () =>
            import('./nutricion/nutricion-semanal.component').then(
                (m) => m.NutricionSemanalComponent
            ),
    },

];
