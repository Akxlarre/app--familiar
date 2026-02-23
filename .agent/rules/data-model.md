# Modelo de Datos — Reglas

**Activar cuando**: El agente cree o modifique tablas, columnas, RLS, migraciones SQL o servicios que accedan a Supabase.

---

## Sistema de migraciones

Seguir **OBLIGATORIAMENTE** el sistema definido en `.cursor/rules/supabase-migrations.mdc`:

- **Naming**: `YYYYMMDDHHMMSS_<dominio>_<tipo>_<descripcion>.sql`
- **Workflow**: leer REGISTRY → crear SQL → actualizar REGISTRY → actualizar MODELO-DATOS
- **Seeds** en `supabase/seed.sql`, nunca en migraciones

---

## Convenciones SQL

| Aspecto      | Regla                                           |
|--------------|--------------------------------------------------|
| IDs          | UUID con `uuid_generate_v4()`                    |
| Timestamps   | `created_at`, `updated_at` TIMESTAMPTZ DEFAULT now() |
| Household    | Tablas compartidas tienen `household_id` FK      |
| RLS          | `belongs_to_household()` o `get_my_household_id()` |
| Soft delete  | No usado — DELETE físico                         |
| Idempotencia | `IF NOT EXISTS` / `IF EXISTS` siempre que sea posible |

---

## Servicios Angular que acceden a Supabase

- Usar `SupabaseService.client` para queries.
- Filtrar por `household_id` del perfil del usuario actual.
- Para datos personales (routines, workout_sessions): filtrar por `profile_id = auth.uid()`.
- Suscribirse a Realtime solo en tablas habilitadas: `expenses`, `products`, `todo_items`, `transactions`, `accounts`, `recurring_transactions`.

---

## Checklist antes de modificar el modelo

- [ ] Leído `supabase/migrations/REGISTRY.md`
- [ ] Leído `docs/MODELO-DATOS-v1.md`
- [ ] Migración con naming correcto y workflow completo
- [ ] REGISTRY y MODELO-DATOS actualizados
- [ ] Historial de cambios en ambos documentos
