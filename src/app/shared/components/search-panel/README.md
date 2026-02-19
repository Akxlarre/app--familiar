# app-search-panel

Panel de búsqueda global. Atajo `Ctrl+K` / `Cmd+K` para abrir desde cualquier parte.

## Propósito
Búsqueda unificada de alumnos, clases, pagos, certificados. Resultados con navegación por teclado (↑↓ Enter). Al seleccionar, navega a la ruta del resultado.

## Dependencias
- **SearchService** — `search()`, `results`, `loading`, `hasResults`, `clear()`
- **SearchPanelService** — `openRequested()` (para abrir programáticamente vía Ctrl+K)
- **Router** — navegación al seleccionar resultado
- **GsapAnimationsService** — animaciones de panel

## Inputs / Outputs
No tiene inputs ni outputs. Todo viene de los servicios.

## Cuándo usarlo
- En el topbar. El atajo Ctrl+K debe estar registrado globalmente (SearchPanelService + HostListener en app o layout).

## Cuándo NO usarlo
- Búsquedas locales dentro de una página (usar input + filtro en la propia feature).

## Comportamiento
- Clic en icono o Ctrl+K abre el panel.
- Input con debounce: SearchService.search(query).
- Resultados: alumnos, clases, pagos, certificados con icono y subtítulo.
- Teclado: ↑↓ para mover, Enter para seleccionar y navegar.
- Cierra con Escape o clic fuera.
- Al abrir, limpia query y resultados previos.

## Estado
Ver [TODO.md](TODO.md) para implementado vs pendiente (API real, etc.).
