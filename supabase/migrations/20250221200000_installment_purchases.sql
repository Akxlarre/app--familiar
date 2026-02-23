-- =============================================================================
-- FamilyApp — Compras en cuotas (tarjetas de crédito)
-- Fase 2b Sistema Financiero Inteligente
-- =============================================================================

CREATE TABLE public.installment_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount > 0),
  installment_count INT NOT NULL CHECK (installment_count >= 1),
  installments_paid INT NOT NULL DEFAULT 0 CHECK (installments_paid >= 0 AND installments_paid <= installment_count),
  installment_amount DECIMAL(12, 2) NOT NULL CHECK (installment_amount > 0),
  interest_rate DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
  purchase_date DATE NOT NULL,
  first_installment_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_installment_purchases_household ON public.installment_purchases(household_id);
CREATE INDEX idx_installment_purchases_account ON public.installment_purchases(account_id);
CREATE INDEX idx_installment_purchases_active ON public.installment_purchases(household_id, is_active) WHERE is_active = true;

ALTER TABLE public.installment_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "installment_purchases_all" ON public.installment_purchases
  FOR ALL USING (belongs_to_household(household_id));

COMMENT ON TABLE public.installment_purchases IS 'Compras en cuotas con tarjeta de crédito: total, cuotas, pagadas, monto por cuota, tasa de interés.';
