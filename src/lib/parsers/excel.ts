/**
 * 엑셀 파서.
 *
 * AS접수리스트(SV00148):
 *   row 1 = 제목, row 2 = timestamp, row 3 = 헤더(43컬럼), row 4~ = 데이터
 *
 * 작업배정관리(SV00162):
 *   row 1 = 제목, row 2 = timestamp,
 *   row 3 = 메인 헤더 + 39열 '변경 전' / 51열 '변경 후' 그룹 라벨,
 *   row 4 = 빈 행, row 5 = sub 헤더 (변경 전/후 각 컬럼),
 *   row 6~ = 데이터
 *
 * 멀티헤더 평탄화: '변경 전.<sub>', '변경 후.<sub>' 형식.
 * 헤더 누락 컬럼은 `col_<N>` 으로 폴백.
 */

import * as XLSX from "xlsx";
import type {
  ParsedAsRow,
  ParsedAssignmentRow,
  ParseResult,
  ParseError,
} from "@/types/sync";

const AS_HEADER_LABELS = {
  externalNo: "접수 번호",
  receivedDate: "접수일자",
  requestDate: "A/S요청일자",
  promisedTime: "약속시간",
  contractNo: "계약번호",
  customerNo: "고객번호",
  customerName: "고객명",
} as const;

const ASSIGNMENT_HEADER_LABELS = {
  externalNo: "접수번호",
  requestDate: "요청일자",
  orderDate: "주문일자",
  promisedTime: "기사 약속시간",
  contractNo: "계약번호",
  contactPhone: "컨택 전화번호",
  customerName: "고객명",
  groupBefore: "변경 전",
  groupAfter: "변경 후",
  assignedEngineerBefore: "변경 전.기사 명", // sub header 평탄화 키
} as const;

// ────────────────────────────────────────────────────────────────
// 공통 유틸
// ────────────────────────────────────────────────────────────────

function readWorkbook(buffer: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: "array", cellDates: true });
}

/**
 * 일부 ERP export 는 sheet["!ref"] 가 부정확하게 저장되어 있어
 * sheet_to_json 이 일부 row 만 읽음. 실제 cell 키들로부터 ref 를 재계산해 덮어쓴다.
 */
function rebuildRef(sheet: XLSX.WorkSheet): void {
  const cells = Object.keys(sheet).filter((k) => !k.startsWith("!"));
  if (cells.length === 0) return;

  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;

  for (const k of cells) {
    const pos = XLSX.utils.decode_cell(k);
    if (pos.r < minR) minR = pos.r;
    if (pos.r > maxR) maxR = pos.r;
    if (pos.c < minC) minC = pos.c;
    if (pos.c > maxC) maxC = pos.c;
  }

  sheet["!ref"] = XLSX.utils.encode_range({
    s: { r: minR, c: minC },
    e: { r: maxR, c: maxC },
  });
}

function firstSheetRows(wb: XLSX.WorkBook): unknown[][] {
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  rebuildRef(sheet);
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    raw: false,
    defval: null,
  });
}

function trimToString(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return formatDate(v);
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toIsoDate(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    // 1970-01-01 등 sentinel 은 유의미한 값 아님
    if (v.getFullYear() < 1980) return null;
    return formatDate(v);
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    if (d.getFullYear() < 1980) return null;
    return formatDate(d);
  }
  return null;
}

/**
 * 시간 부분만 추출. datetime 또는 text 에서 "HH:mm" 형식으로 반환.
 * "00:00" 도 그대로 표시 (운영 측 의도 — sentinel 판단 안 함).
 */
function toTimeText(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    const hh = String(v.getHours()).padStart(2, "0");
    const mm = String(v.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  if (typeof v === "string") {
    const s = v.trim();
    return s.length === 0 ? null : s;
  }
  return null;
}

function buildRaw(
  effectiveHeaders: string[],
  row: unknown[],
): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  effectiveHeaders.forEach((header, idx) => {
    const cell = row[idx];
    if (cell === null || cell === undefined || cell === "") return;
    if (cell instanceof Date) {
      const iso = toIsoDate(cell);
      raw[header] = iso ?? cell.toISOString();
    } else {
      raw[header] = cell;
    }
  });
  return raw;
}

// ────────────────────────────────────────────────────────────────
// AS 접수리스트
// ────────────────────────────────────────────────────────────────

export function parseAsExcel(
  buffer: ArrayBuffer,
): ParseResult<ParsedAsRow> {
  const errors: ParseError[] = [];
  const rows: ParsedAsRow[] = [];

  let wb: XLSX.WorkBook;
  try {
    wb = readWorkbook(buffer);
  } catch (e) {
    return {
      rows,
      errors: [
        {
          rowNumber: 0,
          message: `엑셀 파싱 실패: ${(e as Error).message ?? "알 수 없음"}`,
        },
      ],
    };
  }

  const arr = firstSheetRows(wb);
  if (arr.length < 4) {
    return {
      rows,
      errors: [{ rowNumber: 0, message: "데이터 행이 없습니다" }],
    };
  }

  const headerRow = (arr[2] ?? []) as unknown[];
  const headers = headerRow.map((h, i) => trimToString(h) ?? `col_${i + 1}`);

  const externalNoIdx = headers.indexOf(AS_HEADER_LABELS.externalNo);
  const receivedDateIdx = headers.indexOf(AS_HEADER_LABELS.receivedDate);
  const requestDateIdx = headers.indexOf(AS_HEADER_LABELS.requestDate);
  const promisedTimeIdx = headers.indexOf(AS_HEADER_LABELS.promisedTime);
  const contractNoIdx = headers.indexOf(AS_HEADER_LABELS.contractNo);
  const customerNoIdx = headers.indexOf(AS_HEADER_LABELS.customerNo);
  const customerNameIdx = headers.indexOf(AS_HEADER_LABELS.customerName);

  if (externalNoIdx < 0 || requestDateIdx < 0) {
    return {
      rows,
      errors: [
        {
          rowNumber: 3,
          message: `필수 헤더 누락: '${AS_HEADER_LABELS.externalNo}' 또는 '${AS_HEADER_LABELS.requestDate}'`,
        },
      ],
    };
  }

  // 데이터 시작: row 4 (idx 3)
  for (let i = 3; i < arr.length; i++) {
    const rowNumber = i + 1; // 엑셀 1-indexed
    const row = (arr[i] ?? []) as unknown[];
    if (!row.some((v) => v !== null && v !== "")) continue;

    const externalNo = trimToString(row[externalNoIdx]);
    if (!externalNo) {
      errors.push({ rowNumber, message: "접수번호 누락" });
      continue;
    }
    if (!/^AR\d+$/.test(externalNo)) {
      errors.push({
        rowNumber,
        message: `접수번호 형식 오류: '${externalNo}'`,
      });
      continue;
    }

    rows.push({
      external_no: externalNo,
      received_date:
        receivedDateIdx >= 0 ? toIsoDate(row[receivedDateIdx]) : null,
      request_date: toIsoDate(row[requestDateIdx]),
      promised_time:
        promisedTimeIdx >= 0 ? toTimeText(row[promisedTimeIdx]) : null,
      contract_no:
        contractNoIdx >= 0 ? trimToString(row[contractNoIdx]) : null,
      customer_no:
        customerNoIdx >= 0 ? trimToString(row[customerNoIdx]) : null,
      customer_name:
        customerNameIdx >= 0 ? trimToString(row[customerNameIdx]) : null,
      raw: buildRaw(headers, row),
    });
  }

  return { rows, errors };
}

// ────────────────────────────────────────────────────────────────
// 작업배정관리 (멀티헤더)
// ────────────────────────────────────────────────────────────────

export function parseAssignmentExcel(
  buffer: ArrayBuffer,
): ParseResult<ParsedAssignmentRow> {
  const errors: ParseError[] = [];
  const rows: ParsedAssignmentRow[] = [];

  let wb: XLSX.WorkBook;
  try {
    wb = readWorkbook(buffer);
  } catch (e) {
    return {
      rows,
      errors: [
        {
          rowNumber: 0,
          message: `엑셀 파싱 실패: ${(e as Error).message ?? "알 수 없음"}`,
        },
      ],
    };
  }

  const arr = firstSheetRows(wb);
  if (arr.length < 6) {
    return {
      rows,
      errors: [{ rowNumber: 0, message: "데이터 행이 없습니다" }],
    };
  }

  // 작업배정은 row 3 (메인) + row 5 (sub) 멀티헤더
  // blankrows: false 옵션 때문에 빈 row 4 가 생략됨 — 인덱스 주의
  // 안전하게 raw 시트에서 다시 읽기 + ref 재계산 (ERP dimension 캐시 우회)
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  rebuildRef(sheet);
  const rawArr = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: true,
    raw: false,
    defval: null,
  });

  const mainHeader = (rawArr[2] ?? []) as unknown[];
  const subHeader = (rawArr[4] ?? []) as unknown[];

  // 그룹 시작 인덱스 찾기 (메인 헤더에서)
  let beforeStart = -1;
  let afterStart = -1;
  mainHeader.forEach((h, idx) => {
    const s = trimToString(h);
    if (s === ASSIGNMENT_HEADER_LABELS.groupBefore) beforeStart = idx;
    if (s === ASSIGNMENT_HEADER_LABELS.groupAfter) afterStart = idx;
  });

  const maxLen = Math.max(mainHeader.length, subHeader.length);
  const effectiveHeaders: string[] = new Array(maxLen).fill("").map((_, idx) => {
    const main = trimToString(mainHeader[idx]);
    const sub = trimToString(subHeader[idx]);

    // 변경 전 그룹
    if (beforeStart >= 0 && idx >= beforeStart && (afterStart < 0 || idx < afterStart)) {
      if (idx === beforeStart) {
        // 그룹 라벨 자체 — 데이터에 의미 없음
        return `${ASSIGNMENT_HEADER_LABELS.groupBefore}.${sub ?? `col_${idx + 1}`}`;
      }
      return `${ASSIGNMENT_HEADER_LABELS.groupBefore}.${sub ?? `col_${idx + 1}`}`;
    }
    // 변경 후 그룹
    if (afterStart >= 0 && idx >= afterStart) {
      if (idx === afterStart) {
        return `${ASSIGNMENT_HEADER_LABELS.groupAfter}.${sub ?? `col_${idx + 1}`}`;
      }
      return `${ASSIGNMENT_HEADER_LABELS.groupAfter}.${sub ?? `col_${idx + 1}`}`;
    }
    // 일반 컬럼
    return main ?? `col_${idx + 1}`;
  });

  const externalNoIdx = effectiveHeaders.indexOf(
    ASSIGNMENT_HEADER_LABELS.externalNo,
  );
  const requestDateIdx = effectiveHeaders.indexOf(
    ASSIGNMENT_HEADER_LABELS.requestDate,
  );
  const orderDateIdx = effectiveHeaders.indexOf(
    ASSIGNMENT_HEADER_LABELS.orderDate,
  );
  const promisedTimeIdx = effectiveHeaders.indexOf(
    ASSIGNMENT_HEADER_LABELS.promisedTime,
  );
  const contractNoIdx = effectiveHeaders.indexOf(
    ASSIGNMENT_HEADER_LABELS.contractNo,
  );
  const contactPhoneIdx = effectiveHeaders.indexOf(
    ASSIGNMENT_HEADER_LABELS.contactPhone,
  );
  const customerNameIdx = effectiveHeaders.indexOf(
    ASSIGNMENT_HEADER_LABELS.customerName,
  );
  const assignedEngineerBeforeIdx = effectiveHeaders.indexOf(
    ASSIGNMENT_HEADER_LABELS.assignedEngineerBefore,
  );

  if (externalNoIdx < 0 || requestDateIdx < 0) {
    return {
      rows,
      errors: [
        {
          rowNumber: 3,
          message: `필수 헤더 누락: '${ASSIGNMENT_HEADER_LABELS.externalNo}' 또는 '${ASSIGNMENT_HEADER_LABELS.requestDate}'`,
        },
      ],
    };
  }

  // 데이터는 row 6 (idx 5) 부터
  for (let i = 5; i < rawArr.length; i++) {
    const rowNumber = i + 1;
    const row = (rawArr[i] ?? []) as unknown[];
    if (!row.some((v) => v !== null && v !== "")) continue;

    const externalNo = trimToString(row[externalNoIdx]);
    if (!externalNo) {
      errors.push({ rowNumber, message: "접수번호 누락" });
      continue;
    }
    if (!/^AR\d+$/.test(externalNo)) {
      errors.push({
        rowNumber,
        message: `접수번호 형식 오류: '${externalNo}'`,
      });
      continue;
    }

    rows.push({
      external_no: externalNo,
      request_date: toIsoDate(row[requestDateIdx]),
      order_date: orderDateIdx >= 0 ? toIsoDate(row[orderDateIdx]) : null,
      promised_time:
        promisedTimeIdx >= 0 ? toTimeText(row[promisedTimeIdx]) : null,
      contract_no:
        contractNoIdx >= 0 ? trimToString(row[contractNoIdx]) : null,
      contact_phone:
        contactPhoneIdx >= 0 ? trimToString(row[contactPhoneIdx]) : null,
      assigned_engineer_before:
        assignedEngineerBeforeIdx >= 0
          ? trimToString(row[assignedEngineerBeforeIdx])
          : null,
      customer_name:
        customerNameIdx >= 0 ? trimToString(row[customerNameIdx]) : null,
      raw: buildRaw(effectiveHeaders, row),
    });
  }

  return { rows, errors };
}
