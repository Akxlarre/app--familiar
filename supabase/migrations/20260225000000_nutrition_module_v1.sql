-- =============================================================================
-- FamilyApp — Nutrition Module v1
-- Tablas: foods, food_aliases, nutrition_profiles, saved_meals, saved_meal_items,
--         food_logs, daily_nutrition_summaries
-- Documentación: plan Modulo Nutricion
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- 1. FOODS — Catálogo compartido de alimentos (compartida con Inventario)
-- =============================================================================
CREATE TABLE public.foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  barcode TEXT,
  calories_100 DECIMAL(8,2) NOT NULL,
  protein_100 DECIMAL(6,2) NOT NULL,
  carbs_100 DECIMAL(6,2) NOT NULL,
  fat_100 DECIMAL(6,2) NOT NULL,
  fiber_100 DECIMAL(6,2),
  sugar_100 DECIMAL(6,2),
  sodium_100 DECIMAL(6,2),
  saturated_fat_100 DECIMAL(6,2),
  serving_size_g DECIMAL(8,2) DEFAULT 100,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','openfoodfacts','verified')),
  verified BOOLEAN NOT NULL DEFAULT false,
  report_count INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_foods_household ON public.foods(household_id);
CREATE INDEX idx_foods_barcode ON public.foods(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_foods_name_trgm ON public.foods USING gin (name gin_trgm_ops);

-- =============================================================================
-- 2. FOOD_ALIASES — Nombres alternativos para búsqueda
-- =============================================================================
CREATE TABLE public.food_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_food_aliases_food ON public.food_aliases(food_id);

-- =============================================================================
-- 3. NUTRITION_PROFILES — Perfil nutricional por usuario
-- =============================================================================
CREATE TABLE public.nutrition_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  sex TEXT NOT NULL CHECK (sex IN ('male','female')),
  birthdate DATE NOT NULL,
  height_cm DECIMAL(5,1) NOT NULL,
  weight_kg DECIMAL(5,1) NOT NULL,
  activity_level TEXT NOT NULL
    CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  goal TEXT NOT NULL CHECK (goal IN ('deficit','maintenance','surplus')),
  calories_target INT NOT NULL,
  protein_target_g INT NOT NULL,
  carbs_target_g INT NOT NULL,
  fat_target_g INT NOT NULL,
  macro_protein_pct INT NOT NULL DEFAULT 30,
  macro_carbs_pct INT NOT NULL DEFAULT 40,
  macro_fat_pct INT NOT NULL DEFAULT 30,
  is_manual_override BOOLEAN NOT NULL DEFAULT false,
  last_recalibration DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nutrition_profiles_profile ON public.nutrition_profiles(profile_id);
CREATE INDEX idx_nutrition_profiles_household ON public.nutrition_profiles(household_id);

-- =============================================================================
-- 4. SAVED_MEALS — Comidas guardadas / recetas del usuario
-- =============================================================================
CREATE TABLE public.saved_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_calories DECIMAL(8,2) NOT NULL,
  total_protein_g DECIMAL(6,2) NOT NULL,
  total_carbs_g DECIMAL(6,2) NOT NULL,
  total_fat_g DECIMAL(6,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_meals_profile ON public.saved_meals(profile_id);

CREATE TABLE public.saved_meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_meal_id UUID NOT NULL REFERENCES public.saved_meals(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE RESTRICT,
  quantity_g DECIMAL(8,2) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_saved_meal_items_meal ON public.saved_meal_items(saved_meal_id);

-- =============================================================================
-- 5. FOOD_LOGS — Registro diario de comidas
-- =============================================================================
CREATE TABLE public.food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL
    CHECK (meal_type IN ('breakfast','lunch','dinner','snack','extra')),
  food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE RESTRICT,
  quantity_g DECIMAL(8,2) NOT NULL,
  calories DECIMAL(8,2) NOT NULL,
  protein_g DECIMAL(6,2) NOT NULL,
  carbs_g DECIMAL(6,2) NOT NULL,
  fat_g DECIMAL(6,2) NOT NULL,
  from_saved_meal_id UUID REFERENCES public.saved_meals(id) ON DELETE SET NULL,
  from_inventory BOOLEAN NOT NULL DEFAULT false,
  pantry_item_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_food_logs_profile_date ON public.food_logs(profile_id, log_date);
CREATE INDEX idx_food_logs_profile_meal ON public.food_logs(profile_id, log_date, meal_type);

-- =============================================================================
-- 6. DAILY_NUTRITION_SUMMARIES — Cache de totales diarios
-- =============================================================================
CREATE TABLE public.daily_nutrition_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  calories_total DECIMAL(8,2) NOT NULL DEFAULT 0,
  protein_g DECIMAL(6,2) NOT NULL DEFAULT 0,
  carbs_g DECIMAL(6,2) NOT NULL DEFAULT 0,
  fat_g DECIMAL(6,2) NOT NULL DEFAULT 0,
  calories_target INT NOT NULL,
  goal_met BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, summary_date)
);

CREATE INDEX idx_daily_nutrition_summaries_profile_date ON public.daily_nutrition_summaries(profile_id, summary_date);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_nutrition_summaries ENABLE ROW LEVEL SECURITY;

-- foods: SELECT público para globales; CRUD para pertenencia al hogar
CREATE POLICY "foods_select" ON public.foods
  FOR SELECT USING (household_id IS NULL OR belongs_to_household(household_id));
CREATE POLICY "foods_insert" ON public.foods
  FOR INSERT WITH CHECK (household_id IS NULL OR belongs_to_household(household_id));
CREATE POLICY "foods_update" ON public.foods
  FOR UPDATE USING (household_id IS NOT NULL AND belongs_to_household(household_id));
CREATE POLICY "foods_delete" ON public.foods
  FOR DELETE USING (household_id IS NOT NULL AND belongs_to_household(household_id));

-- food_aliases: acceso según el food asociado
CREATE POLICY "food_aliases_select" ON public.food_aliases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.foods f
      WHERE f.id = food_id AND (f.household_id IS NULL OR belongs_to_household(f.household_id))
    )
  );
CREATE POLICY "food_aliases_insert" ON public.food_aliases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.foods f
      WHERE f.id = food_id AND f.household_id IS NOT NULL AND belongs_to_household(f.household_id)
    )
  );
CREATE POLICY "food_aliases_update" ON public.food_aliases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.foods f
      WHERE f.id = food_id AND f.household_id IS NOT NULL AND belongs_to_household(f.household_id)
    )
  );
CREATE POLICY "food_aliases_delete" ON public.food_aliases
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.foods f
      WHERE f.id = food_id AND f.household_id IS NOT NULL AND belongs_to_household(f.household_id)
    )
  );

-- nutrition_profiles: propio perfil CRUD; SELECT de hogar para vista familiar
CREATE POLICY "nutrition_profiles_select" ON public.nutrition_profiles
  FOR SELECT USING (profile_id = auth.uid() OR household_id = get_my_household_id());
CREATE POLICY "nutrition_profiles_insert" ON public.nutrition_profiles
  FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "nutrition_profiles_update" ON public.nutrition_profiles
  FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "nutrition_profiles_delete" ON public.nutrition_profiles
  FOR DELETE USING (profile_id = auth.uid());

-- saved_meals: solo el dueño
CREATE POLICY "saved_meals_all" ON public.saved_meals
  FOR ALL USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- saved_meal_items: vía saved_meals
CREATE POLICY "saved_meal_items_all" ON public.saved_meal_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.saved_meals sm
      WHERE sm.id = saved_meal_id AND sm.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.saved_meals sm
      WHERE sm.id = saved_meal_id AND sm.profile_id = auth.uid()
    )
  );

-- food_logs: privado por usuario
CREATE POLICY "food_logs_all" ON public.food_logs
  FOR ALL USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- daily_nutrition_summaries: privado por usuario
CREATE POLICY "daily_nutrition_summaries_all" ON public.daily_nutrition_summaries
  FOR ALL USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- =============================================================================
-- Realtime: tablas que requieren sincronización
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_nutrition_summaries;
