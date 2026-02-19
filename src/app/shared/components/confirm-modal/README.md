# ConfirmModalService + app-confirm-modal

Patrón reutilizable para confirmaciones (eliminar, guardar cambios, confirmar pago, etc.). API imperativa vía servicio.

## Propósito

Centralizar las confirmaciones en un único modal montado en el layout. Permite llamadas imperativas desde componentes, guards o servicios sin repetir el template en cada pantalla.

## Uso

```typescript
// En cualquier componente o servicio
private confirmModal = inject(ConfirmModalService);

async eliminarAlumno(): Promise<void> {
  const confirmed = await this.confirmModal.confirm({
    title: 'Eliminar alumno',
    message: '¿Estás seguro? Esta acción no se puede deshacer.',
    severity: 'danger',
    confirmLabel: 'Eliminar',
  });
  if (confirmed) {
    // ejecutar eliminación
  }
}
```

## API

### ConfirmModalService.confirm(config)

| Propiedad | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `title` | `string` | — | Título del modal |
| `message` | `string` | — | Mensaje de confirmación |
| `severity` | `'danger' \| 'warn' \| 'success' \| 'info' \| 'secondary'` | `'secondary'` | Estilo del botón de confirmar |
| `confirmLabel` | `string` | `'Aceptar'` | Texto del botón confirmar |
| `cancelLabel` | `string` | `'Cancelar'` | Texto del botón cancelar |

**Retorna:** `Promise<boolean>` — `true` si el usuario confirma, `false` si cancela o cierra.

## app-confirm-modal

Componente host que debe estar montado una sola vez en el layout (por ejemplo en `MainLayoutComponent`). No hace falta importarlo en cada página.

## Cuándo usarlo

- Eliminar registros
- Guardar cambios antes de salir
- Confirmar pagos o transacciones
- Advertencias que requieren confirmación explícita

## Cuándo NO usarlo

- Errores o avisos informativos → toast o alert-card
- Formularios con múltiples campos → app-modal con contenido custom

## Dependencias

- `ModalComponent`, `ModalFooterDirective`
- `ModalOverlayDirective`
- `GsapAnimationsService`
- PrimeNG `ButtonModule`
