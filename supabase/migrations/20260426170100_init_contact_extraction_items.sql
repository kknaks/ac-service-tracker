-- 03-data-model · contact_extraction_items (v1)
-- 추출된 접수번호 영속. external_no UNIQUE = 신규 비교 기준.
-- 한 번 들어가면 영구히 "신규 아님".

CREATE TABLE IF NOT EXISTS public.contact_extraction_items (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id   uuid           NOT NULL
                                  REFERENCES public.contact_extractions(id)
                                  ON DELETE CASCADE,
  external_no     text           NOT NULL UNIQUE,
  order_date      date,
  request_date    date,
  promised_time   text,
  customer_name   text,
  contact_phone   text,
  created_at      timestamptz    NOT NULL DEFAULT now()
);

-- 접수번호 형식 검증 (AR + 숫자)
ALTER TABLE public.contact_extraction_items
  ADD CONSTRAINT contact_extraction_items_external_no_format
  CHECK (external_no ~ '^AR[0-9]+$');

-- 상세 조회 (logId → items)
CREATE INDEX IF NOT EXISTS contact_extraction_items_extraction_id_idx
  ON public.contact_extraction_items (extraction_id);

-- RLS
ALTER TABLE public.contact_extraction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_extraction_items_logged_in_select
  ON public.contact_extraction_items
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
