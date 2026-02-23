# Supabase Migration System

**Activar cuando**: Crear, modificar o consultar migraciones SQL en `supabase/migrations/`, o cuando aparezcan 404 en llamadas a la API de Supabase.

---

## Aplicar migraciones (Supabase CLI)

El proyecto usa **Supabase CLI** para aplicar migraciones al remoto. Si el usuario reporta:
- 404 en endpoints de Supabase (ej. `tags`, `savings_goals`, `transaction_tags`)
- Errores al guardar en metas de ahorro, tags, splits de transacciones

**Ejecutar:**
```bash
npx supabase db push --linked
```

**Prerrequisitos** (una sola vez):
```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
```

El link se guarda en el proyecto; el login persiste en la máquina del usuario.

---

## Naming convention

Formato obligatorio: `YYYYMMDDHHMMSS_<dominio>_<tipo>_<descripcion>.sql`

### Dominios válidos

| Dominio     | Tablas                                                                 |
|-------------|------------------------------------------------------------------------|
| `core`      | households, profiles, household_invites                                |
| `finance`   | accounts, categories, transactions, receipts, receipt_items, budgets, recurring_transactions |
| `inventory`  | products, product_categories, inventory_logs                           |
| `meals`     | recipes, recipe_ingredients, meal_plans                                |
| `fitness`   | exercises, routines, routine_exercises, workout_sessions, session_sets |
| `tasks`     | todo_lists, todo_items                                                 |
| `storage`   | storage.objects (policies del bucket)                                   |
| `realtime`  | supabase_realtime publication                                          |

### Tipos válidos

| Tipo     | Uso                                    |
|----------|----------------------------------------|
| `create` | Tabla nueva                            |
| `alter`  | Modificar columnas/constraints         |
| `fix`    | Corregir bug en migración previa       |
| `fn`     | Funciones / RPCs                       |
| `rls`    | Solo políticas RLS                    |
| `drop`   | Eliminar tabla (PELIGROSO)             |
| `idx`    | Solo índices                           |

---

## Workflow obligatorio

### ANTES de escribir SQL

1. Leer `supabase/migrations/REGISTRY.md`
2. Leer `docs/MODELO-DATOS-v1.md`
3. Verificar conflictos con migraciones existentes

### AL crear el archivo SQL

4. Header obligatorio con Dominio, Tipo, Descripción, Tablas afectadas, Depende de
5. Idempotente: `IF NOT EXISTS`, `IF EXISTS`
6. Incluir RLS tras crear tabla
7. NUNCA INSERT de seed data en migraciones — usar `supabase/seed.sql`

### DESPUÉS de crear

8. Actualizar `REGISTRY.md` (fila + estado consolidado)
9. Actualizar `docs/MODELO-DATOS-v1.md` (secciones 2, 3, 4, 9)
10. Si hay seed data: mover a `supabase/seed.sql`
11. Si hay Realtime: actualizar sección 5 del MODELO-DATOS

---

## Reglas de seguridad

- NUNCA `DROP TABLE` sin confirmación explícita
- Preferir `ALTER TABLE` sobre `DROP + CREATE`
- Patrón FIX: `DROP POLICY IF EXISTS` / `CREATE POLICY`, 100% idempotente

