# Índice de directivas

> **Regla**: Al añadir una directiva nueva a `core/directives/`, actualizar este archivo y crear su README.

## Directivas disponibles

| Directiva | Selector | Propósito | Doc |
|-----------|----------|-----------|-----|
| `PressFeedbackDirective` | `[appPressFeedback]` | Feedback hover + press en botones/triggers | [README](press-feedback.README.md) |
| `AnimateInDirective` | `[appAnimateIn]` | Animación de entrada para elementos condicionales | [README](animate-in.README.md) |
| `BentoGridLayoutDirective` | `[appBentoGridLayout]` | Contexto para animar reflows del bento-grid | [README](bento-grid-layout.README.md) |
| `SearchShortcutDirective` | `[appSearchShortcut]` | Atajo Ctrl+K / Cmd+K para abrir búsqueda | [README](search-shortcut.README.md) |
| `ModalOverlayDirective` | `[appModalOverlay]` | Teleporta el modal al overlay para cubrir topbar | [README](modal-overlay.README.md) |

---

## Cuándo usar cada una

| Caso | Directiva |
|------|-----------|
| Botones del topbar, triggers, pills | `[appPressFeedback]` |
| Mensajes de error que aparecen condicionalmente | `[appAnimateIn]` |
| Contenedor bento-grid con hijos que cambian tamaño | `[appBentoGridLayout]` |
| App root (para atajo global de búsqueda) | `[appSearchShortcut]` |
| Modal dentro del main layout | `[appModalOverlay]` |
