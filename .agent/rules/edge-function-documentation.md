# Documentación de Edge Functions

## Regla obligatoria

Al crear una **nueva Edge Function** en `supabase/functions/`:

1. **Actualizar FUNCTIONS.md** — Añadir la fila correspondiente en ambas tablas (funciones y tablas que usa)
2. **Header en index.ts** — Incluir un comentario al inicio del archivo con:
   - Propósito de la función
   - Método HTTP y body esperado
   - Secretos requeridos
3. **Actualizar `docs/EDGE-FUNCTIONS-SUPABASE.md`** si la función requiere secretos nuevos o un proceso de despliegue especial

## Al modificar una Edge Function existente

1. **Verificar FUNCTIONS.md** — ¿Cambiaron las tablas que usa, los secretos, la invocación?
2. **Actualizar `docs/EDGE-FUNCTIONS-SUPABASE.md`** si cambiaron secretos o flujo de despliegue
3. **Verificar `docs/MODELO-DATOS-v1.md`** si la función interactúa con tablas nuevas

## Al eliminar una Edge Function

1. **Eliminar la fila** de FUNCTIONS.md
2. **Actualizar `docs/EDGE-FUNCTIONS-SUPABASE.md`** para quitar referencias

## Formato de entrada en FUNCTIONS.md

```markdown
| `nombre-funcion` | Descripción breve | Método y contexto de invocación | Secretos | [index.ts](nombre-funcion/index.ts) |
```
