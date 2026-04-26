/**
 * 신규 접수 추출 오케스트레이터.
 *
 * preview 흐름:
 *   1. 작업배정 엑셀 파싱
 *   2. 박진영(변경 전.기사 명) 필터
 *   3. DB 의 contact_extraction_items.external_no set 과 비교
 *   4. 신규(set 에 없는) row 만 반환
 *
 * commit 흐름:
 *   1. 사용자가 체크한 row 들 받음
 *   2. extractions + items insert (트랜잭션)
 *   3. inserted rows 반환 (클라가 엑셀 다운로드)
 */

import { parseAssignmentExcel } from "@/lib/parsers/excel";
import { contactExtractionRepo } from "@/repositories/contact_extraction.repo";
import type {
  CommitResult,
  NewContactItem,
  NewContactsPreviewResult,
} from "@/types/contacts";

const TARGET_ENGINEER = "박진영";

export const contactExtractionService = {
  async preview(
    file: File,
  ): Promise<NewContactsPreviewResult> {
    const buffer = await file.arrayBuffer();
    const parsed = parseAssignmentExcel(buffer);

    if (parsed.rows.length === 0) {
      return {
        ok: false,
        errors: [
          {
            source: "general",
            message:
              parsed.errors[0]?.message ?? "인식된 데이터 행이 없습니다",
          },
        ],
      };
    }

    // 박진영 필터 (변경 전.기사 명)
    const filtered = parsed.rows.filter(
      (r) => r.assigned_engineer_before === TARGET_ENGINEER,
    );

    // DB 의 기존 external_no set
    const existingSet = await contactExtractionRepo.getExistingExternalNos();

    // 신규만
    const newItems: NewContactItem[] = filtered
      .filter((r) => !existingSet.has(r.external_no))
      .map((r) => ({
        external_no: r.external_no,
        order_date: r.order_date,
        request_date: r.request_date,
        promised_time: r.promised_time,
        customer_name: r.customer_name,
        contact_phone: r.contact_phone,
      }));

    return {
      ok: true,
      fileName: file.name,
      totalRows: parsed.rows.length,
      filteredRows: filtered.length,
      newCount: newItems.length,
      newItems,
    };
  },

  async commit(
    items: NewContactItem[],
    userId: string | null,
  ): Promise<CommitResult> {
    if (items.length === 0) {
      return {
        ok: false,
        errors: [{ source: "general", message: "체크된 항목이 없습니다" }],
      };
    }

    // 모든 external_no 형식 검증
    const invalid = items.find((i) => !/^AR\d+$/.test(i.external_no));
    if (invalid) {
      return {
        ok: false,
        errors: [
          {
            source: "general",
            message: `접수번호 형식 오류: ${invalid.external_no}`,
          },
        ],
      };
    }

    try {
      const { extractionId, items: insertedItems } =
        await contactExtractionRepo.createWithItems(items, userId);
      return { ok: true, extractionId, items: insertedItems };
    } catch (e) {
      return {
        ok: false,
        errors: [
          {
            source: "general",
            message: `저장 실패: ${(e as Error).message ?? "알 수 없음"}`,
          },
        ],
      };
    }
  },
};
