-- Asegurar que usuarios con sesión (auth.uid() presente) puedan crear un hogar.
-- No depende del rol: si el JWT trae uid, se permite el INSERT.

DROP POLICY IF EXISTS "households_insert" ON public.households;
CREATE POLICY "households_insert" ON public.households
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON POLICY "households_insert" ON public.households IS 'Permite crear un hogar a quien tenga sesión (auth.uid() no nulo).';
