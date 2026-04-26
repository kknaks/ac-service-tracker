"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  X,
  Loader2,
  AlertCircle,
  Download,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  previewNewContacts,
  commitContactExtraction,
} from "@/actions/contacts.actions";
import { downloadContactExtractionExcel } from "@/lib/excel-export";
import type {
  NewContactsPreviewResult,
  NewContactItem,
} from "@/types/contacts";

export function ExcelAddModal() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<NewContactsPreviewResult | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const router = useRouter();

  function reset() {
    setFile(null);
    setPreview(null);
    setChecked(new Set());
    setCommitError(null);
  }

  function handleClose() {
    setOpen(false);
    reset();
  }

  function handleFile(picked: File | null) {
    setFile(picked);
    setPreview(null);
    setChecked(new Set());
    setCommitError(null);
    if (!picked) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", picked);
      const r = await previewNewContacts(null, fd);
      setPreview(r);
      if (r.ok) {
        // 모든 신규를 기본 체크
        setChecked(new Set(r.newItems.map((i) => i.external_no)));
      }
    });
  }

  function toggle(externalNo: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(externalNo)) next.delete(externalNo);
      else next.add(externalNo);
      return next;
    });
  }

  function toggleAll(items: NewContactItem[]) {
    setChecked((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((i) => i.external_no));
    });
  }

  async function handleCommit() {
    if (!preview?.ok) return;
    const selected = preview.newItems.filter((i) =>
      checked.has(i.external_no),
    );
    if (selected.length === 0) return;

    setCommitting(true);
    setCommitError(null);
    const r = await commitContactExtraction(selected);
    setCommitting(false);

    if (!r.ok) {
      setCommitError(r.errors[0]?.message ?? "저장 실패");
      return;
    }

    // 엑셀 다운로드
    downloadContactExtractionExcel(r.items);

    // 모달 닫기 + 페이지 새로고침
    handleClose();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // ESC / 바깥 클릭으로는 닫지 않음 — 명시적 닫기 (X / 추출 버튼) 만 허용
        if (next) setOpen(true);
      }}
      disablePointerDismissal
    >
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        엑셀 추가
      </Button>

      <DialogContent
        className="!max-w-[min(1200px,calc(100vw-2rem))] max-h-[90vh] flex flex-col"
        showCloseButton={false}
      >
        <DialogHeader className="flex-row items-center justify-between gap-3">
          <DialogTitle>신규 접수 추출</DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleClose}
            disabled={committing}
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* 1단계: 드롭존 */}
          {!file && <DropPanel onPick={handleFile} />}

          {/* 분석 중 */}
          {file && pending && !preview && <LoadingPanel />}

          {/* 실패 */}
          {file && preview && !preview.ok && (
            <ErrorPanel
              messages={preview.errors.map((e) => e.message)}
              onReset={() => handleFile(null)}
            />
          )}

          {/* 신규 목록 */}
          {file && preview && preview.ok && (
            <NewItemsPanel
              file={file}
              preview={preview}
              checked={checked}
              onToggle={toggle}
              onToggleAll={() => toggleAll(preview.newItems)}
              onReset={() => handleFile(null)}
            />
          )}
        </div>

        {/* 하단 액션 바 */}
        {file && preview?.ok && (
          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <p className="text-sm">
              체크된{" "}
              <span className="font-semibold tabular-nums">
                {checked.size}
              </span>
              {" / "}신규{" "}
              <span className="font-semibold tabular-nums">
                {preview.newCount}
              </span>
              건
              {commitError && (
                <span className="ml-3 text-sm text-destructive">
                  {commitError}
                </span>
              )}
            </p>
            <Button
              size="lg"
              onClick={handleCommit}
              disabled={checked.size === 0 || committing}
            >
              {committing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              체크 후 엑셀 추출
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

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
      className={`border-2 border-dashed transition-colors ${
        over ? "border-primary bg-primary/5" : "border-muted-foreground/30"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <CardContent className="flex flex-col items-center justify-center text-center py-12 px-4 gap-2">
        <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">작업배정 엑셀을 업로드해주세요</p>
        <p className="text-xs text-muted-foreground">
          박진영 담당 신규 접수번호만 자동 추출
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
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

function LoadingPanel() {
  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          분석 + DB 비교 중...
        </p>
      </CardContent>
    </Card>
  );
}

function ErrorPanel({
  messages,
  onReset,
}: {
  messages: string[];
  onReset: () => void;
}) {
  return (
    <Card className="border-destructive/40">
      <CardContent className="py-8 flex flex-col items-center text-center gap-3">
        <AlertCircle className="h-7 w-7 text-destructive" />
        {messages.map((m, i) => (
          <p key={i} className="text-sm">
            {m}
          </p>
        ))}
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 mt-1"
        >
          <X className="h-3 w-3" />
          파일 변경
        </button>
      </CardContent>
    </Card>
  );
}

function NewItemsPanel({
  file,
  preview,
  checked,
  onToggle,
  onToggleAll,
  onReset,
}: {
  file: File;
  preview: { totalRows: number; filteredRows: number; newCount: number; newItems: NewContactItem[] };
  checked: Set<string>;
  onToggle: (externalNo: string) => void;
  onToggleAll: () => void;
  onReset: () => void;
}) {
  const allChecked =
    preview.newItems.length > 0 && checked.size === preview.newItems.length;

  return (
    <div className="space-y-3">
      {/* 요약 + 변경 */}
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="space-y-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">
            {file.name}
          </p>
          <p className="text-lg font-medium">
            전체{" "}
            <span className="tabular-nums font-semibold">
              {preview.filteredRows.toLocaleString("ko-KR")}
            </span>
            건
            <span className="mx-3 text-muted-foreground">·</span>
            신규{" "}
            <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
              {preview.newCount.toLocaleString("ko-KR")}
            </span>
            건
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="h-4 w-4" />
          파일 변경
        </button>
      </div>

      {preview.newCount === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            신규 접수가 없습니다 — 모두 이전에 추출된 항목.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-3">
            <div className="max-h-[60vh] overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/60 z-10">
                  <tr className="text-left">
                    <th className="py-1.5 px-2 w-8">
                      <Checkbox
                        checked={allChecked}
                        onCheckedChange={onToggleAll}
                        aria-label="전체 선택"
                      />
                    </th>
                    <th className="py-1.5 px-2 font-medium">접수번호</th>
                    <th className="py-1.5 px-2 font-medium">주문일자</th>
                    <th className="py-1.5 px-2 font-medium">요청일자</th>
                    <th className="py-1.5 px-2 font-medium">기사 약속시간</th>
                    <th className="py-1.5 px-2 font-medium">고객명</th>
                    <th className="py-1.5 px-2 font-medium">컨택 전화번호</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.newItems.map((it) => {
                    const isChecked = checked.has(it.external_no);
                    return (
                      <tr
                        key={it.external_no}
                        className="border-t hover:bg-muted/40 cursor-pointer"
                        onClick={() => onToggle(it.external_no)}
                      >
                        <td className="py-1.5 px-2">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => onToggle(it.external_no)}
                            aria-label={`${it.external_no} 선택`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="py-1.5 px-2 font-mono">
                          {it.external_no}
                        </td>
                        <td className="py-1.5 px-2 tabular-nums">
                          {it.order_date ?? "—"}
                        </td>
                        <td className="py-1.5 px-2 tabular-nums">
                          {it.request_date ?? "—"}
                        </td>
                        <td className="py-1.5 px-2 tabular-nums">
                          {it.promised_time ?? "—"}
                        </td>
                        <td className="py-1.5 px-2">
                          {it.customer_name ?? "—"}
                        </td>
                        <td className="py-1.5 px-2 font-mono">
                          {it.contact_phone ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
