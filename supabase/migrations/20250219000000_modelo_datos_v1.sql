-- =============================================================================
-- FamilyApp — Modelo de Datos v1
-- Migración inicial: Auth, Gastos, Boletas, Inventario, Comidas, Ejercicio, Notas
-- Documentación: docs/MODELO-DATOS-v1.md
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. HOUSEHOLDS — Hogar familiar (raíz)
-- =============================================================================
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. PROFILES — Perfil extendido del usuario (1:1 con auth.users)
-- =============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_household ON public.profiles(household_id);

-- Trigger: crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 3. HOUSEHOLD_INVITES — Invitaciones al hogar
-- =============================================================================
CREATE TABLE public.household_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, email)
);

CREATE INDEX idx_invites_household ON public.household_invites(household_id);
CREATE INDEX idx_invites_token ON public.household_invites(token);

-- =============================================================================
-- 4. EXPENSE_CATEGORIES — Categorías de gasto
-- =============================================================================
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO public.expense_categories (name, icon, sort_order) VALUES
  ('Alimentación', 'pi-shopping-cart', 1),
  ('Transporte', 'pi-car', 2),
  ('Salud', 'pi-heart', 3),
  ('Educación', 'pi-book', 4),
  ('Hogar', 'pi-home', 5),
  ('Otro', 'pi-ellipsis-h', 6);

-- =============================================================================
-- 5. BUDGETS — Presupuesto por categoría y mes/año
-- =============================================================================
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, category_id, year, month)
);

CREATE INDEX idx_budgets_household ON public.budgets(household_id);
CREATE INDEX idx_budgets_period ON public.budgets(household_id, year, month);

-- =============================================================================
-- 6. EXPENSES — Gastos
-- =============================================================================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_household ON public.expenses(household_id);
CREATE INDEX idx_expenses_profile ON public.expenses(profile_id);
CREATE INDEX idx_expenses_date ON public.expenses(household_id, date);

-- =============================================================================
-- 7. RECEIPTS — Boletas (imagen + datos OCR)
-- =============================================================================
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  amount DECIMAL(12, 2),
  date DATE,
  merchant TEXT,
  raw_ocr_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_receipts_household ON public.receipts(household_id);
CREATE INDEX idx_receipts_expense ON public.receipts(expense_id);

-- =============================================================================
-- 8. PRODUCT_CATEGORIES — Categorías de inventario
-- =============================================================================
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO public.product_categories (name, sort_order) VALUES
  ('Alimentos/despensa', 1),
  ('Limpieza/hogar', 2),
  ('Medicamentos', 3);

-- =============================================================================
-- 9. PRODUCTS — Inventario
-- =============================================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'unidad',
  stock_minimum DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (stock_minimum >= 0),
  barcode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_household ON public.products(household_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_stock ON public.products(household_id) WHERE quantity <= stock_minimum;

-- =============================================================================
-- 10. INVENTORY_LOGS — Historial de cambios en inventario
-- =============================================================================
CREATE TABLE public.inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity_before DECIMAL(10, 2) NOT NULL,
  quantity_after DECIMAL(10, 2) NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('adjust', 'consume', 'restock', 'manual')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_logs_product ON public.inventory_logs(product_id);

-- =============================================================================
-- 11. RECIPES — Recetas
-- =============================================================================
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instructions TEXT,
  image_path TEXT,
  calories INT,
  protein DECIMAL(6, 2),
  carbs DECIMAL(6, 2),
  fat DECIMAL(6, 2),
  servings INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_household ON public.recipes(household_id);

-- =============================================================================
-- 12. RECIPE_INGREDIENTS — Ingredientes de receta
-- =============================================================================
CREATE TABLE public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unidad',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);

-- =============================================================================
-- 13. MEAL_PLANS — Plan semanal de comidas
-- =============================================================================
CREATE TABLE public.meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  plan_date DATE NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('breakfast', 'lunch', 'dinner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, plan_date, slot)
);

CREATE INDEX idx_meal_plans_household ON public.meal_plans(household_id);
CREATE INDEX idx_meal_plans_date ON public.meal_plans(household_id, plan_date);

-- =============================================================================
-- 14. EXERCISES — Biblioteca de ejercicios (compartida)
-- =============================================================================
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  muscle_group TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 15. ROUTINES — Rutinas de ejercicio (por miembro)
-- =============================================================================
CREATE TABLE public.routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active_days TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_routines_profile ON public.routines(profile_id);

-- =============================================================================
-- 16. ROUTINE_EXERCISES — Ejercicios de la rutina
-- =============================================================================
CREATE TABLE public.routine_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  sets INT NOT NULL DEFAULT 3,
  reps INT,
  target_weight DECIMAL(8, 2),
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_routine_exercises_routine ON public.routine_exercises(routine_id);

-- =============================================================================
-- 17. WORKOUT_SESSIONS — Sesiones de entrenamiento
-- =============================================================================
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workout_sessions_profile ON public.workout_sessions(profile_id);

-- =============================================================================
-- 18. SESSION_SETS — Sets individuales de una sesión
-- =============================================================================
CREATE TABLE public.session_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  set_number INT NOT NULL,
  reps INT,
  weight DECIMAL(8, 2),
  completed BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_session_sets_workout ON public.session_sets(workout_session_id);

-- =============================================================================
-- 19. TODO_LISTS — Listas compartidas de tareas
-- =============================================================================
CREATE TABLE public.todo_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_todo_lists_household ON public.todo_lists(household_id);

-- =============================================================================
-- 20. TODO_ITEMS — Ítems de tarea
-- =============================================================================
CREATE TABLE public.todo_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  todo_list_id UUID NOT NULL REFERENCES public.todo_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_todo_items_list ON public.todo_items(todo_list_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Función helper: obtener household_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_my_household_id()
RETURNS UUID AS $$
  SELECT household_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función helper: verificar si el usuario pertenece al hogar
CREATE OR REPLACE FUNCTION public.belongs_to_household(household_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT household_id = household_uuid FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Habilitar RLS en todas las tablas
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_items ENABLE ROW LEVEL SECURITY;

-- expense_categories: lectura pública (catálogo)
CREATE POLICY "expense_categories_select" ON public.expense_categories FOR SELECT USING (true);

-- product_categories: lectura pública (catálogo)
CREATE POLICY "product_categories_select" ON public.product_categories FOR SELECT USING (true);

-- exercises: lectura pública (biblioteca compartida)
CREATE POLICY "exercises_select" ON public.exercises FOR SELECT USING (true);

-- households: solo miembros del hogar
CREATE POLICY "households_select" ON public.households FOR SELECT USING (belongs_to_household(id));
CREATE POLICY "households_insert" ON public.households FOR INSERT WITH CHECK (true);
CREATE POLICY "households_update" ON public.households FOR UPDATE USING (belongs_to_household(id));

-- profiles: ver perfiles del mismo hogar
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (
  household_id IS NULL OR household_id = get_my_household_id() OR id = auth.uid()
);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- household_invites
CREATE POLICY "invites_select" ON public.household_invites FOR SELECT USING (belongs_to_household(household_id));
CREATE POLICY "invites_insert" ON public.household_invites FOR INSERT WITH CHECK (belongs_to_household(household_id));

-- budgets
CREATE POLICY "budgets_all" ON public.budgets FOR ALL USING (belongs_to_household(household_id));

-- expenses
CREATE POLICY "expenses_all" ON public.expenses FOR ALL USING (belongs_to_household(household_id));

-- receipts
CREATE POLICY "receipts_all" ON public.receipts FOR ALL USING (belongs_to_household(household_id));

-- products
CREATE POLICY "products_all" ON public.products FOR ALL USING (belongs_to_household(household_id));

-- inventory_logs
CREATE POLICY "inventory_logs_all" ON public.inventory_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND belongs_to_household(p.household_id))
);

-- recipes
CREATE POLICY "recipes_all" ON public.recipes FOR ALL USING (belongs_to_household(household_id));

-- recipe_ingredients (via recipe)
CREATE POLICY "recipe_ingredients_all" ON public.recipe_ingredients FOR ALL USING (
  EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND belongs_to_household(r.household_id))
);

-- meal_plans
CREATE POLICY "meal_plans_all" ON public.meal_plans FOR ALL USING (belongs_to_household(household_id));

-- routines (por profile - datos personales)
CREATE POLICY "routines_all" ON public.routines FOR ALL USING (profile_id = auth.uid());

-- routine_exercises
CREATE POLICY "routine_exercises_all" ON public.routine_exercises FOR ALL USING (
  EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_id AND r.profile_id = auth.uid())
);

-- workout_sessions
CREATE POLICY "workout_sessions_all" ON public.workout_sessions FOR ALL USING (profile_id = auth.uid());

-- session_sets
CREATE POLICY "session_sets_all" ON public.session_sets FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = workout_session_id AND ws.profile_id = auth.uid())
);

-- todo_lists
CREATE POLICY "todo_lists_all" ON public.todo_lists FOR ALL USING (belongs_to_household(household_id));

-- todo_items
CREATE POLICY "todo_items_all" ON public.todo_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.todo_lists tl WHERE tl.id = todo_list_id AND belongs_to_household(tl.household_id))
);

-- =============================================================================
-- Realtime: habilitar para tablas que requieren sincronización
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.todo_items;
