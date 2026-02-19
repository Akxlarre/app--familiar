# app-data-table-card

Tabla dentro de card. Usa PrimeNG `p-table` con estilos del design system. Soporta paginación, ordenación, selección y empty state.

## Propósito
Mostrar datos tabulares en un card con bento-grid. Wrapper de p-table con configuración por columnas (tipos: text, badge, chip, progress, currency).

## Inputs principales

| Input | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `title` | `string` | — | Título del card (requerido) |
| `data` | `T[]` | — | Datos (requerido) |
| `columns` | `DataTableColumnConfig<T>[]` | — | Config de columnas (requerido) |
| `dataKey` | `string` | `'id'` | Clave única por fila |
| `size` | `'2x2' \| '3x2' \| 'hero'` | `'3x2'` | Tamaño en bento-grid |
| `paginator` | `boolean` | `false` | Paginación |
| `rows` | `number` | `10` | Filas por página |
| `sortable` | `boolean` | `false` | Ordenación por columnas |
| `selection` | `boolean` | `false` | Selección múltiple |
| `emptyConfig` | `DataTableEmptyConfig \| null` | `null` | Estado vacío (icono, mensaje, acción) |
| `totalRow` | `T \| null` | `null` | Fila de totales (tfoot) |

## Outputs

| Output | Tipo | Descripción |
|--------|------|-------------|
| `selectionChange` | `T[]` | Selección actualizada |
| `emptyAction` | `void` | Clic en botón del empty state |
| `pageChange` | `{ rows, first }` | Cambio de paginación |

## DataTableColumnConfig

- `field`, `header`, `sortable`, `cellClass`
- `cellType`: `'text' | 'badge' | 'badge-icon' | 'chip' | 'progress' | 'currency'`
- `badgeClassFn`, `badgeIconFn`, `currencyPrefix`, `currencyFormat`

## Cuándo usarlo
- Listas tabulares con muchas filas
- Datos que requieren paginación, ordenación o selección
- Tablas con tipos de celda (badge, progress, currency)

## Cuándo NO usarlo
- Desglose por categorías → `app-category-breakdown-card`
- KPIs → `app-kpi-card`
- Listas muy simples → considerar `app-feature-card` + lista

## Ejemplo

```html
<app-data-table-card
  title="Alumnos"
  [data]="students()"
  [columns]="columnConfig"
  [paginator]="true"
  [selection]="true"
  (selectionChange)="onSelection($event)"
/>
```
