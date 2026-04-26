-- 03-data-model · drift_alerts
-- 검출된 drift 이력. (external_no, field) 의 open row 는 항상 최대 1개.

CREATE TABLE IF NOT EXISTS public.drift_alerts (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  external_no       text          NOT NULL,
  field             text          NOT NULL DEFAULT 'request_date',
  kind              text          NOT NULL CHECK (kind IN (
    'mismatch', 'missing_in_as', 'missing_in_assignment'
  )),
  as_value          jsonb,
  assignment_value  jsonb,
  detected_at       timestamptz   NOT NULL DEFAULT now(),
  resolved_at       timestamptz,
  resolved_by       text          CHECK (resolved_by IN ('auto', 'manual')),
  last_upload_id    uuid          REFERENCES public.uploads(id) ON DELETE SET NULL
);

-- 같은 (external_no, field) 의 open 은 동시에 최대 1건만 존재 (partial unique)
CREATE UNIQUE INDEX IF NOT EXISTS drift_alerts_open_uniq
  ON public.drift_alerts (external_no, field)
  WHERE resolved_at IS NULL;

-- alerts 페이지 조회용 (open + 정렬)
CREATE INDEX IF NOT EXISTS drift_alerts_open_detected_idx
  ON public.drift_alerts (detected_at DESC)
  WHERE resolved_at IS NULL;

-- kind 별 카운트용
CREATE INDEX IF NOT EXISTS drift_alerts_kind_idx
  ON public.drift_alerts (kind)
  WHERE resolved_at IS NULL;

-- 전체 시계열
CREATE INDEX IF NOT EXISTS drift_alerts_detected_idx
  ON public.drift_alerts (detected_at DESC);

-- RLS
ALTER TABLE public.drift_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY drift_alerts_logged_in_select ON public.drift_alerts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
