-- 03-data-model · uploads
-- 업로드 배치 메타. 다른 테이블에서 FK 로 참조되므로 가장 먼저.

CREATE TABLE IF NOT EXISTS public.uploads (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text           NOT NULL CHECK (kind IN ('as_reception', 'work_assignment')),
  filename        text           NOT NULL,
  uploaded_by     uuid           REFERENCES auth.users(id),
  uploaded_at     timestamptz    NOT NULL DEFAULT now(),
  total_rows      int            NOT NULL DEFAULT 0,
  inserted        int            NOT NULL DEFAULT 0,
  updated         int            NOT NULL DEFAULT 0,
  errors_count    int            NOT NULL DEFAULT 0,
  error_report    jsonb
);

CREATE INDEX IF NOT EXISTS uploads_uploaded_at_idx
  ON public.uploads (uploaded_at DESC);

CREATE INDEX IF NOT EXISTS uploads_kind_uploaded_at_idx
  ON public.uploads (kind, uploaded_at DESC);

-- RLS — admin only (06-permissions 옵션 A: 로그인 SELECT, mutation 은 service_role 만)
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY uploads_logged_in_select ON public.uploads
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
