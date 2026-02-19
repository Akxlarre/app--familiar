# Documentación de componentes

## Regla obligatoria

Al crear un **nuevo componente** en `src/app/shared/components/`:

1. **Crear README.md** en la carpeta del componente con:
   - Propósito / responsabilidad
   - Inputs y outputs principales
   - Cuándo usarlo vs cuándo no
   - Ejemplo de uso mínimo

2. **Actualizar COMPONENTS.md** — Añadir la fila correspondiente en la tabla del índice con enlace al README.

## Formato de entrada en COMPONENTS.md

```markdown
| `app-nombre-componente` | Descripción breve | [README.md](nombre-componente/README.md) |
```

## Skeleton obligatorio

Cuando el componente muestre **datos o layout cargados de forma asíncrona**:

1. Crear `{nombre}-skeleton.component.ts` colocado junto al componente
2. Actualizar COMPONENTS.md en la sección Skeletons
3. Exportar el skeleton en el index.ts del componente

Ver `docs/SKELETON-ARCHITECTURE.md` y regla `.cursor/rules/skeleton-requirement.mdc`.

## Excepciones
- Skeletons muy simples pueden documentarse solo en COMPONENTS.md (sin README propio)
- Componentes feature-specific (dentro de una feature, no en shared) — JSDoc en el .ts es suficiente
