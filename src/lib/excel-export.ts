/**
 * 클라이언트 측 엑셀 다운로드 유틸 (xlsx 사용).
 */

import * as XLSX from "xlsx";
import type { ContactExtractionItemRow } from "@/types/contacts";
import type { CompareRow } from "@/lib/comparison";

function timeStamp(d: Date): string {
  return (
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0") +
    "_" +
    String(d.getHours()).padStart(2, "0") +
    String(d.getMinutes()).padStart(2, "0")
  );
}

/**
 * 신규 접수 추출 결과를 .xlsx 로 다운로드 트리거.
 * 파일명: 신규접수_YYYYMMDD_HHmm.xlsx
 */
export function downloadContactExtractionExcel(
  items: ContactExtractionItemRow[],
): void {
  const data = items.map((it) => ({
    접수번호: it.external_no,
    주문일자: it.order_date ?? "",
    요청일자: it.request_date ?? "",
    "기사 약속시간": it.promised_time ?? "",
    고객명: it.customer_name ?? "",
    "컨택 전화번호": it.contact_phone ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "신규 접수");

  XLSX.writeFile(wb, `신규접수_${timeStamp(new Date())}.xlsx`);
}

/**
 * 비교 결과의 "갱신 필요" 행만 엑셀로 다운로드.
 * AS 측에서 배정 값으로 수정해야 하는 항목들.
 */
export function downloadMismatchExcel(rows: CompareRow[]): void {
  const data = rows.map((r) => ({
    접수번호: r.external_no,
    고객명: r.customer_name ?? "",
    고객번호: r.customer_no ?? "",
    "배정 요청일자": r.assignment_request_date ?? "",
    "배정 시간": r.assignment_promised_time ?? "",
    "AS 요청일자": r.as_request_date ?? "",
    "AS 시간": r.as_promised_time ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "갱신 필요");

  XLSX.writeFile(wb, `갱신필요_${timeStamp(new Date())}.xlsx`);
}
