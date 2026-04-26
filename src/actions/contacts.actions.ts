"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { contactExtractionService } from "@/services/contact_extraction.service";
import { fileSchema } from "@/lib/validations/sync.schema";
import type {
  CommitResult,
  NewContactItem,
  NewContactsPreviewResult,
} from "@/types/contacts";

/**
 * 모달 ① — 작업배정 엑셀 업로드 → 박진영 필터 → DB 비교 → 신규 row 반환.
 * DB 쓰지 않음 (preview only).
 */
export async function previewNewContacts(
  _prev: NewContactsPreviewResult | null,
  formData: FormData,
): Promise<NewContactsPreviewResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      errors: [{ source: "general", message: "인증이 필요합니다" }],
    };
  }

  const raw = formData.get("file");
  const file = raw instanceof File && raw.size > 0 ? raw : null;
  if (!file) {
    return {
      ok: false,
      errors: [{ source: "general", message: "파일을 선택해주세요" }],
    };
  }

  const parsed = fileSchema.safeParse(file);
  if (!parsed.success) {
    return {
      ok: false,
      errors: [
        {
          source: "general",
          message:
            parsed.error.issues[0]?.message ??
            "파일 형식이 올바르지 않습니다",
        },
      ],
    };
  }

  return await contactExtractionService.preview(file);
}

/**
 * 모달 ④ — 체크된 row 들 DB 저장 (트랜잭션).
 * 성공 시 inserted items 반환 (클라가 엑셀 다운로드).
 */
export async function commitContactExtraction(
  items: NewContactItem[],
): Promise<CommitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      errors: [{ source: "general", message: "인증이 필요합니다" }],
    };
  }

  const result = await contactExtractionService.commit(items, user.id);

  if (result.ok) {
    revalidatePath("/admin/contacts");
  }

  return result;
}
