-- =============================================================================
-- FamilyApp — Cuenta por defecto en parsers (para emails sin card_last4)
-- Cuando no hay coincidencia por últimos 4 dígitos, usar esta cuenta.
-- =============================================================================

ALTER TABLE public.bank_email_parsers
  ADD COLUMN IF NOT EXISTS default_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.bank_email_parsers.default_account_id IS 'Cuenta por defecto cuando el correo no incluye últimos 4 dígitos o hay múltiples coincidencias. Opcional.';
