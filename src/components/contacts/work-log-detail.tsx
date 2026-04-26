import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContactExtractionItemRow } from "@/types/contacts";

export function WorkLogDetail({
  items,
  extractedAt,
}: {
  items: ContactExtractionItemRow[];
  extractedAt: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          추출 일시 : {new Date(extractedAt).toLocaleString("ko-KR")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="max-h-[480px] overflow-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur supports-[backdrop-filter]:bg-muted/60 z-10">
              <tr className="text-left">
                <th className="py-1.5 px-2 font-medium">접수번호</th>
                <th className="py-1.5 px-2 font-medium">주문일자</th>
                <th className="py-1.5 px-2 font-medium">요청일자</th>
                <th className="py-1.5 px-2 font-medium">기사 약속시간</th>
                <th className="py-1.5 px-2 font-medium">고객명</th>
                <th className="py-1.5 px-2 font-medium">컨택 전화번호</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    항목이 없습니다
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="border-t hover:bg-muted/40">
                    <td className="py-1.5 px-2 font-mono">{it.external_no}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
