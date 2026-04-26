"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncService } from "@/services/sync.service";
import { fileSchema } from "@/lib/validations/sync.schema";
import {
  parseAsExcel,
  parseAssignmentExcel,
} from "@/lib/parsers/excel";
import type {
  AsPreviewResult,
  AssignmentPreviewResult,
  ProcessSyncResult,
} from "@/types/sync";

const PREVIEW_ERROR_LIMIT = 20;

/**
 * 작업배정관리 엑셀 미리보기.
 * Step 2 (a) — DB 저장하지 않고 추출 결과만 반환.
 * 인증 + 파일 검증 + 파서 호출.
 */
export async function previewAssignmentExcel(
  _prev: AssignmentPreviewResult | null,
  formData: FormData,
): Promise<AssignmentPreviewResult> {
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

  const buffer = await file.arrayBuffer();
  const result = parseAssignmentExcel(buffer);

  return {
    ok: true,
    fileName: file.name,
    fileSize: file.size,
    totalRows: result.rows.length + result.errors.length,
    parsedRows: result.rows.length,
    errorRows: result.errors.length,
    errors: result.errors.slice(0, PREVIEW_ERROR_LIMIT),
    rows: result.rows,
  };
}

/**
 * AS접수리스트 엑셀 미리보기.
 * Step 2 (preview only) — DB 저장하지 않음.
 */
export async function previewAsExcel(
  _prev: AsPreviewResult | null,
  formData: FormData,
): Promise<AsPreviewResult> {
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

  const buffer = await file.arrayBuffer();
  const result = parseAsExcel(buffer);

  return {
    ok: true,
    fileName: file.name,
    fileSize: file.size,
    totalRows: result.rows.length + result.errors.length,
    parsedRows: result.rows.length,
    errorRows: result.errors.length,
    errors: result.errors.slice(0, PREVIEW_ERROR_LIMIT),
    rows: result.rows,
  };
}

export async function processSync(
  formData: FormData,
): Promise<ProcessSyncResult> {
  // ── 인증 ────────────────────────────────────────────
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

  // ── 파일 추출 + 검증 ────────────────────────────────
  const asRaw = formData.get("asFile");
  const assignmentRaw = formData.get("assignmentFile");

  const asFile =
    asRaw instanceof File && asRaw.size > 0 ? asRaw : null;
  const assignmentFile =
    assignmentRaw instanceof File && assignmentRaw.size > 0 ? assignmentRaw : null;

  if (!asFile && !assignmentFile) {
    return {
      ok: false,
      errors: [
        { source: "general", message: "최소 한 개의 엑셀 파일이 필요합니다" },
      ],
    };
  }

  const errors: { source: "as" | "assignment" | "general"; message: string }[] =
    [];

  if (asFile) {
    const parsed = fileSchema.safeParse(asFile);
    if (!parsed.success) {
      errors.push({
        source: "as",
        message:
          parsed.error.issues[0]?.message ?? "AS 파일 형식이 올바르지 않습니다",
      });
    }
  }

  if (assignmentFile) {
    const parsed = fileSchema.safeParse(assignmentFile);
    if (!parsed.success) {
      errors.push({
        source: "assignment",
        message:
          parsed.error.issues[0]?.message ??
          "작업배정 파일 형식이 올바르지 않습니다",
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // ── service 위임 ─────────────────────────────────────
  const result = await syncService.process({
    asFile,
    assignmentFile,
    userId: user.id,
  });

  if (result.ok) {
    revalidatePath("/admin/upload");
    revalidatePath("/admin/alerts");
    revalidatePath("/admin/upload");
  }

  return result;
}
