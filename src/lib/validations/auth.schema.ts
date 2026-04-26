import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("이메일 형식이 올바르지 않습니다"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

export type SignInInput = z.infer<typeof signInSchema>;
