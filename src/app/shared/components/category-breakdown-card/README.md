# app-category-breakdown-card

Desglose por categorías con barras de progreso y montos. Para ingresos, gastos, distribución por tipo, etc.

## Propósito
Mostrar una lista de categorías con valor, porcentaje y barra visual. Incluye total y soporta filas clickeables.

## Inputs

| Input | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `title` | `string` | — | Título (requerido) |
| `items` | `CategoryBreakdownItem[]` | — | Datos (requerido) |
| `totalLabel` | `string` | `'Total'` | Etiqueta del total |
| `variant` | `'success' \| 'expense' \| 'primary' \| 'neutral'` | `'primary'` | Color de barras y montos |
| `size` | `CategoryBreakdownSize` | `'2x2'` | Tamaño en bento-grid |
| `accent` | `boolean` | `false` | Borde accent |
| `tinted` | `boolean` | `false` | Fondo tintado |
| `maxItems` | `number` | — | Limitar items visibles (resto → "Otros") |
| `showDetailLabel` | `boolean` | `true` | Mostrar "N operaciones" |
| `detailLabelSingular` | `string` | `'operación'` | |
| `detailLabelPlural` | `string` | `'operaciones'` | |
| `formatAmount` | `(v: number) => string` | CLP | Formateador de montos |
| `itemClickable` | `boolean` | `false` | Filas clickeables → emite `itemClick` |

## Outputs

| Output | Tipo | Descripción |
|--------|------|-------------|
| `itemClick` | `CategoryBreakdownItem` | Emitido al clicar una fila (si `itemClickable`) |

## CategoryBreakdownItem

```ts
{ id: '1', label: 'Clase B', value: 5040000, count: 18 }
```

## Cuándo usarlo
- Desglose de ingresos por categoría
- Distribución de gastos
- Cualquier breakdown con valor + porcentaje

## Cuándo NO usarlo
- Tabla con muchas columnas → `app-data-table-card`
- KPI único → `app-kpi-card`

## Ejemplo

```html
<app-category-breakdown-card
  title="Ingresos por categoría"
  [items]="items()"
  variant="success"
  [maxItems]="5"
/>
```
