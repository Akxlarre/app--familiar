# Impacto en Documentación

## Regla principal

**Después de completar cualquier cambio** (código, configuración, estructura, migraciones, reglas, etc.), el agente DEBE revisar el mapa de documentación y evaluar si algún documento necesita actualizarse.

## Proceso obligatorio

1. **Identificar el alcance del cambio** — ¿Qué se modificó, creó o eliminó?
2. **Recorrer el mapa de documentación** de `.cursorrules` y evaluar impacto en:

| Documento | Actualizar si… |
|-----------|---------------|
| `docs/Requerimientos_v1.md` | Nuevas features, rutas, desviaciones, decisiones de arquitectura |
| `docs/MODELO-DATOS-v1.md` | Tablas, columnas, relaciones, RLS, Realtime |
| `docs/BRAND_GUIDELINES.md` | Tokens, colores, tipografía, reglas visuales |
| `docs/ANIMATIONS.md` | Nuevos métodos o cambios en GsapAnimationsService |
| `docs/SKELETON-ARCHITECTURE.md` | Nuevos skeletons o cambios de convención |
| `docs/PAGE-TRANSITIONS.md` | Cambios en transiciones entre rutas |
| `COMPONENTS.md` | Componentes creados, renombrados o eliminados |
| `SERVICES.md` | Servicios creados, renombrados o eliminados |
| `DIRECTIVES.md` | Directivas creadas, renombradas o eliminadas |
| `REGISTRY.md` | Migraciones SQL creadas o modificadas |
| `FUNCTIONS.md` | Edge Functions creadas, modificadas o eliminadas |
| `docs/EDGE-FUNCTIONS-SUPABASE.md` | Nuevos secretos, cambios de despliegue o cron de Edge Functions |
| `.cursorrules` | Nuevas reglas, nuevos docs, cambios de workflow |
| `docs/AGENT-SYSTEM-BLUEPRINT.md` | Cambios en el sistema de reglas, nuevos patrones |
| READMEs de artefactos | Cambios en API, inputs/outputs, comportamiento |

3. **Actuar** — Actualizar cada documento afectado.
4. **Reportar** — Listar al usuario qué documentos se actualizaron y por qué (o confirmar que ninguno requiere cambios).

## Cuándo NO aplica

- Cambios puramente cosméticos en código sin impacto en API ni comportamiento (ej. refactor interno sin cambio de interfaz)
- Correcciones de typos en código

## Prioridad

Esta regla se ejecuta **al final** del workflow, después de implementar y documentar artefactos individuales. Es la verificación de cierre global.
