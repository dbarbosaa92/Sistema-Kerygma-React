-- ============================================================
-- SALA VIRTUAL KERYGMA — Supabase Migration Script
-- Execute no SQL Editor do Dashboard do Supabase
-- ============================================================

-- Habilita extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELAS PRINCIPAIS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id     UUID UNIQUE,                        -- referência ao auth.users do Supabase
  cpf         VARCHAR(11) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  role        VARCHAR(10) NOT NULL DEFAULT 'student'
                CHECK (role IN ('student', 'teacher')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  last_viewed_notices TIMESTAMPTZ,
  content_access_date DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.courses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id    UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  content_type VARCHAR(10) NOT NULL DEFAULT 'video'
                 CHECK (content_type IN ('video', 'iframe')),
  media_url    TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.lesson_attachments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id     UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name   VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(100),
  file_size     INTEGER,
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exams (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id       UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  passing_score   DECIMAL(5,2) NOT NULL DEFAULT 60.00,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.questions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id       UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a      TEXT NOT NULL,
  option_b      TEXT NOT NULL,
  option_c      TEXT NOT NULL,
  option_d      TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.submissions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  exam_id    UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  score      DECIMAL(5,2),
  status     VARCHAR(15) NOT NULL DEFAULT 'in_progress'
               CHECK (status IN ('in_progress', 'completed')),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time   TIMESTAMPTZ,
  UNIQUE (user_id, exam_id)
);

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id  UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.notices (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id  UUID NOT NULL REFERENCES public.users(id),
  title      VARCHAR(255) NOT NULL,
  content    TEXT NOT NULL,
  category   VARCHAR(100),
  image_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_lessons_course ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_exams_course ON public.exams(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam ON public.questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_exam ON public.submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_notices_created ON public.notices(created_at DESC);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Atualiza updated_at em notices automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sincroniza auth_id ao fazer signup no Supabase Auth
-- Execute via trigger no schema auth (requer service_role)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET auth_id = NEW.id
  WHERE cpf = NEW.raw_user_meta_data->>'cpf';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices          ENABLE ROW LEVEL SECURITY;

-- Helper: verifica se o usuário logado é teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role = 'teacher'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: retorna o id interno do usuário logado
CREATE OR REPLACE FUNCTION public.my_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- USERS
CREATE POLICY "users_select_own"   ON public.users FOR SELECT USING (auth_id = auth.uid() OR public.is_teacher());
CREATE POLICY "users_update_own"   ON public.users FOR UPDATE USING (auth_id = auth.uid());
CREATE POLICY "users_all_teacher"  ON public.users FOR ALL    USING (public.is_teacher());

-- COURSES
CREATE POLICY "courses_select_all"    ON public.courses FOR SELECT USING (TRUE);
CREATE POLICY "courses_write_teacher" ON public.courses FOR ALL USING (public.is_teacher());

-- LESSONS
CREATE POLICY "lessons_select_all"    ON public.lessons FOR SELECT USING (TRUE);
CREATE POLICY "lessons_write_teacher" ON public.lessons FOR ALL USING (public.is_teacher());

-- LESSON ATTACHMENTS
CREATE POLICY "attachments_select_all"    ON public.lesson_attachments FOR SELECT USING (TRUE);
CREATE POLICY "attachments_write_teacher" ON public.lesson_attachments FOR ALL USING (public.is_teacher());

-- EXAMS
CREATE POLICY "exams_select_all"    ON public.exams FOR SELECT USING (TRUE);
CREATE POLICY "exams_write_teacher" ON public.exams FOR ALL USING (public.is_teacher());

-- QUESTIONS
CREATE POLICY "questions_select_all"    ON public.questions FOR SELECT USING (TRUE);
CREATE POLICY "questions_write_teacher" ON public.questions FOR ALL USING (public.is_teacher());

-- SUBMISSIONS — estudante vê apenas as suas; professor vê todas
CREATE POLICY "submissions_select_own"     ON public.submissions FOR SELECT USING (user_id = public.my_user_id() OR public.is_teacher());
CREATE POLICY "submissions_insert_own"     ON public.submissions FOR INSERT WITH CHECK (user_id = public.my_user_id());
CREATE POLICY "submissions_update_own"     ON public.submissions FOR UPDATE USING (user_id = public.my_user_id() OR public.is_teacher());

-- LESSON PROGRESS — estudante vê apenas o seu
CREATE POLICY "progress_select_own"  ON public.lesson_progress FOR SELECT USING (user_id = public.my_user_id() OR public.is_teacher());
CREATE POLICY "progress_insert_own"  ON public.lesson_progress FOR INSERT WITH CHECK (user_id = public.my_user_id());
CREATE POLICY "progress_update_own"  ON public.lesson_progress FOR UPDATE USING (user_id = public.my_user_id());

-- NOTICES
CREATE POLICY "notices_select_all"    ON public.notices FOR SELECT USING (TRUE);
CREATE POLICY "notices_write_teacher" ON public.notices FOR ALL USING (public.is_teacher());

-- ============================================================
-- STORAGE BUCKET para arquivos de aula
-- ============================================================
-- Execute via Dashboard: Storage > New Bucket > "lesson-files" (private)
-- Ou via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-files', 'lesson-files', FALSE)
ON CONFLICT DO NOTHING;

-- Política de acesso ao bucket
CREATE POLICY "storage_select_authenticated"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lesson-files' AND auth.role() = 'authenticated');

CREATE POLICY "storage_insert_teacher"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lesson-files' AND public.is_teacher());

CREATE POLICY "storage_delete_teacher"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lesson-files' AND public.is_teacher());
