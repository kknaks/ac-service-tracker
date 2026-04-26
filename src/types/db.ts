/**
 * 수동 정의 DB 타입.
 * 추후 `supabase gen types typescript` 로 자동 생성 가능 — 지금은 수동.
 *
 * 마이그레이션과 동기화 유지: supabase/migrations/ 의 SQL 과 매칭.
 */

export type UploadKind = "as_reception" | "work_assignment";

export type DriftKind = "mismatch" | "missing_in_as" | "missing_in_assignment";

export type DriftField = "request_date";

export type ResolvedBy = "auto" | "manual";

export interface UploadRow {
  id: string;
  kind: UploadKind;
  filename: string;
  uploaded_by: string | null;
  uploaded_at: string; // ISO timestamptz
  total_rows: number;
  inserted: number;
  updated: number;
  errors_count: number;
  error_report: unknown | null;
}

export interface AsReceptionRow {
  id: string;
  external_no: string;
  request_date: string | null; // YYYY-MM-DD
  customer_name: string | null;
  raw: Record<string, unknown>;
  upload_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkAssignmentRow {
  id: string;
  external_no: string;
  request_date: string | null;
  customer_name: string | null;
  raw: Record<string, unknown>;
  upload_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriftAlertRow {
  id: string;
  external_no: string;
  field: DriftField;
  kind: DriftKind;
  as_value: unknown | null;
  assignment_value: unknown | null;
  detected_at: string;
  resolved_at: string | null;
  resolved_by: ResolvedBy | null;
  last_upload_id: string | null;
}
