-- =============================================================================
-- FamilyApp — Asegurar que RLS y políticas existan para TODAS las tablas
-- Migración de reparación: crea políticas faltantes sin romper las existentes.
-- =============================================================================

-- ---- email_integrations ----
ALTER TABLE public.email_integrations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_integrations' AND policyname = 'email_integrations_select_own') THEN
    CREATE POLICY "email_integrations_select_own" ON public.email_integrations FOR SELECT USING (profile_id = auth.uid()::uuid);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_integrations' AND policyname = 'email_integrations_insert_own') THEN
    CREATE POLICY "email_integrations_insert_own" ON public.email_integrations FOR INSERT WITH CHECK (profile_id = auth.uid()::uuid);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_integrations' AND policyname = 'email_integrations_update_own') THEN
    CREATE POLICY "email_integrations_update_own" ON public.email_integrations FOR UPDATE USING (profile_id = auth.uid()::uuid);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_integrations' AND policyname = 'email_integrations_delete_own') THEN
    CREATE POLICY "email_integrations_delete_own" ON public.email_integrations FOR DELETE USING (profile_id = auth.uid()::uuid);
  END IF;
END $$;

-- ---- bank_email_parsers ----
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bank_email_parsers') THEN
    EXECUTE 'ALTER TABLE public.bank_email_parsers ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bank_email_parsers' AND policyname = 'bank_email_parsers_select_household') THEN
      EXECUTE $p$CREATE POLICY "bank_email_parsers_select_household" ON public.bank_email_parsers FOR SELECT USING (
        household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid()::uuid)
      )$p$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bank_email_parsers' AND policyname = 'bank_email_parsers_insert_household') THEN
      EXECUTE $p$CREATE POLICY "bank_email_parsers_insert_household" ON public.bank_email_parsers FOR INSERT WITH CHECK (
        household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid()::uuid)
      )$p$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bank_email_parsers' AND policyname = 'bank_email_parsers_update_household') THEN
      EXECUTE $p$CREATE POLICY "bank_email_parsers_update_household" ON public.bank_email_parsers FOR UPDATE USING (
        household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid()::uuid)
      )$p$;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bank_email_parsers' AND policyname = 'bank_email_parsers_delete_household') THEN
      EXECUTE $p$CREATE POLICY "bank_email_parsers_delete_household" ON public.bank_email_parsers FOR DELETE USING (
        household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid()::uuid)
      )$p$;
    END IF;
  END IF;
END $$;

-- ---- email_transaction_log ----
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_transaction_log') THEN
    EXECUTE 'ALTER TABLE public.email_transaction_log ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_transaction_log' AND policyname = 'email_tx_log_select_household') THEN
      EXECUTE $p$CREATE POLICY "email_tx_log_select_household" ON public.email_transaction_log FOR SELECT USING (
        household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid()::uuid)
      )$p$;
    END IF;
  END IF;
END $$;

-- ---- Crear índices si faltan (IF NOT EXISTS) ----
CREATE INDEX IF NOT EXISTS idx_email_integrations_profile ON public.email_integrations(profile_id);
CREATE INDEX IF NOT EXISTS idx_email_integrations_household_active ON public.email_integrations(household_id) WHERE is_active = true;
