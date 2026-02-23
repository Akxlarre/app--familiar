-- =============================================================================
-- FamilyApp — Detalles de tarjetas de crédito (límite, ciclo, vencimiento)
-- Fase 2a Sistema Financiero Inteligente
-- =============================================================================

CREATE TABLE public.credit_card_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  billing_cycle_day INT NOT NULL DEFAULT 1 CHECK (billing_cycle_day >= 1 AND billing_cycle_day <= 31),
  payment_due_day INT NOT NULL DEFAULT 10 CHECK (payment_due_day >= 1 AND payment_due_day <= 31),
  current_statement_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  minimum_payment DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (minimum_payment >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id)
);

CREATE INDEX idx_credit_card_details_account ON public.credit_card_details(account_id);

ALTER TABLE public.credit_card_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_card_details_all" ON public.credit_card_details
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND belongs_to_household(a.household_id))
  );

COMMENT ON TABLE public.credit_card_details IS 'Datos específicos de tarjetas de crédito: límite, día de corte, día de vencimiento, saldo de estado de cuenta.';
