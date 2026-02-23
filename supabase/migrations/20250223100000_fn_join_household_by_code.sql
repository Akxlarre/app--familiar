-- Función para unirse a un hogar con código de invitación.
-- Bypasea RLS: el usuario no puede SELECT households si no es miembro, pero necesita
-- buscar por invite_code para unirse. Esta función hace el lookup y el update internamente.
-- Se llama desde el frontend via supabase.rpc('join_household_by_code', { p_code }).

CREATE OR REPLACE FUNCTION public.join_household_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_household_id UUID;
  v_normalized TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  v_normalized := upper(trim(coalesce(p_code, '')));
  IF v_normalized = '' THEN
    RAISE EXCEPTION 'El código es requerido';
  END IF;

  SELECT id INTO v_household_id
  FROM public.households
  WHERE invite_code = v_normalized
  LIMIT 1;

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'Código no válido';
  END IF;

  UPDATE public.profiles
  SET household_id = v_household_id, role = 'member', updated_at = now()
  WHERE id = v_uid;

  RETURN jsonb_build_object('household_id', v_household_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_household_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household_by_code(TEXT) TO service_role;

COMMENT ON FUNCTION public.join_household_by_code IS 'Une al usuario actual a un hogar usando el código de invitación. Bypasea RLS para permitir lookup por invite_code.';
