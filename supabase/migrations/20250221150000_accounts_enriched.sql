-- =============================================================================
-- FamilyApp — Cuentas enriquecidas (owner, purpose, bank_name, digital_wallet)
-- Fase 1 Sistema Financiero Inteligente
-- =============================================================================

-- Add new columns to accounts
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS owner_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purpose TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- Allow 'digital_wallet' in type: drop existing check and add new one
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_type_check;

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_type_check CHECK (
    type IN ('bank', 'cash', 'credit_card', 'debit_card', 'savings', 'digital_wallet')
  );

CREATE INDEX IF NOT EXISTS idx_accounts_owner ON public.accounts(owner_profile_id);

COMMENT ON COLUMN public.accounts.owner_profile_id IS 'Dueño de la cuenta; NULL = compartida/hogar';
COMMENT ON COLUMN public.accounts.purpose IS 'Rol/propósito: personal, suscripciones, hogar, emergencias, etc.';
COMMENT ON COLUMN public.accounts.bank_name IS 'Nombre del banco para matching con emails (ej: BCI, Banco Estado)';
