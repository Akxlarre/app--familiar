# Skeleton obligatorio para componentes

Cuando crees un **nuevo componente** en `shared/components/` que muestre datos o layout cargados de forma asíncrona:

## Regla

1. **Crear skeleton** — `{nombre}-skeleton.component.ts` colocado junto al componente.
2. **Actualizar COMPONENTS.md** — Añadir la fila del skeleton en la sección Skeletons.
3. **Exportar en index.ts** — Incluir el skeleton en el barrel export del componente.

## Componentes que requieren skeleton

| Tipo | Ejemplo | Skeleton |
|------|---------|----------|
| Layout de página | `app-page-header` | `app-page-header-skeleton` |
| Cards con datos | `app-kpi-card`, `app-feature-card` | Sí |
| Tablas | `app-data-table-card` | Sí |
| Desgloses | `app-category-breakdown-card` | Sí |

## Componentes que NO requieren skeleton

- Modales, toasts, overlays (aparecen/desaparecen)
- Botones, inputs aislados
- Componentes muy simples (empty-state, alert-card sin datos async)

## Convenciones (ver docs/SKELETON-ARCHITECTURE.md)

- Selector: `app-{componente}-skeleton`
- PrimeNG `p-skeleton` con `animation="wave"`
- Tokens del design system
- Host: `aria-busy="true"`, `aria-label="Cargando..."`
