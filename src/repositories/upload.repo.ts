import {
  createClient,
  createServiceClient,
} from "@/lib/supabase/server";
import type { UploadKind, UploadRow } from "@/types/db";

export const uploadRepo = {
  async recent(limit: number): Promise<UploadRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("uploads")
      .select("*")
      .order("uploaded_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as UploadRow[];
  },

  async lastByKind(kind: UploadKind): Promise<UploadRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("uploads")
      .select("*")
      .eq("kind", kind)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as UploadRow | null;
  },

  /**
   * 새 업로드 배치 row 생성. service_role 로 RLS 우회.
   * 통계 컬럼은 적재 끝나면 update.
   */
  async create(input: {
    kind: UploadKind;
    filename: string;
    uploaded_by: string | null;
    total_rows: number;
  }): Promise<UploadRow> {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("uploads")
      .insert({
        kind: input.kind,
        filename: input.filename,
        uploaded_by: input.uploaded_by,
        total_rows: input.total_rows,
        inserted: 0,
        updated: 0,
        errors_count: 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data as UploadRow;
  },

  async updateStats(
    id: string,
    stats: { inserted: number; updated: number; errors_count: number },
  ): Promise<void> {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("uploads")
      .update(stats)
      .eq("id", id);
    if (error) throw error;
  },
};
