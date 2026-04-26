/**
 * Drift 비교 / 적용 서비스.
 *
 * 핵심 룰:
 *   조인 키: external_no
 *   비교 필드: request_date (단 1쌍)
 *   classify:
 *     - 양쪽 존재 + 값 다름  → 'mismatch'
 *     - AS 만 존재          → 'missing_in_assignment'
 *     - 작업배정만 존재     → 'missing_in_as'
 *     - 양쪽 존재 + 값 일치 → 'ok'
 */

import { driftAlertRepo } from "@/repositories/drift_alert.repo";
import { asReceptionRepo } from "@/repositories/as_reception.repo";
import { workAssignmentRepo } from "@/repositories/work_assignment.repo";
import type { DriftKind } from "@/types/db";

type ClassifyResult =
  | { kind: "ok" }
  | {
      kind: DriftKind;
      as_value: unknown;
      assignment_value: unknown;
    };

export function classify(
  asDate: string | null | undefined,
  asExists: boolean,
  assignmentDate: string | null | undefined,
  assignmentExists: boolean,
): ClassifyResult {
  if (asExists && !assignmentExists) {
    return {
      kind: "missing_in_assignment",
      as_value: asDate ?? null,
      assignment_value: null,
    };
  }
  if (!asExists && assignmentExists) {
    return {
      kind: "missing_in_as",
      as_value: null,
      assignment_value: assignmentDate ?? null,
    };
  }
  // 양쪽 존재
  const a = asDate ?? null;
  const b = assignmentDate ?? null;
  if (a === b) return { kind: "ok" };
  return {
    kind: "mismatch",
    as_value: a,
    assignment_value: b,
  };
}

/**
 * 두 테이블 전체에서 external_no 를 union 한 뒤 classify.
 * 결과를 drift_alerts 에 반영 (open 생성/갱신, 일치는 자동 해소).
 *
 * 비교 대상이 되는 external_no 집합:
 *   - 이번 업로드에 등장한 키 (대부분)
 *   - + 기존 open 상태인 drift 의 키 (재업로드 시 일치 확인용)
 */
export const driftService = {
  async compareAndApply(
    affectedExternalNos: string[],
    lastUploadId: string,
  ): Promise<{
    newDrifts: number;
    autoResolved: number;
    missingInAs: number;
    missingInAssignment: number;
  }> {
    // open 인 drift 의 external_no 도 비교 후보에 합류 (자동 해소 가능)
    const openExternalNos = await driftAlertRepo.listOpenExternalNos();
    const allKeys = Array.from(
      new Set([...affectedExternalNos, ...openExternalNos]),
    );

    if (allKeys.length === 0) {
      return {
        newDrifts: 0,
        autoResolved: 0,
        missingInAs: 0,
        missingInAssignment: 0,
      };
    }

    const [asRows, assignmentRows] = await Promise.all([
      asReceptionRepo.findByExternalNos(allKeys),
      workAssignmentRepo.findByExternalNos(allKeys),
    ]);

    const asMap = new Map(asRows.map((r) => [r.external_no, r.request_date]));
    const assignmentMap = new Map(
      assignmentRows.map((r) => [r.external_no, r.request_date]),
    );

    let newDrifts = 0;
    let autoResolved = 0;
    let missingInAs = 0;
    let missingInAssignment = 0;

    for (const key of allKeys) {
      const asExists = asMap.has(key);
      const assignmentExists = assignmentMap.has(key);
      const result = classify(
        asMap.get(key),
        asExists,
        assignmentMap.get(key),
        assignmentExists,
      );

      if (result.kind === "ok") {
        const resolvedCount = await driftAlertRepo.resolveOpen(
          key,
          lastUploadId,
        );
        autoResolved += resolvedCount;
      } else {
        const action = await driftAlertRepo.upsertOpen({
          external_no: key,
          kind: result.kind,
          as_value: result.as_value,
          assignment_value: result.assignment_value,
          last_upload_id: lastUploadId,
        });
        if (action === "inserted") newDrifts += 1;
        if (result.kind === "missing_in_as") missingInAs += 1;
        if (result.kind === "missing_in_assignment") missingInAssignment += 1;
      }
    }

    return { newDrifts, autoResolved, missingInAs, missingInAssignment };
  },
};
