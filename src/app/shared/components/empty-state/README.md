# app-empty-state

Estado vacío unificado para listas, búsquedas, notificaciones.

## Propósito

Mostrar un mensaje amigable cuando no hay datos: listas vacías, búsquedas sin resultados, notificaciones vacías.

## Inputs

| Input | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `message` | `string` | Sí | Mensaje principal |
| `subtitle` | `string` | No | Subtítulo opcional |
| `icon` | `string` | No | Icono PrimeIcons (default: `pi-inbox`) |
| `actionLabel` | `string` | No | Etiqueta del botón de acción |
| `actionIcon` | `string` | No | Icono del botón (default: `pi-plus`) |

## Outputs

| Output | Descripción |
|--------|-------------|
| `action` | Emitido al hacer clic en el botón de acción |

## Ejemplo

```html
<app-empty-state
  message="No hay resultados"
  subtitle="Prueba con otros términos de búsqueda"
  icon="pi-search"
  actionLabel="Limpiar filtros"
  (action)="clearFilters()"
/>
```

## Cuándo usarlo

- Listas vacías (tablas, cards)
- Búsquedas sin resultados
- Notificaciones vacías
- Estados "sin datos" en general

## Cuándo no usarlo

- Si el diseño requiere un layout muy específico (usar custom)
- Si hay un componente equivalente en PrimeNG que cubra el caso
