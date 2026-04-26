import { contactExtractionRepo } from "@/repositories/contact_extraction.repo";
import { ExcelAddModal } from "@/components/contacts/excel-add-modal";
import {
  WorkLogList,
  WORK_LOG_PAGE_SIZE,
} from "@/components/contacts/work-log-list";
import { WorkLogDetail } from "@/components/contacts/work-log-detail";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; log?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const selectedLogId = sp.log ?? null;

  const offset = (page - 1) * WORK_LOG_PAGE_SIZE;
  const { rows, total } = await contactExtractionRepo.list({
    limit: WORK_LOG_PAGE_SIZE,
    offset,
  });

  // 선택된 로그가 없으면 첫 번째 행을 자동 선택 (있을 경우)
  const effectiveSelectedId =
    selectedLogId ?? (rows.length > 0 ? rows[0].id : null);

  let detailItems = null;
  let detailExtractedAt: string | null = null;
  if (effectiveSelectedId) {
    const detailRow =
      rows.find((r) => r.id === effectiveSelectedId) ??
      (await contactExtractionRepo.findById(effectiveSelectedId));
    if (detailRow) {
      detailItems = await contactExtractionRepo.itemsByExtractionId(
        effectiveSelectedId,
      );
      detailExtractedAt = detailRow.extracted_at;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">신규 접수</h1>
          <p className="text-sm text-muted-foreground mt-1">
            박진영 담당의 신규 접수번호를 추출해 컨택 전화번호 안내용
            엑셀로 내려받습니다.
          </p>
        </div>
        <ExcelAddModal />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground px-1">
          작업 로그
        </h2>
        <WorkLogList
          rows={rows}
          total={total}
          page={page}
          selectedId={effectiveSelectedId}
        />
      </section>

      {detailItems !== null && detailExtractedAt && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground px-1">
            신규 접수 내역
          </h2>
          <WorkLogDetail items={detailItems} extractedAt={detailExtractedAt} />
        </section>
      )}
    </div>
  );
}
