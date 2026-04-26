"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import type { ContactExtractionRow } from "@/types/contacts";

const PAGE_SIZE = 5;

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
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <span>
              {page} / {totalPages} 페이지 · 총{" "}
              {total.toLocaleString("ko-KR")}건
            </span>
            <div className="flex gap-1">
              <Link
                href={`/admin/contacts?page=${Math.max(1, page - 1)}${
                  selectedId ? `&log=${selectedId}` : ""
                }`}
                aria-disabled={page <= 1}
                prefetch={false}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: page <= 1 ? "pointer-events-none opacity-50" : "",
                })}
              >
                이전
              </Link>
              <Link
                href={`/admin/contacts?page=${Math.min(
                  totalPages,
                  page + 1,
                )}${selectedId ? `&log=${selectedId}` : ""}`}
                aria-disabled={page >= totalPages}
                prefetch={false}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className:
                    page >= totalPages ? "pointer-events-none opacity-50" : "",
                })}
              >
                다음
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const WORK_LOG_PAGE_SIZE = PAGE_SIZE;
