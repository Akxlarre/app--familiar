-- =============================================================================
-- FamilyApp — Scope personal en presupuestos (profile_id)
-- Fase 4 Sistema Financiero Inteligente
-- =============================================================================

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Un presupuesto es por (household, category, year, month) y opcionalmente por profile (null = hogar)
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_household_id_category_id_year_month_key;

-- Un solo presupuesto de hogar por (household, category, year, month) cuando profile_id es NULL
CREATE UNIQUE INDEX idx_budgets_household_period_null_profile
  ON public.budgets(household_id, category_id, year, month) WHERE profile_id IS NULL;

-- Un presupuesto por perfil por (household, category, year, month)
CREATE UNIQUE INDEX idx_budgets_household_period_profile
  ON public.budgets(household_id, category_id, year, month, profile_id) WHERE profile_id IS NOT NULL;

COMMENT ON COLUMN public.budgets.profile_id IS 'NULL = presupuesto del hogar; no NULL = presupuesto personal del perfil.';
