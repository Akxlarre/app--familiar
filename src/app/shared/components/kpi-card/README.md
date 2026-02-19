# app-kpi-card

KPI con contador animado, trend opcional e icono. Para métricas numéricas en bento-grid.

## Propósito
Mostrar un valor KPI (número) con animación de contador al entrar en viewport. Soporta trend (up/down), subtitle y valor formateado fijo.

## Inputs

| Input | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `data` | `KpiData` | — | Datos del KPI (requerido) |
| `size` | `'1x1' \| '2x1'` | `'1x1'` | Tamaño en bento-grid |

## KpiData

```ts
interface KpiData {
  id: string;
  label: string;
  value: number;
  suffix?: string;        // Para contador: '%', 'hrs'
  valueDisplay?: string;  // Si se define, desactiva animación: "$8.2M", "8/12"
  subtitle?: string;
  icon?: string;          // PrimeIcons: "pi pi-users"
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;    // "+12% vs mes anterior"
}
```

## Cuándo usarlo
- KPIs numéricos en dashboards (alumnos, ingresos, vehículos, etc.)
- Métricas con o sin trend

## Cuándo NO usarlo
- Cards con contenido libre → `app-feature-card`
- Desglose por categorías → `app-category-breakdown-card`

## Ejemplo

```html
<app-kpi-card [data]="{
  id: '1',
  label: 'Alumnos activos',
  value: 234,
  suffix: '',
  icon: 'pi pi-users',
  trend: 'up',
  trendValue: '+12%'
}" />
```
