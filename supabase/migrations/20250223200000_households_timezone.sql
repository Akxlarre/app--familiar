-- Añadir timezone al hogar (para fechas de correos, transacciones, etc.)
-- IANA timezone: America/Santiago, America/New_York, Europe/Madrid, etc.
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Santiago';

COMMENT ON COLUMN public.households.timezone IS 'Zona horaria del hogar (IANA). Usada para fechas de correos bancarios y transacciones.';
