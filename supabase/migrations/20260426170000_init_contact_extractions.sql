-- 03-data-model · contact_extractions (v1)
-- 신규 접수 추출 batch 한 개 = 한 row.
-- "작업 로그 리스트" 의 데이터 소스.

CREATE TABLE IF NOT EXISTS public.contact_extractions (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  extracted_at    timestamptz    NOT NULL DEFAULT now(),
  performed_by    uuid           REFERENCES auth.users(id),
  items_count     int            NOT NULL DEFAULT 0
);

-- 작업 로그 시계열 페이지네이션
CREATE INDEX IF NOT EXISTS contact_extractions_extracted_at_idx
  ON public.contact_extractions (extracted_at DESC);

-- RLS — 로그인한 사용자만 SELECT.
-- INSERT/UPDATE 는 Server Action(service_role) 으로만 (RLS 우회).
ALTER TABLE public.contact_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_extractions_logged_in_select
  ON public.contact_extractions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
