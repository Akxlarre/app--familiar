# SearchPanelService

## Propósito

Control del panel de búsqueda global desde cualquier parte de la app. Usado por el atajo Ctrl+K / Cmd+K para abrir el panel.

## API pública

| Miembro | Tipo | Descripción |
|---------|------|-------------|
| `openRequested` | `Signal<number>` | Se incrementa cada vez que se pide abrir (el panel reacciona) |
| `open()` | `void` | Solicita abrir el panel |
| `consumeOpenRequest()` | `number` | Valor actual (para que el panel consuma si lo necesita) |

## Cuándo usarlo

- Directiva `[appSearchShortcut]` para Ctrl+K
- Cualquier acción que deba abrir el panel de búsqueda programáticamente

## Cuándo no usarlo

- Para los resultados de búsqueda → `SearchService`
- Para el contenido del panel → componente del panel

## Dependencias

- Ninguna. El panel de búsqueda escucha `openRequested` y se muestra cuando cambia.
