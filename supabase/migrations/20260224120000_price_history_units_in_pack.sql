-- Añadir units_in_pack a price_history para registrar precios por pack
-- Cuando units_in_pack IS NOT NULL, price_clp es el precio del pack completo
ALTER TABLE public.price_history
  ADD COLUMN IF NOT EXISTS units_in_pack INTEGER NULL;

COMMENT ON COLUMN public.price_history.units_in_pack IS 'Si no null, price_clp es el precio del pack completo. Ej: pack de 6 cremas a 5940 = price_clp 5940, units_in_pack 6';
