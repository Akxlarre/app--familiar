-- =============================================================================
-- FamilyApp — Últimos 4 dígitos en cuentas (tarjeta débito/crédito)
-- Permite enlazar alertas de email por card_last4 con la cuenta correcta.
-- =============================================================================

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4) NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_household_card_last4
  ON public.accounts(household_id, card_last4)
  WHERE card_last4 IS NOT NULL;

COMMENT ON COLUMN public.accounts.card_last4 IS 'Últimos 4 dígitos de la tarjeta (débito/crédito) para enlazar compras importadas desde email.';
