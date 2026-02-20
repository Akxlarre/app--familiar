-- =============================================================================
-- FamilyApp — Financial Redesign v2
-- Drop old expense/receipt/budget tables, create accounts, categories, transactions,
-- receipts (new), receipt_items, budgets (new), recurring_transactions.
-- =============================================================================

-- Remove from realtime first (expenses was in publication).
-- Note: ALTER PUBLICATION ... DROP TABLE does not support IF EXISTS.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.expenses;
EXCEPTION WHEN OTHERS THEN
  NULL; /* table may not be in publication */
END $$;

-- Drop old tables (order matters: receipts -> expenses, budgets -> expense_categories)
DROP TABLE IF EXISTS public.receipts CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.expense_categories CASCADE;

-- =============================================================================
-- ACCOUNTS — Cuentas/billeteras del hogar
-- =============================================================================
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'credit_card', 'debit_card', 'savings')),
  currency TEXT NOT NULL DEFAULT 'CLP',
  initial_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_household ON public.accounts(household_id);
CREATE INDEX idx_accounts_active ON public.accounts(household_id) WHERE is_active = true;

-- =============================================================================
-- CATEGORIES — Categorías con jerarquía (household_id NULL = semilla global)
-- =============================================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'both')),
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_household ON public.categories(household_id);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_type ON public.categories(household_id, type);

-- =============================================================================
-- Seed categories (globales: household_id NULL)
-- =============================================================================
INSERT INTO public.categories (household_id, parent_id, name, icon, color, type, is_system, sort_order) VALUES
-- Gastos raíz y subcategorías
(NULL, NULL, 'Alimentación', 'pi-shopping-cart', NULL, 'expense', true, 1),
(NULL, NULL, 'Transporte', 'pi-car', NULL, 'expense', true, 2),
(NULL, NULL, 'Hogar', 'pi-home', NULL, 'expense', true, 3),
(NULL, NULL, 'Salud', 'pi-heart', NULL, 'expense', true, 4),
(NULL, NULL, 'Educación', 'pi-book', NULL, 'expense', true, 5),
(NULL, NULL, 'Entretenimiento', 'pi-video', NULL, 'expense', true, 6),
(NULL, NULL, 'Vestuario', 'pi-tag', NULL, 'expense', true, 7),
(NULL, NULL, 'Mascotas', 'pi-star', NULL, 'expense', true, 8),
(NULL, NULL, 'Otro gasto', 'pi-ellipsis-h', NULL, 'expense', true, 99);

-- Subcategorías Alimentación (parent = id de Alimentación)
INSERT INTO public.categories (household_id, parent_id, name, icon, type, is_system, sort_order)
SELECT NULL, id, 'Supermercado', 'pi-shopping-bag', 'expense', true, 1 FROM public.categories WHERE name = 'Alimentación' AND parent_id IS NULL;
INSERT INTO public.categories (household_id, parent_id, name, icon, type, is_system, sort_order)
SELECT NULL, id, 'Restaurantes', 'pi-users', 'expense', true, 2 FROM public.categories WHERE name = 'Alimentación' AND parent_id IS NULL;
INSERT INTO public.categories (household_id, parent_id, name, icon, type, is_system, sort_order)
SELECT NULL, id, 'Delivery', 'pi-truck', 'expense', true, 3 FROM public.categories WHERE name = 'Alimentación' AND parent_id IS NULL;
INSERT INTO public.categories (household_id, parent_id, name, icon, type, is_system, sort_order)
SELECT NULL, id, 'Otros alimentos', 'pi-inbox', 'expense', true, 4 FROM public.categories WHERE name = 'Alimentación' AND parent_id IS NULL;

-- Subcategorías Transporte
INSERT INTO public.categories (household_id, parent_id, name, icon, type, is_system, sort_order)
SELECT NULL, id, 'Combustible', 'pi-fuel', 'expense', true, 1 FROM public.categories WHERE name = 'Transporte' AND parent_id IS NULL;
INSERT INTO public.categories (household_id, parent_id, name, icon, type, is_system, sort_order)
SELECT NULL, id, 'Transporte público', 'pi-bus', 'expense', true, 2 FROM public.categories WHERE name = 'Transporte' AND parent_id IS NULL;
INSERT INTO public.categories (household_id, parent_id, name, icon, type, is_system, sort_order)
SELECT NULL, id, 'Estacionamiento', 'pi-map-marker', 'expense', true, 3 FROM public.categories WHERE name = 'Transporte' AND parent_id IS NULL;

-- Subcategorías Hogar
INSERT INTO public.categories (household_id, parent_id, name, icon, type, is_system, sort_order)
SELECT NULL, id, 'Arriendo/Dividendo', 'pi-building', 'expense', true, 1 FROM public.categories WHERE name = 'Hogar' AND parent_id IS NULL;
INSERT INTO public.categories (household_id, parent_id, name, icon, type, is_system, sort_order)
SELECT NULL, id, 'Servicios básicos', 'pi-bolt', 'expense', true, 2 FROM public.categories WHERE name = 'Hogar' AND parent_id IS NULL;
INSERT INTO public.categories (household_id, parent_id, name, icon, type, is_system, sort_order)
SELECT NULL, id, 'Mantención', 'pi-wrench', 'expense', true, 3 FROM public.categories WHERE name = 'Hogar' AND parent_id IS NULL;
INSERT INTO public.categories (household_id, parent_id, name, icon, type, is_system, sort_order)
SELECT NULL, id, 'Seguros', 'pi-shield', 'expense', true, 4 FROM public.categories WHERE name = 'Hogar' AND parent_id IS NULL;

-- Subcategorías Salud
INSERT INTO public.categories (household_id, parent_id, name, icon, type, is_system, sort_order)
SELECT NULL, id, 'Farmacia', 'pi-medicine-box', 'expense', true, 1 FROM public.categories WHERE name = 'Salud' AND parent_id IS NULL;
INSERT INTO public.categories (household_id, parent_id, name, icon, type, is_system, sort_order)
SELECT NULL, id, 'Consultas médicas', 'pi-user-plus', 'expense', true, 2 FROM public.categories WHERE name = 'Salud' AND parent_id IS NULL;
INSERT INTO public.categories (household_id, parent_id, name, icon, type, is_system, sort_order)
SELECT NULL, id, 'Exámenes', 'pi-file-edit', 'expense', true, 3 FROM public.categories WHERE name = 'Salud' AND parent_id IS NULL;

-- Ingresos
INSERT INTO public.categories (household_id, parent_id, name, icon, color, type, is_system, sort_order) VALUES
(NULL, NULL, 'Sueldo', 'pi-wallet', NULL, 'income', true, 101),
(NULL, NULL, 'Ahorro/Inversión', 'pi-chart-line', NULL, 'income', true, 102),
(NULL, NULL, 'Otros ingresos', 'pi-plus-circle', NULL, 'income', true, 103);

-- =============================================================================
-- TRANSACTIONS — Transacciones unificadas (ingreso, gasto, transferencia)
-- =============================================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  transfer_to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  recurring_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_household ON public.transactions(household_id);
CREATE INDEX idx_transactions_profile ON public.transactions(profile_id);
CREATE INDEX idx_transactions_account ON public.transactions(account_id);
CREATE INDEX idx_transactions_date ON public.transactions(household_id, date DESC);
CREATE INDEX idx_transactions_category ON public.transactions(category_id);

-- =============================================================================
-- RECEIPTS — Boletas (vinculadas a transaction_id)
-- =============================================================================
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  merchant TEXT,
  raw_ocr_text TEXT,
  raw_ocr_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_receipts_household ON public.receipts(household_id);
CREATE INDEX idx_receipts_transaction ON public.receipts(transaction_id);

-- =============================================================================
-- RECEIPT_ITEMS — Líneas de boleta (opcional: vincula con inventario)
-- =============================================================================
CREATE TABLE public.receipt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2),
  total_price DECIMAL(12, 2),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_receipt_items_receipt ON public.receipt_items(receipt_id);

-- =============================================================================
-- BUDGETS — Presupuesto por categoría y mes (con alert_threshold)
-- =============================================================================
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  alert_threshold INT NOT NULL DEFAULT 80 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, category_id, year, month)
);

CREATE INDEX idx_budgets_household ON public.budgets(household_id);
CREATE INDEX idx_budgets_period ON public.budgets(household_id, year, month);

-- =============================================================================
-- RECURRING_TRANSACTIONS — Gastos/ingresos recurrentes
-- =============================================================================
CREATE TABLE public.recurring_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
  day_of_month INT CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
  next_due_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_create BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_household ON public.recurring_transactions(household_id);
CREATE INDEX idx_recurring_next_due ON public.recurring_transactions(next_due_date) WHERE is_active = true;

-- FK recurring_id en transactions (después de crear recurring_transactions)
ALTER TABLE public.transactions
  ADD CONSTRAINT fk_transactions_recurring
  FOREIGN KEY (recurring_id) REFERENCES public.recurring_transactions(id) ON DELETE SET NULL;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- categories: semilla global readable by all; household categories by household
CREATE POLICY "categories_select" ON public.categories FOR SELECT USING (
  household_id IS NULL OR belongs_to_household(household_id)
);
CREATE POLICY "categories_insert" ON public.categories FOR INSERT WITH CHECK (belongs_to_household(household_id));
CREATE POLICY "categories_update" ON public.categories FOR UPDATE USING (belongs_to_household(household_id));
CREATE POLICY "categories_delete" ON public.categories FOR DELETE USING (belongs_to_household(household_id));

CREATE POLICY "accounts_all" ON public.accounts FOR ALL USING (belongs_to_household(household_id));
CREATE POLICY "transactions_all" ON public.transactions FOR ALL USING (belongs_to_household(household_id));
CREATE POLICY "receipts_all" ON public.receipts FOR ALL USING (belongs_to_household(household_id));
CREATE POLICY "budgets_all" ON public.budgets FOR ALL USING (belongs_to_household(household_id));
CREATE POLICY "recurring_all" ON public.recurring_transactions FOR ALL USING (belongs_to_household(household_id));

CREATE POLICY "receipt_items_all" ON public.receipt_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = receipt_id AND belongs_to_household(r.household_id))
);

-- =============================================================================
-- Realtime
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring_transactions;
