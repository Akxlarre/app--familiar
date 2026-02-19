# Breadcrumb — Arquitectura

## Responsabilidad

Mostrar la jerarquía de navegación hasta la página actual. Fuente única de verdad: **MenuConfigService**.

## BreadcrumbService

- **Ubicación:** `src/app/core/services/breadcrumb.service.ts`
- **Dependencias:** `Router`, `MenuConfigService`
- **Salida:** `breadcrumb` (computed) → `{ home: MenuItem, items: MenuItem[] }`

### Reglas

| Regla | Descripción |
|-------|-------------|
| Sin duplicados | Home = Inicio; items no repiten "Inicio" |
| Jerarquía | Home (raíz) > Categoría > Página actual |
| Último item | Sin `routerLink` (página actual, no clicable) |
| Items intermedios | Con `routerLink` al primer item de la categoría |
| Reactivo | Se actualiza en cada `NavigationEnd` |

### Ejemplos

| Ruta | Breadcrumb |
|------|------------|
| `/pagina-1` | Inicio > Página 1 |
| `/pagina-2` | Inicio > Operación > Página 2 |
| `/pagina-4` | Inicio > Alumnos > Página 4 |

## Estilos (Design System)

- Tokens: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--font-medium)`, `var(--font-semibold)`, `var(--text-sm)`, `var(--text-xs)`
- Último item: `font-weight: var(--font-semibold)`, `color: var(--text-primary)`
- Separadores: `color: var(--text-muted)`
