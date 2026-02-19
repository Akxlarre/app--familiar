# Índice de componentes compartidos

> **Regla**: Al añadir un componente nuevo a `shared/components/`, actualizar este archivo y crear su README.md.

## Cards y KPIs (Design System)

| Componente | Propósito | Doc |
|------------|-----------|-----|
| `app-feature-card` | Card genérica para bento-grid (hero, 2x1, 2x2, etc.) | [README.md](feature-card/README.md) |
| `app-kpi-card` | KPI con contador animado, trend, icono | [README.md](kpi-card/README.md) |
| `app-category-breakdown-card` | Desglose por categorías con barras de progreso | [README.md](category-breakdown-card/README.md) |
| `app-data-table-card` | Tabla dentro de card (usa PrimeNG p-table) | [README.md](data-table-card/README.md) |

## Skeletons

| Componente | Propósito | Doc |
|------------|-----------|-----|
| `app-page-content-skeleton` | Skeleton genérico (simple o bento) | — |
| `app-page-header-skeleton` | Skeleton de page-header | [page-header/](page-header/) |
| `app-kpi-card-skeleton` | Skeleton de kpi-card | — |
| `app-category-breakdown-card-skeleton` | Skeleton de category-breakdown | — |
| `app-data-table-card-skeleton` | Skeleton de data-table-card | — |

## Overlays

| Componente | Propósito | Doc |
|------------|-----------|-----|
| `app-modal` | Modal centrado con backdrop, animaciones GSAP | [README.md](modal/README.md) |
| `app-confirm-modal` | Host del modal de confirmación (usa ConfirmModalService) | [README.md](confirm-modal/README.md) |

## Alertas

| Componente | Propósito | Doc |
|------------|-----------|-----|
| `app-alert-card` | Alertas con severidad (error, warning, info, success) | [README.md](alert-card/README.md) |

## Estados vacíos

| Componente | Propósito | Doc |
|------------|-----------|-----|
| `app-empty-state` | Estado vacío unificado (listas, búsquedas, notificaciones) | [README.md](empty-state/README.md) |

## Formularios

| Componente | Propósito | Doc |
|------------|-----------|-----|
| `app-file-upload` | Subida de archivos (wrapper PrimeNG, design system) | [README.md](file-upload/README.md) |

## Layout

| Componente | Propósito | Doc |
|------------|-----------|-----|
| `app-page-header` | Cabecera de página con título, descripción y slot trailing | [README.md](page-header/README.md) |

## Otros

| Componente | Propósito | Doc |
|------------|-----------|-----|
| `app-table-gallery` | Galería de variantes de data-table-card | — |

---

## Jerarquía de uso

1. **Componentes de este índice** → Usar siempre si cubren el caso.
2. **PrimeNG** → Para inputs, botones, diálogos, etc. sin equivalente propio.
3. **Custom nuevo** → Solo cuando no exista ni uno ni otro.
