-- =============================================================================
-- FamilyApp — Mejoras inmediatas módulo Finanzas
-- Tablas: savings_goals, tags, transaction_tags, transaction_splits
-- =============================================================================

-- =============================================================================
-- SAVINGS_GOALS — Metas de ahorro con fecha límite
-- =============================================================================
CREATE TABLE public.savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline DATE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  icon TEXT,
  color TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_savings_goals_household ON public.savings_goals(household_id);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "savings_goals_all" ON public.savings_goals FOR ALL USING (belongs_to_household(household_id));

-- =============================================================================
-- TAGS — Etiquetas flexibles por hogar
-- =============================================================================
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, name)
);

CREATE INDEX idx_tags_household ON public.tags(household_id);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags_all" ON public.tags FOR ALL USING (belongs_to_household(household_id));

-- =============================================================================
-- TRANSACTION_TAGS — Relación many-to-many transacciones ↔ tags
-- =============================================================================
CREATE TABLE public.transaction_tags (
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, tag_id)
);

CREATE INDEX idx_transaction_tags_tx ON public.transaction_tags(transaction_id);
CREATE INDEX idx_transaction_tags_tag ON public.transaction_tags(tag_id);

ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transaction_tags_all" ON public.transaction_tags FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id AND belongs_to_household(t.household_id)
  )
);

-- =============================================================================
-- TRANSACTION_SPLITS — División de gastos entre miembros
-- =============================================================================
CREATE TABLE public.transaction_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(transaction_id, profile_id)
);

CREATE INDEX idx_transaction_splits_tx ON public.transaction_splits(transaction_id);

ALTER TABLE public.transaction_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transaction_splits_all" ON public.transaction_splits FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_id AND belongs_to_household(t.household_id)
  )
);
