-- ============================================================
-- Funções de administração de usuários
-- Execute no SQL Editor do Supabase
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- ── Criar usuário ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email    TEXT,
  p_password TEXT,
  p_name     TEXT,
  p_cpf      TEXT,
  p_role     TEXT DEFAULT 'student'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  new_auth_id UUID := gen_random_uuid();
BEGIN
  IF NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Não autorizado.';
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role,
    email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, raw_app_meta_data,
    is_super_admin, is_sso_user,
    confirmation_token, recovery_token,
    email_change_token_new, email_change,
    phone_change, phone_change_token,
    email_change_token_current, email_change_confirm_status,
    reauthentication_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_auth_id, 'authenticated', 'authenticated',
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    NOW(), NOW(), NOW(),
    jsonb_build_object('cpf', p_cpf),
    '{"provider":"email","providers":["email"]}'::jsonb,
    FALSE, FALSE,
    '', '', '', '', '', '', '', 0, ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at, provider_id
  ) VALUES (
    new_auth_id,
    new_auth_id,
    jsonb_build_object('sub', new_auth_id::text, 'email', p_email),
    'email',
    NOW(), NOW(), NOW(),
    p_email
  );

  INSERT INTO public.users (auth_id, cpf, name, email, role, is_active)
  VALUES (new_auth_id, p_cpf, p_name, p_email, p_role, TRUE);

  RETURN new_auth_id;
END;
$$;

-- ── Alterar senha de qualquer usuário (só professor pode) ─────
CREATE OR REPLACE FUNCTION public.admin_update_password(
  p_user_id  UUID,
  p_password TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  target_auth_id UUID;
BEGIN
  IF NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Não autorizado.';
  END IF;

  SELECT auth_id INTO target_auth_id
  FROM public.users WHERE id = p_user_id;

  IF target_auth_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  UPDATE auth.users
  SET
    encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
    updated_at         = NOW()
  WHERE id = target_auth_id;
END;
$$;

-- Permissões
REVOKE ALL ON FUNCTION public.admin_create_user   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_password FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_user    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_password TO authenticated;
