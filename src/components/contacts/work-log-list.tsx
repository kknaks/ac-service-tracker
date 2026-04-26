"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import type { ContactExtractionRow } from "@/types/contacts";
import { WORK_LOG_PAGE_SIZE } from "./constants";

const PAGE_SIZE = WORK_LOG_PAGE_SIZE;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WorkLogList({
  rows,
  total,
  page,
  selectedId,
}: {
  rows: ContactExtractionRow[];
  total: number;
  page: number;
  selectedId: string | null;
}) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (total === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            아직 추출된 작업 로그가 없습니다.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            우상단 [+ 엑셀 추가] 로 시작하세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b">
              <th className="py-2 px-3 font-medium">추출일</th>
              <th className="py-2 px-3 font-medium text-right">체크 작업 수</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isSelected = r.id === selectedId;
              return (
                <tr
                  key={r.id}
                  onClick={() =>
                    router.push(`/admin/contacts?log=${r.id}&page=${page}`)
                  }
                  className={`border-b last:border-0 cursor-pointer transition-colors ${
                    isSelected ? "bg-muted" : "hover:bg-muted/40"
                  }`}
                >
                  <td className="py-2 px-3">
                    {formatDateTime(r.extracted_at)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {r.items_count.toLocaleString("ko-KR")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-3 py-2">
            <span className="text-xs text-muted-foreground">
              총 {total.toLocaleString("ko-KR")}건
            </span>
            <Pagination
              page={page}
              totalPages={totalPages}
              selectedId={selectedId}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────
// 페이지네이션: < 1 2 3 4 5 >
// ────────────────────────────────────────────────────────────────

const WINDOW_SIZE = 5; // 한 번에 보여줄 최대 번호 수

function Pagination({
  page,
  totalPages,
  selectedId,
}: {
  page: number;
  totalPages: number;
  selectedId: string | null;
}) {
  const pages = computePageWindow(page, totalPages, WINDOW_SIZE);

  function hrefFor(p: number) {
    return `/admin/contacts?page=${p}${selectedId ? `&log=${selectedId}` : ""}`;
  }

  return (
    <div className="flex items-center gap-1">
      <PageLink
        href={hrefFor(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label="이전 페이지"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </PageLink>

      {pages.map((p) => (
        <PageLink
          key={p}
          href={hrefFor(p)}
          active={p === page}
          aria-label={`${p} 페이지`}
        >
          {p}
        </PageLink>
      ))}

      <PageLink
        href={hrefFor(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        aria-label="다음 페이지"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </PageLink>
    </div>
  );
}

function PageLink({
  href,
  active,
  disabled,
  children,
  ...rest
}: {
  href: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  const className = buttonVariants({
    variant: active ? "default" : "outline",
    size: "icon-sm",
    className: disabled ? "pointer-events-none opacity-50" : "",
  });

  if (disabled) {
    return (
      <span className={className} aria-disabled="true" {...rest}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} prefetch={false} className={className} {...rest}>
      {children}
    </Link>
  );
}

/**
 * 현재 페이지 주변 최대 windowSize 개의 페이지 번호 배열.
 * 예: page=4, total=10, window=5 → [2,3,4,5,6]
 *     page=1, total=10, window=5 → [1,2,3,4,5]
 *     page=10, total=10, window=5 → [6,7,8,9,10]
 */
function computePageWindow(
  page: number,
  totalPages: number,
  windowSize: number,
): number[] {
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, page - half);
  let end = start + windowSize - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - windowSize + 1);
  }
  const result: number[] = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
}

