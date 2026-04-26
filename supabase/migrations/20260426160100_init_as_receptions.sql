-- 03-data-model · as_receptions
-- AS접수리스트 적재. 접수번호(external_no) UNIQUE.

CREATE TABLE IF NOT EXISTS public.as_receptions (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  external_no     text           NOT NULL UNIQUE,
  request_date    date,
  customer_name   text,
  raw             jsonb          NOT NULL DEFAULT '{}'::jsonb,
  upload_id       uuid           REFERENCES public.uploads(id) ON DELETE SET NULL,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz    NOT NULL DEFAULT now()
);

-- 접수번호 정규식 ('AR' + 숫자) — 데이터 무결성
ALTER TABLE public.as_receptions
  ADD CONSTRAINT as_receptions_external_no_format
  CHECK (external_no ~ '^AR[0-9]+$');

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER as_receptions_set_updated_at
  BEFORE UPDATE ON public.as_receptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.as_receptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY as_receptions_logged_in_select ON public.as_receptions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
