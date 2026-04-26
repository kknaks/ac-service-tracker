import { UploadFlow } from "@/components/upload/upload-flow";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">배정/AS 비교</h1>
        <p className="text-sm text-muted-foreground mt-1">
          작업배정관리 → AS접수리스트 순으로 업로드 후 두 데이터를 비교합니다.
        </p>
      </div>
      <UploadFlow />
    </div>
  );
}
