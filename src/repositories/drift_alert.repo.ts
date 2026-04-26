import {
  createClient,
  createServiceClient,
} from "@/lib/supabase/server";
import type { DriftKind } from "@/types/db";

export const driftAlertRepo = {
  async openCount(): Promise<number> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("drift_alerts")
      .select("*", { count: "exact", head: true })
      .is("resolved_at", null);
    if (error) throw error;
    return count ?? 0;
  },

  /**
   * 모든 open drift 의 external_no 가져오기 (drift 비교 시 자동 해소 후보 검증용).
   */
  async listOpenExternalNos(): Promise<string[]> {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("drift_alerts")
      .select("external_no")
      .is("resolved_at", null);
    if (error) throw error;
    return (data ?? []).map((r) => r.external_no as string);
  },

  /**
   * 해당 external_no 의 open drift 를 자동 해소.
   * 영향받은 row 수 반환 (1 또는 0).
   */
  async resolveOpen(
    externalNo: string,
    lastUploadId: string,
  ): Promise<number> {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("drift_alerts")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: "auto",
        last_upload_id: lastUploadId,
      })
      .is("resolved_at", null)
      .eq("external_no", externalNo)
      .select("id");
    if (error) throw error;
    return data?.length ?? 0;
  },

  /**
   * (external_no, field='request_date') 의 open drift 를 신규 생성하거나 갱신.
   * 'inserted' 반환 = 새 drift 등장. 'updated' = 기존 open 의 detected_at 갱신.
   */
  async upsertOpen(input: {
    external_no: string;
    kind: DriftKind;
    as_value: unknown;
    assignment_value: unknown;
    last_upload_id: string;
  }): Promise<"inserted" | "updated"> {
    const supabase = createServiceClient();

    // 동일 (external_no, field) 의 open 존재 여부
    const { data: existing, error: selectError } = await supabase
      .from("drift_alerts")
      .select("id")
      .is("resolved_at", null)
      .eq("external_no", input.external_no)
      .eq("field", "request_date")
      .maybeSingle();
    if (selectError) throw selectError;

    if (existing) {
      const { error } = await supabase
        .from("drift_alerts")
        .update({
          kind: input.kind,
          as_value: input.as_value,
          assignment_value: input.assignment_value,
          detected_at: new Date().toISOString(),
          last_upload_id: input.last_upload_id,
        })
        .eq("id", (existing as { id: string }).id);
      if (error) throw error;
      return "updated";
    }

    const { error } = await supabase.from("drift_alerts").insert({
      external_no: input.external_no,
      field: "request_date",
      kind: input.kind,
      as_value: input.as_value,
      assignment_value: input.assignment_value,
      last_upload_id: input.last_upload_id,
    });
    if (error) throw error;
    return "inserted";
  },
};
