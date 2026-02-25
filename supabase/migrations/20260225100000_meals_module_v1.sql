-- =============================================================================
-- Dominio  : meals
-- Tipo     : alter + create
-- Desc     : Módulo de Planificación de Comidas v1.
--            Evoluciona: recipes (add campos), recipe_ingredients (add food_id),
--            meal_plans (add week_start_date/status).
--            Crea: meal_plan_slots.
--            Agrega source 'meal_plan' a shopping_list_items.
-- Tablas   : recipes, recipe_ingredients, meal_plans, meal_plan_slots,
--            shopping_list_items
-- Depende  : 20250219000000_modelo_datos_v1.sql (recipes, meal_plans)
--            20260224110000_inventory_module_v1.sql (shopping_list_items,
--              products)
--            20260225000000_nutrition_module_v1.sql (foods, saved_meals)
-- =============================================================================

-- =============================================================================
-- 1. RECIPES — Evolución de la tabla existente
--    Añade los campos que necesita el módulo de planificación:
--    - created_by (perfil que creó la receta, nullable para retrocompat.)
--    - prep_time_min (tiempo de preparación en minutos)
--    - meal_type ('breakfast'|'lunch'|'dinner'|'snack'|'any')
--    - difficulty ('easy'|'medium'|'hard')
--    - tags (JSONB array de etiquetas: 'alto proteína', 'vegetariano', etc.)
--    - source_url (URL de origen si fue importada)
--    - is_public (false = solo el hogar; preparación para v2)
-- =============================================================================
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prep_time_min INT CHECK (prep_time_min > 0),
  ADD COLUMN IF NOT EXISTS meal_type TEXT NOT NULL DEFAULT 'any'
    CHECK (meal_type IN ('breakfast','lunch','dinner','snack','any')),
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium'
    CHECK (difficulty IN ('easy','medium','hard')),
  ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Índice para búsqueda por meal_type (el motor de sugerencias filtra por esto)
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON public.recipes(household_id, meal_type);
CREATE INDEX IF NOT EXISTS idx_recipes_prep_time ON public.recipes(household_id, prep_time_min);

-- =============================================================================
-- 2. RECIPE_INGREDIENTS — Evolución: enlazar ingrediente a la tabla foods
--    Se añade food_id (nullable para retrocompat. con ingredientes libres).
--    Un ingrediente puede existir sin food_id (texto libre, ej. "sal a gusto"),
--    pero si tiene food_id los macros se calculan automáticamente en la app.
-- =============================================================================
ALTER TABLE public.recipe_ingredients
  ADD COLUMN IF NOT EXISTS food_id UUID REFERENCES public.foods(id) ON DELETE SET NULL;

-- Índice para el join frecuente ingredient → food
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_food ON public.recipe_ingredients(food_id)
  WHERE food_id IS NOT NULL;

-- =============================================================================
-- 3. MEAL_PLANS — Evolución: de "fila por día" a "plan semanal"
--    Se añaden week_start_date y status para gestionar el plan como unidad.
--    Las filas existentes (si las hay) mantienen su recipe_id y plan_date;
--    se migran a status 'archived' automáticamente.
-- =============================================================================
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS week_start_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','archived')),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Índice para consultar el plan activo de la semana
CREATE INDEX IF NOT EXISTS idx_meal_plans_week ON public.meal_plans(household_id, week_start_date)
  WHERE status IN ('draft','active');

-- =============================================================================
-- 4. MEAL_PLAN_SLOTS — Celdas de la grilla semanal
--    Cada fila = 1 celda en la grilla (día × tipo de comida).
--    slot_type: 'recipe' | 'free' | 'out' | 'leftovers'
--    profile_id: null = toda la familia; UUID = slot personal de un miembro
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.meal_plan_slots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  day_of_week  INT  NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Lunes … 7=Domingo
  meal_type    TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  slot_type    TEXT NOT NULL DEFAULT 'recipe'
               CHECK (slot_type IN ('recipe','free','out','leftovers')),
  recipe_id    UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  profile_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- null = todos
  notes        TEXT,
  is_done      BOOLEAN NOT NULL DEFAULT false,  -- marcado como "ya cocinado/comido"
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Restricción: un plan no puede tener dos slots del mismo día+tipo para el mismo perfil
  UNIQUE NULLS NOT DISTINCT (plan_id, day_of_week, meal_type, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_meal_plan_slots_plan    ON public.meal_plan_slots(plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_slots_recipe  ON public.meal_plan_slots(recipe_id) WHERE recipe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meal_plan_slots_profile ON public.meal_plan_slots(profile_id) WHERE profile_id IS NOT NULL;

-- =============================================================================
-- 5. SHOPPING_LIST_ITEMS — Añadir source 'meal_plan'
--    La lista de compras generada desde el plan se inserta en esta tabla
--    existente con source = 'meal_plan'. Se añade también plan_id para
--    trazabilidad (saber de qué plan proviene cada ítem).
-- =============================================================================
-- Ampliar el CHECK de source para incluir 'meal_plan'
ALTER TABLE public.shopping_list_items
  DROP CONSTRAINT IF EXISTS shopping_list_items_source_check;

ALTER TABLE public.shopping_list_items
  ADD CONSTRAINT shopping_list_items_source_check
    CHECK (source IN ('manual','low_stock','out_of_stock','recurring','meal_plan'));

-- Columna de trazabilidad: de qué plan viene el ítem
ALTER TABLE public.shopping_list_items
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.meal_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_plan ON public.shopping_list_items(plan_id)
  WHERE plan_id IS NOT NULL;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- meal_plan_slots: heredado de meal_plans (mismo hogar)
ALTER TABLE public.meal_plan_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_plan_slots_all" ON public.meal_plan_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = plan_id AND belongs_to_household(mp.household_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = plan_id AND belongs_to_household(mp.household_id)
    )
  );

-- =============================================================================
-- REALTIME
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_plan_slots;
