-- 03-data-model · work_assignments
-- 작업배정관리 적재. 접수번호(external_no) UNIQUE.

CREATE TABLE IF NOT EXISTS public.work_assignments (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  external_no     text           NOT NULL UNIQUE,
  request_date    date,
  customer_name   text,
  raw             jsonb          NOT NULL DEFAULT '{}'::jsonb,
  upload_id       uuid           REFERENCES public.uploads(id) ON DELETE SET NULL,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE public.work_assignments
  ADD CONSTRAINT work_assignments_external_no_format
  CHECK (external_no ~ '^AR[0-9]+$');

CREATE TRIGGER work_assignments_set_updated_at
  BEFORE UPDATE ON public.work_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.work_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_assignments_logged_in_select ON public.work_assignments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
