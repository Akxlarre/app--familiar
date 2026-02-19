# app-modal

Modal centrado con backdrop, animaciones GSAP y accesibilidad.

## Propósito

Diálogo modal para confirmaciones, formularios cortos o contenido que requiere atención focal. Usa `GsapAnimationsService.animatePanelIn/Out` para entrada/salida premium.

## Inputs

| Input | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `isOpen` | `boolean` | `false` | Controla visibilidad. El padre gestiona el estado |
| `title` | `string` | — | Título del modal (opcional) |
| `dismissible` | `boolean` | `true` | Permite cerrar con backdrop o Escape |
| `showCloseButton` | `boolean` | `true` | Muestra botón X en el header |
| `ariaLabel` | `string` | `'Diálogo'` | Etiqueta ARIA cuando no hay título |

## Outputs

| Output | Descripción |
|--------|-------------|
| `closed` | Emitido al cerrar (X, Escape, click en backdrop) |

## Slots

- **Default** — Contenido del body
- **`[appModalFooter]`** — Footer con acciones (botones). Requiere importar `ModalFooterDirective`

## Cuándo usarlo

- Confirmaciones (eliminar, guardar cambios) → **Preferir `ConfirmModalService.confirm()`** para patrón reutilizable
- Formularios cortos (login, edición rápida)
- Vista previa de contenido
- Anuncios o avisos que requieren atención

## Cuándo NO usarlo

- Errores frecuentes → banner o inline
- Flujos largos multi-paso → página dedicada
- Contenido opcional → tooltip o snackbar

## Overlay (cubrir topbar)

Cuando el modal está dentro del main layout, usa `[appModalOverlay]` para que el backdrop cubra todo el viewport (incl. topbar). Requiere importar `ModalOverlayDirective`.

## Ejemplo

```html
<button (click)="isModalOpen.set(true)">Abrir modal</button>

<app-modal
  [appModalOverlay]="isModalOpen()"
  [isOpen]="isModalOpen()"
  (closed)="isModalOpen.set(false)"
  title="Confirmar acción"
>
  <p>¿Estás seguro de que deseas continuar?</p>
  <ng-container appModalFooter>
    <button pButton label="Cancelar" (click)="isModalOpen.set(false)"></button>
    <button pButton label="Aceptar" (click)="confirm(); isModalOpen.set(false)"></button>
  </ng-container>
</app-modal>
```

## Dependencias

- `GsapAnimationsService`
- `PressFeedbackDirective`
- PrimeIcons (para el icono de cerrar)
