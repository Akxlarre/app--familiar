-- Función para crear hogar evitando RLS: ejecuta como postgres pero verifica auth.uid().
-- Se llama desde el frontend via supabase.rpc('create_household', { p_name, p_invite_code }).
-- Requiere que invite_code exista en households (migración 20250220100000).

CREATE OR REPLACE FUNCTION public.create_household(p_name TEXT, p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_household_id UUID;
  v_invite_code TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  INSERT INTO public.households (name, invite_code)
  VALUES (p_name, p_invite_code)
  RETURNING id, invite_code INTO v_household_id, v_invite_code;

  UPDATE public.profiles
  SET household_id = v_household_id, role = 'admin', updated_at = now()
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'household_id', v_household_id,
    'invite_code', v_invite_code
  );
END;
$$;

-- Permitir que usuarios autenticados llamen la función
GRANT EXECUTE ON FUNCTION public.create_household(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_household(TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.create_household IS 'Crea un hogar y asigna al usuario actual como admin. Bypasea RLS para evitar problemas con INSERT.';
