# Modelo de Datos — Reglas

**Activar cuando**: El agente cree o modifique tablas, columnas, RLS, migraciones SQL o servicios que accedan a Supabase.

---

## Documentación obligatoria

1. **Consultar** `docs/MODELO-DATOS-v1.md` antes de cualquier cambio en la base de datos.
2. **Migraciones** en `supabase/migrations/` con formato `YYYYMMDDHHMMSS_descripcion.sql`.
3. **Actualizar** `docs/MODELO-DATOS-v1.md` al añadir tablas, columnas o cambiar RLS.
4. **Registrar** en el historial del documento (sección 9) y en `docs/Requerimientos_v1.md` (sección 10).

---

## Convenciones

| Aspecto | Regla |
|---------|-------|
| **IDs** | UUID con `uuid_generate_v4()` |
| **Timestamps** | `created_at`, `updated_at` TIMESTAMPTZ DEFAULT now() |
| **Household** | Todas las tablas de datos compartidos tienen `household_id` FK |
| **RLS** | Usar `belongs_to_household(household_id)` o `get_my_household_id()` |
| **Soft delete** | No usado en v1 — usar DELETE físico |

---

## Servicios Angular que acceden a Supabase

- Usar `SupabaseService.client` para queries.
- Filtrar por `household_id` del perfil del usuario actual.
- Para datos personales (routines, workout_sessions): filtrar por `profile_id = auth.uid()`.
- Suscribirse a Realtime solo en tablas habilitadas: `expenses`, `products`, `todo_items`.

---

## Checklist antes de modificar el modelo

- [ ] Leído `docs/MODELO-DATOS-v1.md`
- [ ] Migración creada con timestamp correcto
- [ ] RLS definido para la nueva tabla
- [ ] Documentación actualizada
- [ ] Historial de cambios actualizado en ambos documentos
