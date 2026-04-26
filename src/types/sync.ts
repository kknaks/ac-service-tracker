/**
 * 동기화 / 업로드 관련 도메인 타입.
 * spec: docs/specs/data-sync.md
 */

export type ParsedAsRow = {
  external_no: string;
  received_date: string | null; // YYYY-MM-DD — AS의 접수일자 (col 2)
  request_date: string | null; // YYYY-MM-DD
  promised_time: string | null; // text — "HH:mm" or original
  contract_no: string | null;
  customer_no: string | null; // AS의 고객번호 (col 12). 작업배정에는 없음
  customer_name: string | null;
  raw: Record<string, unknown>;
};

export type ParsedAssignmentRow = {
  external_no: string;
  request_date: string | null; // YYYY-MM-DD
  order_date: string | null; // YYYY-MM-DD
  promised_time: string | null; // text — sentinel datetime 의 시간 부분 (예: "12:00")
  contract_no: string | null;
  contact_phone: string | null; // 컨택 전화번호 (col 12) — /admin/contacts 표시
  assigned_engineer_before: string | null; // 변경 전.기사 명 (col 42) — 박진영 필터
  customer_name: string | null;
  raw: Record<string, unknown>;
};

// ─── Step 2 (a) — preview only, no DB ────────────────────────

export type AssignmentPreviewSuccess = {
  ok: true;
  fileName: string;
  fileSize: number;
  totalRows: number; // parsed + errors
  parsedRows: number; // 정상 인식 + 검증 통과
  errorRows: number;
  errors: { rowNumber: number; message: string }[];
  rows: ParsedAssignmentRow[]; // 전체 정상 인식 행 (스크롤 미리보기용)
};

export type AssignmentPreviewFailure = {
  ok: false;
  errors: { source: "general"; message: string }[];
};

export type AssignmentPreviewResult =
  | AssignmentPreviewSuccess
  | AssignmentPreviewFailure;

export type AsPreviewSuccess = {
  ok: true;
  fileName: string;
  fileSize: number;
  totalRows: number;
  parsedRows: number;
  errorRows: number;
  errors: { rowNumber: number; message: string }[];
  rows: ParsedAsRow[];
};

export type AsPreviewFailure = {
  ok: false;
  errors: { source: "general"; message: string }[];
};

export type AsPreviewResult = AsPreviewSuccess | AsPreviewFailure;

export type ParseError = {
  rowNumber: number; // 1-indexed (엑셀 행번호 그대로)
  message: string;
};

export type ParseResult<T> = {
  rows: T[];
  errors: ParseError[];
};

export type UploadSummary = {
  uploadId: string;
  totalRows: number;
  inserted: number;
  updated: number;
  errorsCount: number;
};

export type ComparisonSkipped = {
  skipped: true;
  reason: "single_file" | "no_files";
};

export type ComparisonResult = {
  skipped: false;
  newDrifts: number;
  autoResolved: number;
  missingInAs: number;
  missingInAssignment: number;
};

export type ProcessSyncSuccess = {
  ok: true;
  uploads: {
    asReception?: UploadSummary;
    workAssignment?: UploadSummary;
  };
  comparison: ComparisonSkipped | ComparisonResult;
};

export type ProcessSyncFailure = {
  ok: false;
  errors: { source: "as" | "assignment" | "general"; message: string }[];
};

export type ProcessSyncResult = ProcessSyncSuccess | ProcessSyncFailure;
