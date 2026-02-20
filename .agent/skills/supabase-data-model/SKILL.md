---
name: supabase-data-model
description: >
  Activar cuando el agente trabaje con Supabase: tablas, migraciones SQL, RLS,
  queries, servicios que accedan a la base de datos, o documentación del modelo.
  Consultar SIEMPRE docs/MODELO-DATOS-v1.md antes de crear/modificar esquema.
  Respetar household_id, profiles, y políticas RLS en todas las tablas.
---

# Skill: supabase-data-model

## Cuándo activar

- Crear o modificar migraciones SQL en `supabase/migrations/`
- Añadir tablas, columnas, índices o políticas RLS
- Implementar servicios Angular que consulten Supabase
- Configurar Realtime subscriptions
- Documentar cambios en el modelo de datos

---

## Referencias rápidas

| Recurso | Ubicación |
|---------|-----------|
| Modelo de datos | `docs/MODELO-DATOS-v1.md` |
| Migración v1 | `supabase/migrations/20250219000000_modelo_datos_v1.sql` |
| Requerimientos | `docs/Requerimientos_v1.md` |
| SupabaseService | `src/app/core/services/supabase.service.ts` |

---

## Estructura del modelo v1

```
households → profiles (auth.users)
          → household_invites
          → budgets, expenses, receipts
          → products, inventory_logs
          → recipes, recipe_ingredients, meal_plans
          → todo_lists, todo_items

profiles → routines, routine_exercises
        → workout_sessions, session_sets

Catálogos globales: expense_categories, product_categories, exercises
```

---

## Helpers RLS

```sql
get_my_household_id()     -- UUID del hogar del usuario actual
belongs_to_household(uuid) -- true si el usuario pertenece al hogar
```

---

## Patrón de query en Angular

```typescript
// Obtener household_id del usuario
const { data: profile } = await this.supabase.client
  .from('profiles')
  .select('household_id')
  .eq('id', user.id)
  .single();

// Query con RLS (automático si el usuario está autenticado)
const { data } = await this.supabase.client
  .from('expenses')
  .select('*, expense_categories(name)')
  .order('date', { ascending: false });
```

---

## Realtime

Tablas con Realtime habilitado: `expenses`, `products`, `todo_items`.

```typescript
const channel = this.supabase.client
  .channel('expenses')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, payload => {
    // Actualizar estado
  })
  .subscribe();
```
