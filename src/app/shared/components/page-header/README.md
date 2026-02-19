# app-page-header

Cabecera de página con título, descripción, parent link opcional, slot leading y trailing. Alineado con design system (capas, profundidad).

## Propósito

Encabezado consistente para páginas con título, descripción opcional, enlace "volver", icono leading y botones/acciones a la derecha.

## Diseño visual (Design System)

- **Contenedor**: `--bg-surface`, `--border-default`, `--shadow-sm`, `--radius-xl`, `--space-6` padding
- **Parent link**: icono `pi-arrow-left`, `:focus-visible` con `--shadow-focus`
- **Leading**: contenedor 40×40px con `--color-primary-muted`, `--radius-md`
- **Tipografía**: título con `letter-spacing: -0.02em`, descripción con `margin-top: var(--space-3)`
- **Responsive**: trailing en mobile con `border-top` y `padding-top` para separar acciones

## Inputs

| Input | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `title` | `string` | Sí | Título de la página |
| `description` | `string` | No | Descripción debajo del título |
| `parentHref` | `string` | No | Ruta del enlace "volver" (ej: `/alumnos`) |
| `parentLabel` | `string` | No | Etiqueta del parent link (default: 'Volver') |
| `hasLeading` | `boolean` | No | Si hay contenido en el slot leading |
| `titleId` | `string` | No | ID del h1 para accesibilidad (default: 'page-title') |

## Slots

| Slot | Directiva | Descripción |
|------|-----------|-------------|
| Leading | `appPageHeaderLeading` | Icono o contenido a la izquierda del título |
| Trailing | `appPageHeaderTrailing` | Contenido a la derecha (botones, etc.) |

## Skeleton

Usar `app-page-header-skeleton` durante la carga de datos.

## Ejemplo

```html
<app-page-header title="Página 4" description="Categoría: Alumnos">
  <ng-container appPageHeaderTrailing>
    <button pButton label="Abrir modal" icon="pi pi-external-link" (click)="openModal()"></button>
  </ng-container>
</app-page-header>
```

## Cuándo usarlo

- Cabecera de cada página/ruta
- Cuando necesitas título + descripción + acciones

## Cuándo no usarlo

- Si el layout es muy diferente (dashboard, landing)
- Si solo necesitas un título simple sin acciones
