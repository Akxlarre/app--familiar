# Documentación de directivas

## Regla obligatoria

Al crear una **nueva directiva** en `src/app/core/directives/`:

1. **Crear README** — `{nombre}.README.md` con:
   - Propósito / responsabilidad
   - Selector y uso
   - Cuándo usarla vs cuándo no
   - Dependencias

2. **Actualizar DIRECTIVES.md** — Añadir la fila en la tabla del índice con enlace al README.

## Formato de entrada en DIRECTIVES.md

```markdown
| `NombreDirective` | `[appSelector]` | Descripción breve | [README](nombre.README.md) |
```
