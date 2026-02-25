-- =============================================================================
-- FamilyApp — Inventory Module v1
-- Extiende products y crea tablas de alias, historial de precios y lista de compras.
-- =============================================================================

-- 1) Extender tabla products con campos de ubicación, vencimiento y metadatos
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT 'despensa'
    CHECK (location IN ('refrigerador','despensa','freezer','otro')),
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS name_normalized TEXT,
  ADD COLUMN IF NOT EXISTS default_unit TEXT NOT NULL DEFAULT 'unidad',
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Índice para consultas por vencimiento
CREATE INDEX IF NOT EXISTS idx_products_household_expiry
  ON public.products(household_id, expiry_date)
  WHERE expiry_date IS NOT NULL;

-- 2) Ampliar catálogo de categorías de productos
INSERT INTO public.product_categories (name, sort_order)
VALUES
  ('Lácteos', 10),
  ('Carnes', 11),
  ('Verduras/Frutas', 12),
  ('Despensa seca', 13),
  ('Congelados', 14),
  ('Bebidas', 15),
  ('Snacks', 16),
  ('Panadería', 17),
  ('Condimentos', 18)
ON CONFLICT (name) DO NOTHING;

-- 3) Tabla product_name_aliases — normalización progresiva de nombres de boleta
CREATE TABLE IF NOT EXISTS public.product_name_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, alias)
);

ALTER TABLE public.product_name_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_name_aliases_all"
ON public.product_name_aliases
FOR ALL
USING (belongs_to_household(household_id))
WITH CHECK (belongs_to_household(household_id));

CREATE INDEX IF NOT EXISTS idx_product_name_aliases_household_alias
  ON public.product_name_aliases(household_id, alias);

-- 4) Tabla price_history — historial de precios por producto y supermercado
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price_clp DECIMAL(12, 2) NOT NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  store_name TEXT,
  store_location TEXT,
  receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_history_all"
ON public.price_history
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = product_id
      AND belongs_to_household(p.household_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = product_id
      AND belongs_to_household(p.household_id)
  )
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_date
  ON public.price_history(product_id, purchase_date);

-- 5) Tablas shopping_lists y shopping_list_items — lista de compras
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Lista de compras',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','closed','archived')),
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopping_lists_all"
ON public.shopping_lists
FOR ALL
USING (belongs_to_household(household_id))
WITH CHECK (belongs_to_household(household_id));

CREATE INDEX IF NOT EXISTS idx_shopping_lists_household_status
  ON public.shopping_lists(household_id, status);

CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'unidad',
  is_checked BOOLEAN NOT NULL DEFAULT false,
  checked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ,
  price_at_purchase DECIMAL(12, 2),
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','low_stock','out_of_stock','recurring')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopping_list_items_all"
ON public.shopping_list_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.shopping_lists l
    WHERE l.id = list_id
      AND belongs_to_household(l.household_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.shopping_lists l
    WHERE l.id = list_id
      AND belongs_to_household(l.household_id)
  )
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list
  ON public.shopping_list_items(list_id, is_checked, sort_order);

-- 6) Ampliar receipts con nombre de comercio opcional y estado de procesamiento
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS store_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processed','failed'));

-- 7) Añadir tablas nuevas a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_list_items;
-- products ya está en la publicación desde la migración inicial

