-- =============================================================================
-- FamilyApp — Integración de email (Gmail OAuth) para automatización de finanzas
-- Fase 3a Sistema Financiero Inteligente
-- =============================================================================

CREATE TABLE public.email_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'gmail' CHECK (provider IN ('gmail')),
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, provider)
);

CREATE INDEX idx_email_integrations_profile ON public.email_integrations(profile_id);
CREATE INDEX idx_email_integrations_household_active ON public.email_integrations(household_id) WHERE is_active = true;

ALTER TABLE public.email_integrations ENABLE ROW LEVEL SECURITY;

-- Solo el propio perfil puede ver/actualizar su integración
CREATE POLICY "email_integrations_select_own" ON public.email_integrations
  FOR SELECT USING (profile_id = auth.uid()::uuid);

CREATE POLICY "email_integrations_insert_own" ON public.email_integrations
  FOR INSERT WITH CHECK (profile_id = auth.uid()::uuid);

CREATE POLICY "email_integrations_update_own" ON public.email_integrations
  FOR UPDATE USING (profile_id = auth.uid()::uuid);

CREATE POLICY "email_integrations_delete_own" ON public.email_integrations
  FOR DELETE USING (profile_id = auth.uid()::uuid);

-- Service role (Edge Functions) necesita leer/actualizar tokens por household para procesar emails
-- Las Edge Functions usan service_role y bypasean RLS; no se crea política para anon.

COMMENT ON TABLE public.email_integrations IS 'OAuth tokens por perfil para sincronización de email (ej: Gmail). El refresh_token permite obtener access_token en Edge Functions.';
