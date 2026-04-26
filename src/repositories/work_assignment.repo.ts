import {
  createClient,
  createServiceClient,
} from "@/lib/supabase/server";
import type { ParsedAssignmentRow } from "@/types/sync";

type UpsertInput = ParsedAssignmentRow & { upload_id: string };

export const workAssignmentRepo = {
  async count(): Promise<number> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("work_assignments")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  },

  async upsertBatch(
    input: UpsertInput[],
  ): Promise<{ inserted: number; updated: number }> {
    if (input.length === 0) return { inserted: 0, updated: 0 };

    const supabase = createServiceClient();
    const externalNos = input.map((r) => r.external_no);

    const { data: existing, error: selectError } = await supabase
      .from("work_assignments")
      .select("external_no")
      .in("external_no", externalNos);
    if (selectError) throw selectError;

    const existingSet = new Set(
      (existing ?? []).map((e) => e.external_no as string),
    );

    const { error: upsertError } = await supabase
      .from("work_assignments")
      .upsert(input, { onConflict: "external_no" });
    if (upsertError) throw upsertError;

    const updated = input.filter((r) =>
      existingSet.has(r.external_no),
    ).length;
    return { inserted: input.length - updated, updated };
  },

  async findByExternalNos(
    externalNos: string[],
  ): Promise<{ external_no: string; request_date: string | null }[]> {
    if (externalNos.length === 0) return [];
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("work_assignments")
      .select("external_no, request_date")
      .in("external_no", externalNos);
    if (error) throw error;
    return (data ?? []) as {
      external_no: string;
      request_date: string | null;
    }[];
  },
};
