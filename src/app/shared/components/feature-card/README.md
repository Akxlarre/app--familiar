# app-feature-card

Card genérica para bento-grid. Base del design system para dashboards y páginas.

## Propósito
Contenedor de contenido con header (título, badge, icono), body y footer opcional. Integrado con GSAP para animaciones de entrada en bento-grid.

## Inputs

| Input | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `title` | `string` | — | Título del card (requerido) |
| `badge` | `string` | — | Badge opcional junto al título |
| `size` | `'1x1' \| '2x1' \| '3x1' \| '4x1' \| '2x2' \| '3x2' \| 'hero'` | `'2x1'` | Tamaño en bento-grid |
| `accent` | `boolean` | `false` | Borde superior con color primario (máx. 1 por sección) |
| `tinted` | `boolean` | `false` | Fondo tintado (KPIs, stats) |
| `hasFooter` | `boolean` | `false` | Mostrar slot footer |
| `hasIcon` | `boolean` | `true` | Mostrar slot icon |
| `inGrid` | `boolean` | `false` | Dentro de bento-grid para animación GSAP |

## Slots

- `[slot=icon]` — Icono en el header (PrimeIcons)
- `[slot=footer]` — Contenido del footer
- Default — Body del card

## Cuándo usarlo
- Cualquier card en dashboards o páginas con bento-grid
- Contenido estructurado con título y opcional icono/badge

## Cuándo NO usarlo
- KPIs numéricos → `app-kpi-card`
- Desglose por categorías → `app-category-breakdown-card`
- Tablas → `app-data-table-card`

## Ejemplo

```html
<app-feature-card title="Resumen" size="2x2" [accent]="true">
  <ng-container slot="icon">
    <i class="pi pi-chart-bar"></i>
  </ng-container>
  <p>Contenido del card.</p>
  <ng-container slot="footer">
    <button>Ver más</button>
  </ng-container>
</app-feature-card>
```
