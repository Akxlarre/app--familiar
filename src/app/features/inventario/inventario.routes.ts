import { Routes } from '@angular/router';

export const INVENTARIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./despensa/despensa-dashboard.component').then((m) => m.DespensaDashboardComponent),
  },
  {
    path: 'producto/:id',
    loadComponent: () =>
      import('./despensa/product-detail.component').then((m) => m.ProductDetailComponent),
  },
  {
    path: 'escanear',
    loadComponent: () =>
      import('./escaneo/escaneo-boleta.component').then((m) => m.EscaneoBoletaComponent),
  },
  {
    path: 'lista-compras',
    loadComponent: () =>
      import('./lista-compras/lista-compras.component').then((m) => m.ListaComprasComponent),
  },
  {
    path: 'precios',
    loadComponent: () =>
      import('./precios/historial-precios.component').then((m) => m.HistorialPreciosComponent),
  },
  {
    path: 'vencimientos',
    loadComponent: () =>
      import('./vencimientos/vencimientos.component').then((m) => m.VencimientosComponent),
  },
];

