import {
  createClient,
  createServiceClient,
} from "@/lib/supabase/server";
import type {
  ContactExtractionItemRow,
  ContactExtractionRow,
  NewContactItem,
} from "@/types/contacts";

export const contactExtractionRepo = {
  /**
   * 작업 로그 리스트 (페이지네이션).
   * RSC 가 호출. 인증 사용자만 (RLS).
   */
  async list(opts: {
    limit: number;
    offset: number;
  }): Promise<{ rows: ContactExtractionRow[]; total: number }> {
    const supabase = await createClient();
    const { count, error: countError } = await supabase
      .from("contact_extractions")
      .select("*", { count: "exact", head: true });
    if (countError) throw countError;

    const { data, error } = await supabase
      .from("contact_extractions")
      .select("*")
      .order("extracted_at", { ascending: false })
      .range(opts.offset, opts.offset + opts.limit - 1);
    if (error) throw error;

    return {
      rows: (data ?? []) as ContactExtractionRow[],
      total: count ?? 0,
    };
  },

  async findById(id: string): Promise<ContactExtractionRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("contact_extractions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as ContactExtractionRow | null;
  },

  /**
   * 특정 batch 의 items 조회 (상세 화면).
   */
  async itemsByExtractionId(
    extractionId: string,
  ): Promise<ContactExtractionItemRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("contact_extraction_items")
      .select("*")
      .eq("extraction_id", extractionId)
      .order("external_no", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ContactExtractionItemRow[];
  },

  /**
   * 신규 비교용 — 영구히 등록된 모든 external_no 의 set.
   * 신규 판정: 박진영 후보 row 의 external_no 가 이 set 에 없으면 신규.
   */
  async getExistingExternalNos(): Promise<Set<string>> {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("contact_extraction_items")
      .select("external_no");
    if (error) throw error;
    return new Set((data ?? []).map((r) => r.external_no as string));
  },

  /**
   * 트랜잭션: extraction 1 row + items N rows insert.
   * Postgres 의 multi-row insert 는 단일 statement 라 atomic.
   * extractions insert 와 items insert 사이의 atomicity 는 RPC 로 보장하는 게 best.
   * v1 단순화 — 두 호출이지만 충분 (실패 시 보상 cleanup 은 TBD).
   */
  async createWithItems(
    items: NewContactItem[],
    performedBy: string | null,
  ): Promise<{ extractionId: string; items: ContactExtractionItemRow[] }> {
    const supabase = createServiceClient();

    const { data: extraction, error: ex1 } = await supabase
      .from("contact_extractions")
      .insert({
        performed_by: performedBy,
        items_count: items.length,
      })
      .select("*")
      .single();
    if (ex1) throw ex1;

    const extractionId = (extraction as ContactExtractionRow).id;

    if (items.length === 0) {
      return { extractionId, items: [] };
    }

    const insertRows = items.map((it) => ({
      extraction_id: extractionId,
      external_no: it.external_no,
      order_date: it.order_date,
      request_date: it.request_date,
      promised_time: it.promised_time,
      customer_name: it.customer_name,
      contact_phone: it.contact_phone,
    }));

    const { data: insertedItems, error: ex2 } = await supabase
      .from("contact_extraction_items")
      .insert(insertRows)
      .select("*");
    if (ex2) {
      // 보상 — extraction 도 삭제 시도 (atomicity best-effort)
      await supabase
        .from("contact_extractions")
        .delete()
        .eq("id", extractionId);
      throw ex2;
    }

    return {
      extractionId,
      items: (insertedItems ?? []) as ContactExtractionItemRow[],
    };
  },
};
