-- =============================================================================
-- FamilyApp — Log de transacciones sugeridas desde email
-- Fase 3c/3d Sistema Financiero Inteligente
-- =============================================================================

CREATE TABLE public.email_transactions_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id TEXT NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  bank_parser_id UUID REFERENCES public.bank_email_parsers(id) ON DELETE SET NULL,
  raw_subject TEXT,
  raw_snippet TEXT,
  extracted_data JSONB NOT NULL DEFAULT '{}',
  confidence_score INT NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('auto_created', 'pending_review', 'rejected', 'failed')),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, email_id)
);

CREATE INDEX idx_email_transactions_log_household ON public.email_transactions_log(household_id);
CREATE INDEX idx_email_transactions_log_status ON public.email_transactions_log(household_id, status);
CREATE INDEX idx_email_transactions_log_profile ON public.email_transactions_log(profile_id);

ALTER TABLE public.email_transactions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_transactions_log_all" ON public.email_transactions_log
  FOR ALL USING (belongs_to_household(household_id));

COMMENT ON TABLE public.email_transactions_log IS 'Log de emails procesados: datos extraídos, confianza, estado (auto_created / pending_review / rejected / failed)';
