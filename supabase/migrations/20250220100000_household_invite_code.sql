-- Añadir código de invitación al hogar (único, para unirse por código)
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_households_invite_code ON public.households(invite_code)
  WHERE invite_code IS NOT NULL;

COMMENT ON COLUMN public.households.invite_code IS 'Código corto para que otros miembros se unan al hogar (ej. CASA42XY).';
