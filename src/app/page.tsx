import { redirect } from "next/navigation";

/**
 * Fallback. 실제로는 middleware 가 `/` 를 인증 상태에 따라
 * /admin/upload 또는 /login 으로 리다이렉트한다.
 */
export default function RootPage() {
  redirect("/login");
}
