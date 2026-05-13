-- ============================================================
-- Remove usuário quebrado diretamente pelo banco
-- ============================================================

DO $$
DECLARE
  target_email TEXT := 'anabeatrizslompoc@gmail.com';
  target_id    UUID;
BEGIN
  SELECT id INTO target_id FROM auth.users WHERE email = target_email;

  IF target_id IS NULL THEN
    RAISE NOTICE 'Usuário não encontrado: %', target_email;
    RETURN;
  END IF;

  RAISE NOTICE 'Deletando: % (%)', target_email, target_id;

  DELETE FROM auth.sessions       WHERE user_id = target_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = target_id::text;
  DELETE FROM auth.mfa_factors    WHERE user_id = target_id;
  DELETE FROM auth.identities     WHERE user_id = target_id;
  DELETE FROM public.users        WHERE auth_id = target_id;
  DELETE FROM auth.users          WHERE id      = target_id;

  RAISE NOTICE 'Deletado com sucesso.';
END $$;
