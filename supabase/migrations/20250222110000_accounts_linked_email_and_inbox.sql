-- =============================================================================
-- FamilyApp — linked_email en accounts, inbox_email en integrations y log
-- Enlace de cuentas por email (1 cuenta bancaria por email), sin card_last4.
-- =============================================================================

-- Cuentas: email del Gmail que recibe transacciones para esta cuenta
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS linked_email TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_linked_email
  ON public.accounts(household_id, linked_email)
  WHERE linked_email IS NOT NULL;

COMMENT ON COLUMN public.accounts.linked_email IS 'Email del Gmail que recibe transacciones para esta cuenta (1 cuenta por email).';

-- Integraciones: email del inbox conectado (poblado al conectar o al procesar)
ALTER TABLE public.email_integrations
  ADD COLUMN IF NOT EXISTS inbox_email TEXT NULL;

COMMENT ON COLUMN public.email_integrations.inbox_email IS 'Email del inbox Gmail conectado (Gmail address del usuario).';

-- Log: email del inbox de donde vino el correo (para matching con accounts.linked_email)
ALTER TABLE public.email_transactions_log
  ADD COLUMN IF NOT EXISTS inbox_email TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_email_transactions_log_inbox_email
  ON public.email_transactions_log(household_id, inbox_email)
  WHERE inbox_email IS NOT NULL;

COMMENT ON COLUMN public.email_transactions_log.inbox_email IS 'Email del inbox Gmail de donde se leyó el correo (para enlazar con accounts.linked_email).';
