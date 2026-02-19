# ToastHeadlessComponent

Componente de contenido para toasts PrimeNG usando template headless. Controla el cierre al quitar el mouse.

## Propósito

- **Botón cerrar visible**: Con headless, PrimeNG no renderiza el botón; lo añadimos en el template.
- **Cierre rápido al quitar mouse**: Al hacer hover, PrimeNG pausa el temporizador. Al quitar el mouse, el toast se cierra en **1.5 s** en lugar de 4 s.

## Comportamiento

1. **Hover**: PrimeNG pausa el temporizador (comportamiento por defecto).
2. **Mouse leave**: Se inicia un timer de 1.5 s; al terminar se llama a `closeFn()`.
3. **Hover de nuevo antes de 1.5 s**: Se cancela el timer de cierre.

## Uso

```html
<ng-template let-message let-closeFn="closeFn" pTemplate="headless">
  <app-toast-headless [message]="message" [closeFn]="closeFn" />
</ng-template>
```

## Configuración

- `RESUME_DELAY_MS = 1500`: tiempo en ms tras quitar el mouse antes de cerrar.
