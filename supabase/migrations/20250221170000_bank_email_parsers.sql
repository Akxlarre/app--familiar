-- =============================================================================
-- FamilyApp — Parsers de email bancario (configurables por hogar)
-- Fase 3b Sistema Financiero Inteligente
-- =============================================================================

CREATE TABLE public.bank_email_parsers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  sender_pattern TEXT NOT NULL,
  subject_pattern TEXT,
  body_rules JSONB NOT NULL DEFAULT '{}',
  email_type TEXT NOT NULL CHECK (email_type IN ('purchase_alert', 'statement', 'payment_confirmation', 'installment_notice')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_email_parsers_household ON public.bank_email_parsers(household_id);
CREATE INDEX idx_bank_email_parsers_active ON public.bank_email_parsers(household_id, is_active) WHERE is_active = true;

ALTER TABLE public.bank_email_parsers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_email_parsers_all" ON public.bank_email_parsers
  FOR ALL USING (belongs_to_household(household_id));

COMMENT ON TABLE public.bank_email_parsers IS 'Reglas de parsing por banco: sender_pattern (ej: alertas@bci.cl), subject_pattern (regex), body_rules (JSON con regex para monto, comercio, etc.)';
COMMENT ON COLUMN public.bank_email_parsers.body_rules IS 'JSON: { "amount_regex": "...", "merchant_regex": "...", "card_last4_regex": "...", "date_regex": "..." }';
