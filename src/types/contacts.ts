/**
 * /admin/contacts 페이지 + 모달 관련 도메인 타입.
 */

export type ContactExtractionRow = {
  id: string;
  extracted_at: string; // ISO timestamptz
  performed_by: string | null;
  items_count: number;
};

export type ContactExtractionItemRow = {
  id: string;
  extraction_id: string;
  external_no: string;
  order_date: string | null; // YYYY-MM-DD
  request_date: string | null;
  promised_time: string | null;
  customer_name: string | null;
  contact_phone: string | null;
  created_at: string;
};

/**
 * 모달의 신규 비교 후 사용자에게 보여줄 후보 row.
 * `commitContactExtraction` 호출 시 체크된 것만 골라 보낸다.
 */
export type NewContactItem = {
  external_no: string;
  order_date: string | null;
  request_date: string | null;
  promised_time: string | null;
  customer_name: string | null;
  contact_phone: string | null;
};

export type NewContactsPreviewSuccess = {
  ok: true;
  fileName: string;
  totalRows: number; // 파싱된 전체 행
  filteredRows: number; // 박진영 필터 후
  newCount: number; // DB 비교 후 신규
  newItems: NewContactItem[];
};

export type NewContactsPreviewFailure = {
  ok: false;
  errors: { source: "general"; message: string }[];
};

export type NewContactsPreviewResult =
  | NewContactsPreviewSuccess
  | NewContactsPreviewFailure;

export type CommitResult =
  | {
      ok: true;
      extractionId: string;
      items: ContactExtractionItemRow[];
    }
  | {
      ok: false;
      errors: { source: "general"; message: string }[];
    };
