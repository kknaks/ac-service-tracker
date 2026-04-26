import { z } from "zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const XLSX_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

/**
 * 업로드 파일 검증.
 * MIME 검증은 일부 환경에서 빈 문자열을 줄 수 있어 확장자 fallback 도 허용.
 */
export const fileSchema = z
  .instanceof(File)
  .refine((f) => f.size > 0, "빈 파일입니다")
  .refine(
    (f) => f.size <= MAX_FILE_SIZE,
    `파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다`,
  )
  .refine(
    (f) =>
      XLSX_MIME_TYPES.includes(f.type) ||
      f.name.toLowerCase().endsWith(".xlsx") ||
      f.name.toLowerCase().endsWith(".xls"),
    "엑셀 파일(.xlsx)만 업로드 가능합니다",
  );

export const externalNoSchema = z
  .string()
  .regex(/^AR\d+$/, "접수번호 형식이 올바르지 않습니다 (AR + 숫자)");

export type FileInput = z.infer<typeof fileSchema>;
