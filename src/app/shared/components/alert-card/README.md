# app-alert-card

Alertas con severidad (error, warning, info, success), dismissible y con acción opcional. UX/UI moderno 2026.

## Propósito

Mostrar mensajes de alerta con diseño consistente: leading accent, icono en contenedor, jerarquía clara. Tokens del design system.

## Diseño visual (UX/UI 2026)

- **Leading accent**: barra 4px en color de severidad (`--state-error`, `--state-warning`, etc.)
- **Fondo y borde**: `--state-*-bg`, `--state-*-border` por severidad
- **Icono**: contenedor 36×36px con `color-mix` 12% del color de severidad
- **Título**: `--text-primary` (severidad por accent e icono)
- **Acción**: pill con `--color-primary`, fondo sutil
- **Dismiss**: icono 28×28px, hover sutil

## Inputs

| Input | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `severity` | `'error' \| 'warning' \| 'info' \| 'success'` | `'info'` | Severidad |
| `title` | `string` | — | Título (requerido) |
| `actionLabel` | `string` | — | Etiqueta del botón de acción |
| `actionIcon` | `string` | — | Icono del botón (ej: `pi-external-link`) |
| `dismissible` | `boolean` | `false` | Mostrar botón X para cerrar |

## Outputs

| Output | Descripción |
|--------|-------------|
| `action` | Emitido al hacer clic en la acción |
| `dismissed` | Emitido al cerrar (botón X) |

## Ejemplo

```html
<app-alert-card
  severity="warning"
  title="12 Pagos pendientes"
  actionLabel="Ver detalles"
  actionIcon="pi-external-link"
  (action)="goToPayments()"
>
  Revisar cuentas por cobrar
</app-alert-card>

<app-alert-card
  severity="info"
  title="Aviso de prueba"
  [dismissible]="true"
  (dismissed)="dismissed.set(true)"
>
  Este aviso se puede cerrar con el botón X.
</app-alert-card>
```

## Cuándo usarlo

- Alertas en dashboards
- Avisos importantes en páginas
- Notificaciones inline

## Cuándo no usarlo

- Toasts (usar MessageService)
- Modales de confirmación (usar ConfirmModalService)
