# MenuConfigService

## Propósito

Configuración del menú lateral. Provee los items de navegación como `MenuItem[]` (PrimeNG). Los datos mostrados en cada ruta dependerán de `SchoolService.currentSchool` cuando se implementen las features.

## API pública

| Miembro | Tipo | Descripción |
|---------|------|-------------|
| `menuItems` | `ComputedSignal<MenuItem[]>` | Items del menú agrupados por categoría |

## Estructura

- Grupos con `label` (ej. "Inicio", "Operación", "Alumnos")
- Cada grupo tiene `items` con `label`, `icon`, `routerLink`

## Cuándo usarlo

- Sidebar para renderizar el menú
- BreadcrumbService (fuente de verdad para rutas)
- Cualquier componente que necesite la estructura de navegación

## Cuándo no usarlo

- Para breadcrumb derivado → `BreadcrumbService`
- Para la escuela activa → `SchoolService`

## Dependencias

- `MenuItem` de PrimeNG
- Ver `src/app/core/layout/sidebar/ARCHITECTURE.md`
