/**
 * 두 엑셀의 클라이언트 측 비교.
 *
 * 판정 (배정 기준):
 *   1) match                     양쪽 row 존재 + 요청일자 + 시간 모두 일치
 *   2) mismatch                  양쪽 row 존재 + 어느 하나 다름 (AS 갱신 필요)
 *   3) missing_in_as             배정에만 있고 AS 에 없음
 *   4) missing_in_assignment     AS 에만 있고 배정에 없음
 */

import type { ParsedAssignmentRow, ParsedAsRow } from "@/types/sync";

export type CompareKind =
  | "match"
  | "mismatch"
  | "missing_in_as"
  | "missing_in_assignment";

export type CompareRow = {
  external_no: string;
  customer_name: string | null;
  customer_no: string | null; // AS 측에서만 추출 — 작업배정에는 없음
  assignment_request_date: string | null;
  assignment_promised_time: string | null;
  as_request_date: string | null;
  as_promised_time: string | null;
  kind: CompareKind;
};

export type CompareSummary = {
  total: number;
  match: number;
  mismatch: number;
  missingInAs: number;
  missingInAssignment: number;
};

const KIND_PRIORITY: Record<CompareKind, number> = {
  mismatch: 0,
  missing_in_as: 1,
  missing_in_assignment: 2,
  match: 3,
};

export function compareRows(
  assignment: ParsedAssignmentRow[],
  as: ParsedAsRow[],
): { rows: CompareRow[]; summary: CompareSummary } {
  const aMap = new Map(assignment.map((r) => [r.external_no, r]));
  const sMap = new Map(as.map((r) => [r.external_no, r]));

  const allKeys = new Set<string>([
    ...assignment.map((r) => r.external_no),
    ...as.map((r) => r.external_no),
  ]);

  const rows: CompareRow[] = [];
  const summary: CompareSummary = {
    total: 0,
    match: 0,
    mismatch: 0,
    missingInAs: 0,
    missingInAssignment: 0,
  };

  for (const key of allKeys) {
    const a = aMap.get(key);
    const s = sMap.get(key);

    let kind: CompareKind;
    if (a && s) {
      const dateEq = (a.request_date ?? null) === (s.request_date ?? null);
      const timeEq = (a.promised_time ?? null) === (s.promised_time ?? null);
      kind = dateEq && timeEq ? "match" : "mismatch";
    } else if (a && !s) {
      kind = "missing_in_as";
    } else {
      kind = "missing_in_assignment";
    }

    rows.push({
      external_no: key,
      customer_name: a?.customer_name ?? s?.customer_name ?? null,
      customer_no: s?.customer_no ?? null,
      assignment_request_date: a?.request_date ?? null,
      assignment_promised_time: a?.promised_time ?? null,
      as_request_date: s?.request_date ?? null,
      as_promised_time: s?.promised_time ?? null,
      kind,
    });

    summary.total += 1;
    if (kind === "match") summary.match += 1;
    if (kind === "mismatch") summary.mismatch += 1;
    if (kind === "missing_in_as") summary.missingInAs += 1;
    if (kind === "missing_in_assignment") summary.missingInAssignment += 1;
  }

  rows.sort((a, b) => {
    const p = KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind];
    if (p !== 0) return p;
    return a.external_no.localeCompare(b.external_no);
  });

  return { rows, summary };
}
