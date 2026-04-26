"use client";

import { useRef, useState, useTransition } from "react";
import { FileSpreadsheet, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { previewAssignmentExcel } from "@/actions/sync.actions";
import type {
  AssignmentPreviewResult,
  ParsedAssignmentRow,
} from "@/types/sync";

export function Step1Assignment({
  result,
  onResult,
}: {
  result: AssignmentPreviewResult | null;
  onResult: (r: AssignmentPreviewResult | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(picked: File | null) {
    setFile(picked);
    if (!picked) {
      onResult(null);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", picked);
      const r = await previewAssignmentExcel(null, fd);
      onResult(r);
    });
  }

  // 업로드 전
  if (!file) {
    return <DropPanel onPick={handleFile} />;
  }

  // 분석 중
  if (pending && !result) {
    return <LoadingPanel onReset={() => handleFile(null)} />;
  }

  // 실패
  if (result && !result.ok) {
    return (
      <ErrorPanel result={result} onReset={() => handleFile(null)} />
    );
  }

  // 성공 (정상 인식 0건 포함)
  if (result && result.ok) {
    return (
      <PreviewPanel
        rows={result.rows}
        errorRows={result.errorRows}
        onReset={() => handleFile(null)}
      />
    );
  }

  return null;
}

// ────────────────────────────────────────────────────────────────
// Drop zone
// ────────────────────────────────────────────────────────────────

function DropPanel({ onPick }: { onPick: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onPick(f);
  }

  return (
    <Card
      className={`border-2 border-dashed transition-colors h-[420px] ${
        over ? "border-primary bg-primary/5" : "border-muted-foreground/30"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <CardContent className="h-full flex flex-col items-center justify-center text-center px-4">
        <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">엑셀을 업로드해주세요</p>
        <p className="text-xs text-muted-foreground mt-1">
          .xlsx 드래그 또는 아래 버튼
        </p>
        <Button
          type="button"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
        >
          파일 선택
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
          }}
        />
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────
// 분석 중
// ────────────────────────────────────────────────────────────────

function LoadingPanel({ onReset }: { onReset: () => void }) {
  return (
    <Card className="h-[420px]">
      <CardContent className="h-full flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">분석 중...</p>
        <ResetLink onReset={onReset} />
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────
// 실패
// ────────────────────────────────────────────────────────────────

function ErrorPanel({
  result,
  onReset,
}: {
  result: { ok: false; errors: { source: string; message: string }[] };
  onReset: () => void;
}) {
  return (
    <Card className="border-destructive/40 h-[420px]">
      <CardContent className="h-full flex flex-col items-center justify-center text-center gap-3 px-6">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div className="space-y-1">
          {result.errors.map((e, i) => (
            <p key={i} className="text-sm">
              {e.message}
            </p>
          ))}
        </div>
        <ResetLink onReset={onReset} />
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────
// 미리보기
// ────────────────────────────────────────────────────────────────

function PreviewPanel({
  rows,
  errorRows,
  onReset,
}: {
  rows: ParsedAssignmentRow[];
  errorRows: number;
  onReset: () => void;
}) {
  return (
    <Card className="h-[420px]">
      <CardContent className="p-3 h-full flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {rows.length.toLocaleString("ko-KR")}행
            {errorRows > 0 && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                · 에러 {errorRows}
              </span>
            )}
          </span>
          <ResetLink onReset={onReset} />
        </div>
        <div className="flex-1 overflow-auto rounded-md border">
          <table className="w-full text-xs [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/60 z-10">
              <tr className="text-left">
                <th className="py-1.5 px-2 font-medium">접수번호</th>
                <th className="py-1.5 px-2 font-medium">주문일자</th>
                <th className="py-1.5 px-2 font-medium">요청일자</th>
                <th className="py-1.5 px-2 font-medium">기사 약속시간</th>
                <th className="py-1.5 px-2 font-medium">고객명</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-muted-foreground"
                  >
                    인식된 행이 없습니다
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr
                    key={`${r.external_no}-${i}`}
                    className="border-t hover:bg-muted/40"
                  >
                    <td className="py-1.5 px-2 font-mono">{r.external_no}</td>
                    <td className="py-1.5 px-2 tabular-nums">
                      {r.order_date ?? "—"}
                    </td>
                    <td className="py-1.5 px-2 tabular-nums">
                      {r.request_date ?? "—"}
                    </td>
                    <td className="py-1.5 px-2 tabular-nums">
                      {r.promised_time ?? "—"}
                    </td>
                    <td className="py-1.5 px-2">{r.customer_name ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ResetLink({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={onReset}
      className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
    >
      <X className="h-3 w-3" />
      변경
    </button>
  );
}
