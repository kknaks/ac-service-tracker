import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 미들웨어에서 호출.
 * - 세션 쿠키를 갱신
 * - 보호 라우트(`/admin/*`) 비로그인 차단 → /login 으로 리다이렉트
 * - 로그인 상태에서 /login 접근 시 → /admin/upload 로 리다이렉트
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 세션 검증 — getUser 가 토큰 새로고침까지 처리
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isRootPath = path === "/";
  const isLoginPath = path.startsWith("/login");
  const isAdminPath = path.startsWith("/admin");

  // 루트는 인증 상태에 따라 분기
  if (isRootPath) {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/admin/upload" : "/login";
    return NextResponse.redirect(url);
  }

  // 비로그인이 보호 영역 접근
  if (!user && isAdminPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 로그인 상태에서 /login 재방문
  if (user && isLoginPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/upload";
    return NextResponse.redirect(url);
  }

  return response;
}
