"use client";

import {
  GitCompare,
  X,
  AlertTriangle,
  CheckCircle2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { compareRows } from "@/lib/comparison";
import type {
  CompareKind,
  CompareRow,
  CompareSummary,
} from "@/lib/comparison";
import { downloadMismatchExcel } from "@/lib/excel-export";
import type {
  AssignmentPreviewSuccess,
  AsPreviewSuccess,
} from "@/types/sync";

const KIND_LABEL: Record<CompareKind, string> = {
  match: "일치",
  mismatch: "갱신 필요",
  missing_in_as: "AS 누락",
  missing_in_assignment: "배정 누락",
};

const KIND_BADGE: Record<CompareKind, string> = {
  match:
    "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/40",
  mismatch:
    "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/40",
  missing_in_as:
    "border-rose-300 text-rose-700 bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:bg-rose-950/40",
  missing_in_assignment:
    "border-slate-300 text-slate-600 bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:bg-slate-900/40",
};

export type CompareResult = {
  rows: CompareRow[];
  summary: CompareSummary;
};

export function Step3Compare({
  assignment,
  as,
  canCompare,
  result,
  onResult,
}: {
  assignment: AssignmentPreviewSuccess | null;
  as: AsPreviewSuccess | null;
  canCompare: boolean;
  result: CompareResult | null;
  onResult: (r: CompareResult | null) => void;
}) {
  function handleCompare() {
    if (!assignment || !as) return;
    onResult(compareRows(assignment.rows, as.rows));
  }

  function handleReset() {
    onResult(null);
  }

  if (!result) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            {canCompare
              ? "두 데이터의 요청일자 / 시간을 비교합니다."
              : "이전 단계가 완료되면 활성됩니다."}
          </p>
          <Button onClick={handleCompare} disabled={!canCompare}>
            <GitCompare className="mr-2 h-4 w-4" />
            비교 시작
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <ResultPanel result={result} onReset={handleReset} />;
}

// ────────────────────────────────────────────────────────────────

function ResultPanel({
  result,
  onReset,
}: {
  result: { rows: CompareRow[]; summary: CompareSummary };
  onReset: () => void;
}) {
  const { rows, summary } = result;
  const mismatchRows = rows.filter((r) => r.kind === "mismatch");

  return (
    <div className="space-y-4">
      <SummaryCard summary={summary} onReset={onReset} />
      <MismatchList rows={mismatchRows} />
      <Accordion>
        <AccordionItem value="all" className="border rounded-md bg-card px-4">
          <AccordionTrigger>
            <span className="text-sm font-medium">
              전체 비교 결과 ({summary.total.toLocaleString("ko-KR")}건)
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <CompareTable rows={rows} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────

function SummaryCard({
  summary,
  onReset,
}: {
  summary: CompareSummary;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-4 flex-wrap">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          <span className="text-muted-foreground">
            총 {summary.total.toLocaleString("ko-KR")}건
          </span>
          <SummaryDot kind="mismatch" count={summary.mismatch} />
          <SummaryDot kind="missing_in_as" count={summary.missingInAs} />
          <SummaryDot
            kind="missing_in_assignment"
            count={summary.missingInAssignment}
          />
          <SummaryDot kind="match" count={summary.match} />
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
          다시 비교
        </button>
      </CardContent>
    </Card>
  );
}

function SummaryDot({ kind, count }: { kind: CompareKind; count: number }) {
  const color =
    kind === "match"
      ? "bg-emerald-500"
      : kind === "mismatch"
        ? "bg-amber-500"
        : kind === "missing_in_as"
          ? "bg-rose-500"
          : "bg-slate-400";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span>
        {KIND_LABEL[kind]}{" "}
        <span className="tabular-nums font-medium">
          {count.toLocaleString("ko-KR")}
        </span>
      </span>
    </span>
  );
}

// ────────────────────────────────────────────────────────────────

function MismatchList({ rows }: { rows: CompareRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900">
        <CardContent className="py-6 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm">갱신 필요한 항목이 없습니다 — 모두 일치.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm font-medium">
              갱신 필요 {rows.length.toLocaleString("ko-KR")}건
            </p>
            <span className="text-xs text-muted-foreground truncate">
              · AS 측 요청일자 / 시간을 작업배정에 맞춰 수정 후 재업로드
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadMismatchExcel(rows)}
            className="shrink-0"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            엑셀로 추출
          </Button>
        </div>
        <CompareTable rows={rows} />
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────

function CompareTable({ rows }: { rows: CompareRow[] }) {
  return (
    <div className="max-h-[480px] overflow-auto rounded-md border bg-background">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/60 z-10">
          <tr className="text-left border-b">
            <th rowSpan={2} className="py-1.5 px-2 font-medium align-bottom">
              접수번호
            </th>
            <th rowSpan={2} className="py-1.5 px-2 font-medium align-bottom">
              고객명
            </th>
            <th rowSpan={2} className="py-1.5 px-2 font-medium align-bottom">
              고객번호
            </th>
            <th
              colSpan={2}
              className="py-1.5 px-2 font-medium text-center border-l"
            >
              배정
            </th>
            <th
              colSpan={2}
              className="py-1.5 px-2 font-medium text-center border-l"
            >
              AS
            </th>
            <th
              rowSpan={2}
              className="py-1.5 px-2 font-medium align-bottom border-l"
            >
              판정
            </th>
          </tr>
          <tr className="text-left">
            <th className="py-1 px-2 font-normal text-muted-foreground border-l">
              요청일자
            </th>
            <th className="py-1 px-2 font-normal text-muted-foreground">
              시간
            </th>
            <th className="py-1 px-2 font-normal text-muted-foreground border-l">
              요청일자
            </th>
            <th className="py-1 px-2 font-normal text-muted-foreground">
              시간
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="py-12 text-center text-muted-foreground"
              >
                항목이 없습니다
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.external_no} className="border-t hover:bg-muted/40">
                <td className="py-1.5 px-2 font-mono">{r.external_no}</td>
                <td className="py-1.5 px-2">{r.customer_name ?? "—"}</td>
                <td className="py-1.5 px-2 font-mono">
                  {r.customer_no ?? "—"}
                </td>
                <td className="py-1.5 px-2 tabular-nums border-l">
                  {r.assignment_request_date ?? "—"}
                </td>
                <td className="py-1.5 px-2 tabular-nums">
                  {r.assignment_promised_time ?? "—"}
                </td>
                <td className="py-1.5 px-2 tabular-nums border-l">
                  {r.as_request_date ?? "—"}
                </td>
                <td className="py-1.5 px-2 tabular-nums">
                  {r.as_promised_time ?? "—"}
                </td>
                <td className="py-1.5 px-2 border-l">
                  <Badge
                    variant="outline"
                    className={`font-normal ${KIND_BADGE[r.kind]}`}
                  >
                    {KIND_LABEL[r.kind]}
                  </Badge>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
