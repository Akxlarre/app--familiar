-- =============================================================================
-- FamilyApp — Añadir payment_received a bank_email_parsers
-- Para correos "Te pagaron" que son ingresos, no gastos.
-- =============================================================================

ALTER TABLE public.bank_email_parsers DROP CONSTRAINT IF EXISTS bank_email_parsers_email_type_check;
ALTER TABLE public.bank_email_parsers
  ADD CONSTRAINT bank_email_parsers_email_type_check CHECK (
    email_type IN ('purchase_alert', 'statement', 'payment_confirmation', 'payment_received', 'installment_notice')
  );
