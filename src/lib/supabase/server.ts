import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * RSC / Server Action 에서 쓰는 인증된 클라이언트.
 * publishable key + 사용자 세션 쿠키 → RLS 적용된 권한.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // RSC 안에서 set 호출되면 throw — 미들웨어가 세션 갱신 처리하므로 여기선 무시
          }
        },
      },
    },
  );
}

/**
 * Server Action 전용 service_role 클라이언트.
 * RLS 우회. 일괄 upsert / drift_alerts insert 등 시스템 mutation 에 사용.
 *
 * ⚠️ 절대 클라이언트 번들에 포함되지 않도록 주의 — 호출은 Server Action 내부에서만.
 */
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // service client 는 세션 쿠키 다루지 않음
        },
      },
    },
  );
}
