/**
 * 동기화 오케스트레이터.
 *
 * 흐름:
 *   1. 파일별 파싱 (parsers/excel.ts)
 *   2. uploads insert + 각 테이블 upsertBatch
 *   3. 두 파일 모두 있으면: drift compareAndApply
 *   4. 결과 집계 반환
 */

import {
  parseAsExcel,
  parseAssignmentExcel,
} from "@/lib/parsers/excel";
import { uploadRepo } from "@/repositories/upload.repo";
import { asReceptionRepo } from "@/repositories/as_reception.repo";
import { workAssignmentRepo } from "@/repositories/work_assignment.repo";
import { driftService } from "@/services/drift.service";
import type {
  ProcessSyncResult,
  UploadSummary,
} from "@/types/sync";

type Input = {
  asFile: File | null;
  assignmentFile: File | null;
  userId: string | null;
};

export const syncService = {
  async process(input: Input): Promise<ProcessSyncResult> {
    const { asFile, assignmentFile, userId } = input;

    if (!asFile && !assignmentFile) {
      return {
        ok: false,
        errors: [
          { source: "general", message: "최소 한 파일은 업로드해야 합니다" },
        ],
      };
    }

    const errors: {
      source: "as" | "assignment" | "general";
      message: string;
    }[] = [];

    let asSummary: UploadSummary | undefined;
    const affectedKeys = new Set<string>();
    let lastUploadId: string | null = null;

    // ── AS 적재 ─────────────────────────────────────────
    if (asFile) {
      try {
        const buffer = await asFile.arrayBuffer();
        const parsed = parseAsExcel(buffer);
        const upload = await uploadRepo.create({
          kind: "as_reception",
          filename: asFile.name,
          uploaded_by: userId,
          total_rows: parsed.rows.length + parsed.errors.length,
        });
        const upserted = await asReceptionRepo.upsertBatch(
          parsed.rows.map((r) => ({ ...r, upload_id: upload.id })),
        );
        await uploadRepo.updateStats(upload.id, {
          inserted: upserted.inserted,
          updated: upserted.updated,
          errors_count: parsed.errors.length,
        });
        asSummary = {
          uploadId: upload.id,
          totalRows: parsed.rows.length + parsed.errors.length,
          inserted: upserted.inserted,
          updated: upserted.updated,
          errorsCount: parsed.errors.length,
        };
        parsed.rows.forEach((r) => affectedKeys.add(r.external_no));
        lastUploadId = upload.id;

        if (parsed.errors.length > 0) {
          parsed.errors.slice(0, 5).forEach((e) =>
            errors.push({
              source: "as",
              message: `행 ${e.rowNumber}: ${e.message}`,
            }),
          );
        }
      } catch (e) {
        errors.push({
          source: "as",
          message: `AS 처리 실패: ${(e as Error).message ?? "알 수 없음"}`,
        });
      }
    }

    let assignmentSummary: UploadSummary | undefined;

    // ── 작업배정 적재 ───────────────────────────────────
    if (assignmentFile) {
      try {
        const buffer = await assignmentFile.arrayBuffer();
        const parsed = parseAssignmentExcel(buffer);
        const upload = await uploadRepo.create({
          kind: "work_assignment",
          filename: assignmentFile.name,
          uploaded_by: userId,
          total_rows: parsed.rows.length + parsed.errors.length,
        });
        const upserted = await workAssignmentRepo.upsertBatch(
          parsed.rows.map((r) => ({ ...r, upload_id: upload.id })),
        );
        await uploadRepo.updateStats(upload.id, {
          inserted: upserted.inserted,
          updated: upserted.updated,
          errors_count: parsed.errors.length,
        });
        assignmentSummary = {
          uploadId: upload.id,
          totalRows: parsed.rows.length + parsed.errors.length,
          inserted: upserted.inserted,
          updated: upserted.updated,
          errorsCount: parsed.errors.length,
        };
        parsed.rows.forEach((r) => affectedKeys.add(r.external_no));
        lastUploadId = upload.id;

        if (parsed.errors.length > 0) {
          parsed.errors.slice(0, 5).forEach((e) =>
            errors.push({
              source: "assignment",
              message: `행 ${e.rowNumber}: ${e.message}`,
            }),
          );
        }
      } catch (e) {
        errors.push({
          source: "assignment",
          message: `작업배정 처리 실패: ${(e as Error).message ?? "알 수 없음"}`,
        });
      }
    }

    // ── 적재 모두 실패 ──────────────────────────────────
    if (!asSummary && !assignmentSummary) {
      return { ok: false, errors };
    }

    // ── drift 비교 (두 파일 모두 업로드 + 적재 성공) ──────
    const bothUploaded = !!(asFile && assignmentFile && asSummary && assignmentSummary);

    if (!bothUploaded) {
      return {
        ok: true,
        uploads: {
          asReception: asSummary,
          workAssignment: assignmentSummary,
        },
        comparison: { skipped: true, reason: "single_file" },
      };
    }

    const comparison = await driftService.compareAndApply(
      Array.from(affectedKeys),
      lastUploadId!,
    );

    return {
      ok: true,
      uploads: {
        asReception: asSummary,
        workAssignment: assignmentSummary,
      },
      comparison: { skipped: false, ...comparison },
    };
  },
};
