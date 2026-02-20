# Requerimientos y Documentación del Proyecto

## Fuente de verdad

- **Requerimientos**: `docs/Requerimientos_v1.md`
- **Modelo de datos**: `docs/MODELO-DATOS-v1.md`
- **Migraciones**: `supabase/migrations/`

Antes de implementar funcionalidad nueva o modificar módulos existentes:

1. **Consultar el documento de requerimientos** — Verificar alcance, prioridades y especificaciones técnicas
2. **Consultar el modelo de datos** — Tablas, columnas, relaciones y RLS en `docs/MODELO-DATOS-v1.md`
3. **Seguir el orden de implementación** — Gastos + Boletas → Inventario → Comidas → Ejercicio → Notas y Tablero
4. **Respetar el modelo de datos** — No crear tablas/columnas sin documentar en MODELO-DATOS-v1.md

---

## Estrategia: Web primero

El proyecto sigue la **Opción A — Web primero**:

- **UI actual**: PrimeNG (no Ionic en esta fase)
- **Plataforma**: Web responsive
- **Móvil**: Ionic + Capacitor se añadirá en una fase posterior, cuando los módulos estén validados en web

No instalar Ionic ni Capacitor hasta que se decida explícitamente migrar a móvil.

---

## Documentación obligatoria de cambios

**Toda implementación o cambio significativo debe documentarse** en `docs/Requerimientos_v1.md`:

### Cuándo actualizar el documento

- Nuevas tablas o columnas en Supabase
- Cambios en el flujo de autenticación o perfiles
- Nuevas rutas o features
- Desviaciones de los requerimientos originales (y su justificación)
- Decisiones técnicas que afecten la arquitectura

### Cómo documentar

1. **Sección "Historial de cambios"** — Añadir entrada con fecha, descripción breve y referencia al módulo
2. **Actualizar secciones afectadas** — Si un requerimiento evoluciona, actualizar la sección correspondiente
3. **Incrementar versión** — Al final del documento, actualizar número de versión si aplica

### Formato de entrada en historial

```markdown
## Historial de cambios
| Fecha | Cambio | Módulo |
|-------|--------|--------|
| YYYY-MM-DD | Descripción del cambio | gastos/inventario/etc. |
```

---

## Checklist antes de cerrar una tarea

- [ ] Requerimientos consultados en `docs/Requerimientos_v1.md`
- [ ] Implementación alineada con modelo de datos y RLS
- [ ] Cambios documentados en el historial del documento (si aplica)
- [ ] Secciones del documento actualizadas si hubo desviación o evolución
