# Modelo de Datos v1 — FamilyApp

Documentación del esquema de base de datos para la aplicación familiar.

**Migraciones**: `20250219000000_modelo_datos_v1.sql` (esquema base), `20250220100000_household_invite_code.sql` (invite_code en households).

---

## 1. Diagrama de relaciones (resumen)

```
households (raíz)
    ├── profiles (1:1 auth.users)
    ├── household_invites
    ├── budgets
    ├── expenses ── receipts
    ├── products ── inventory_logs
    ├── recipes ── recipe_ingredients
    ├── meal_plans
    └── todo_lists ── todo_items

profiles
    ├── routines ── routine_exercises
    └── workout_sessions ── session_sets

expense_categories (catálogo global)
product_categories (catálogo global)
exercises (catálogo global)
```

---

## 2. Tablas por módulo

### 2.1 Auth e Infraestructura

| Tabla | Descripción |
|-------|-------------|
| `households` | Hogar familiar. Todos los miembros pertenecen a uno. |
| `profiles` | Perfil extendido (1:1 con `auth.users`). Incluye `household_id`, `display_name`, `avatar_url`, `role`. |
| `household_invites` | Invitaciones pendientes por email. Token, expiración, estado. |

### 2.2 Gastos y Boletas

| Tabla | Descripción |
|-------|-------------|
| `expense_categories` | Catálogo: Alimentación, Transporte, Salud, Educación, Hogar, Otro. |
| `budgets` | Presupuesto por categoría y mes/año. `household_id`, `category_id`, `year`, `month`, `amount`. |
| `expenses` | Gasto individual. `household_id`, `profile_id`, `category_id`, `amount`, `date`, `note`. |
| `receipts` | Boleta vinculada a gasto. `storage_path`, `amount`, `date`, `merchant`, `raw_ocr_data`. |

### 2.3 Inventario

| Tabla | Descripción |
|-------|-------------|
| `product_categories` | Catálogo: Alimentos/despensa, Limpieza/hogar, Medicamentos. |
| `products` | Producto del hogar. `name`, `quantity`, `unit`, `stock_minimum`, `barcode`. |
| `inventory_logs` | Log de cambios. `quantity_before`, `quantity_after`, `change_type`, `profile_id`. |

### 2.4 Comidas

| Tabla | Descripción |
|-------|-------------|
| `recipes` | Receta. `name`, `instructions`, `image_path`, `calories`, `protein`, `carbs`, `fat`, `servings`. |
| `recipe_ingredients` | Ingrediente con cantidad y unidad. |
| `meal_plans` | Plan semanal. `plan_date`, `slot` (breakfast/lunch/dinner), `recipe_id`. |

### 2.5 Ejercicio

| Tabla | Descripción |
|-------|-------------|
| `exercises` | Biblioteca compartida. `name`, `muscle_group`, `description`, `image_url`. |
| `routines` | Rutina por miembro. `profile_id`, `name`, `active_days[]`. |
| `routine_exercises` | Ejercicio en rutina. `sets`, `reps`, `target_weight`. |
| `workout_sessions` | Sesión completada. `profile_id`, `routine_id`, `session_date`. |
| `session_sets` | Set individual. `exercise_id`, `set_number`, `reps`, `weight`. |

### 2.6 Notas y Tareas

| Tabla | Descripción |
|-------|-------------|
| `todo_lists` | Lista compartida. `household_id`, `title`. |
| `todo_items` | Ítem. `title`, `completed`, `assigned_to`, `sort_order`. |

---

## 3. Columnas detalladas

### households
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| name | TEXT | Nombre del hogar |
| invite_code | TEXT | Código único para unirse al hogar (UNIQUE, generado al crear) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### profiles
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK, FK auth.users |
| household_id | UUID | FK households (nullable hasta unirse) |
| display_name | TEXT | Nombre para mostrar |
| avatar_url | TEXT | URL del avatar |
| role | TEXT | 'admin' \| 'member' |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### expenses
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| household_id | UUID | FK households |
| profile_id | UUID | FK profiles (quién registró) |
| category_id | UUID | FK expense_categories |
| amount | DECIMAL(12,2) | Monto |
| date | DATE | Fecha del gasto |
| note | TEXT | Nota opcional |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### receipts
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| expense_id | UUID | FK expenses (nullable si aún no vinculada) |
| household_id | UUID | FK households |
| storage_path | TEXT | Ruta en Supabase Storage |
| amount | DECIMAL(12,2) | Extraído por OCR |
| date | DATE | Extraído por OCR |
| merchant | TEXT | Extraído por OCR |
| raw_ocr_data | JSONB | Datos crudos del OCR |
| created_at | TIMESTAMPTZ | |

### products
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| household_id | UUID | FK households |
| category_id | UUID | FK product_categories |
| name | TEXT | Nombre del producto |
| quantity | DECIMAL(10,2) | Cantidad actual |
| unit | TEXT | unidad, kg, L, etc. |
| stock_minimum | DECIMAL(10,2) | Alerta cuando quantity <= este valor |
| barcode | TEXT | Código de barras |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

## 4. Row Level Security (RLS)

**Principio**: Cada usuario solo accede a datos de su hogar (`household_id`).

### Funciones helper
- `get_my_household_id()` — Devuelve el `household_id` del perfil del usuario actual.
- `belongs_to_household(household_uuid)` — Verifica si el usuario pertenece al hogar.

### Políticas por tipo
- **Catálogos** (`expense_categories`, `product_categories`, `exercises`): SELECT público.
- **Datos del hogar**: SELECT/INSERT/UPDATE/DELETE solo si `belongs_to_household(household_id)`.
- **Datos personales** (`routines`, `workout_sessions`): Solo el dueño (`profile_id = auth.uid()`).

---

## 5. Realtime

Tablas con suscripción Realtime habilitada:
- `expenses`
- `products`
- `todo_items`

---

## 6. Triggers

- **on_auth_user_created**: Crea automáticamente un perfil en `profiles` cuando se registra un usuario en `auth.users`.

---

## 7. Storage (Supabase)

Crear bucket manualmente en Supabase Dashboard:

| Bucket | Uso | Público |
|--------|-----|---------|
| `receipts` | Imágenes de boletas | No |
| `recipes` | Fotos de recetas | No |

RLS en Storage: solo miembros del hogar pueden leer/escribir.

---

## 8. Aplicar la migración

```bash
# Con Supabase CLI (local)
supabase db reset

# O aplicar en proyecto remoto
supabase db push
```

Para proyecto remoto sin CLI: ejecutar el SQL en el **SQL Editor** del dashboard de Supabase.

---

## 9. Historial de cambios del modelo

| Fecha | Cambio | Versión |
|-------|--------|---------|
| 2025-02-19 | Creación inicial del modelo v1. Tablas: households, profiles, invites, gastos, boletas, inventario, comidas, ejercicio, notas. RLS y Realtime configurados. | v1 |
