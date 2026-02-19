# SearchService

## Propósito

Búsqueda global. Busca alumnos, clases, pagos y certificados. Por ahora usa datos mock; cuando exista API, reemplazar por llamada HTTP.

## API pública

| Miembro | Tipo | Descripción |
|---------|------|-------------|
| `results` | `Signal<SearchResult[]>` | Resultados de la búsqueda |
| `loading` | `Signal<boolean>` | true mientras busca |
| `query` | `Signal<string>` | Término de búsqueda actual |
| `hasResults` | `ComputedSignal<boolean>` | true si hay resultados |
| `search(query)` | `void` | Ejecuta la búsqueda |
| `clear()` | `void` | Limpia query y resultados |

## Cuándo usarlo

- Panel de búsqueda global (Ctrl+K)
- Mostrar resultados con `SearchResult` (title, subtitle, type, routerLink)

## Cuándo no usarlo

- Para abrir el panel de búsqueda → `SearchPanelService.open()`
- Para búsquedas específicas de una página → servicio o lógica local

## Dependencias

- `SearchResult` de `@core/models/search-result.model`
