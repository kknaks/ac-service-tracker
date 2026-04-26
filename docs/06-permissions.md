---
title: 인증 / 권한 (RLS)
status: agreed
tags: [auth, rls, permissions, supabase]
updated: 2026-04-26
parent: "[[README]]"
---

# 06 · 인증 / 권한 (v1)

상위: [[README]]
관련: [[02-architecture]] · [[03-data-model]] · [[05-flows]]

> v1 은 **단일 관리자**. 역할 분기 없음. v2 에서 `field` 역할 + 컬럼 단위 정책 추가 ([[roadmap/v2-field]]).

## 사용자 모델 (v1)

- **단일 관리자 1명**. Supabase `auth.users` 에 1 row 만 존재 (또는 운영 환경에서 소수의 admin 추가 가능).
- 별도 프로파일 테이블(`members`) 없음.
- 비로그인은 `/login` 외 모든 라우트 차단.

## 인증 메커니즘

- **공급자**: Supabase Auth (이메일 매직링크)
- **세션**: HTTP-only 쿠키 (`@supabase/ssr`)
- **갱신**: middleware 가 매 요청 갱신
- **로그아웃**: Server Action 에서 `signOut()` + 쿠키 삭제

## 미들웨어 (단순)

```ts
// middleware.ts (의도)
const session = await getSession();
if (!session && !isLoginPath) return redirect('/login');
if (session && isLoginPath) return redirect('/admin/dashboard');
```

역할 분기 없음 — 로그인했으면 모든 admin 라우트 통과.

## RLS 정책 (v1)

v1 은 단일 관리자라 정책이 단순하다. 두 가지 접근이 가능:

### 옵션 A — Secret Key 단독 (권장)

- 모든 mutation 은 Server Action 에서 `SUPABASE_SECRET_KEY` 로 실행 (구 service_role)
- 클라이언트는 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 로 SELECT 만 (구 anon)
- 테이블 RLS 는 "비로그인 차단" 만 가져감

```sql
ALTER TABLE as_receptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE drift_alerts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads          ENABLE ROW LEVEL SECURITY;

-- 로그인한 사용자만 SELECT (앱은 모든 mutation 을 service_role 로 처리)
CREATE POLICY logged_in_select_only ON as_receptions
  FOR SELECT USING (auth.uid() IS NOT NULL);
-- (work_assignments / drift_alerts / uploads 동일)
```

### 옵션 B — anon 으로 전체 R/W 정책

- 클라이언트가 직접 mutation 도 가능 (Server Action 비경유)
- v1 운영 단순성에는 매력적이나 [[08-code-structure]] 의 "mutation은 Server Action 경유" 룰을 어김
- 채택하지 않음

### 결정 — 옵션 A

[[08-code-structure]] 의 4-layer 룰과 정합.

## 키 사용 정책

| 작업 | 사용 키 | 이유 |
|---|---|---|
| 클라이언트 SELECT (RSC 등) | publishable | RLS 의 `auth.uid() IS NOT NULL` 통과 |
| 모든 mutation (upsert, drift_alerts insert/update) | secret | Server Action 내부에서만 |

> `SUPABASE_SECRET_KEY` 는 절대 클라이언트 번들에 포함하지 않는다. `process.env.SUPABASE_SECRET_KEY` 는 Server Action / middleware 에서만 접근. (구 `service_role` 시스템과 호환)

## 미들웨어 가드 vs RLS

| 계층 | 역할 |
|---|---|
| middleware | UX (잘못된 페이지 접근 시 친절한 리다이렉트) |
| RLS | 진실의 원천 (DB 가 거부) |

## v2 합류 시 갱신할 것

- `members` 테이블 + role 분기
- `field` 정책 — 본인 담당 row 만 SELECT, status 컬럼만 UPDATE
- 컬럼 단위 보호는 `BEFORE UPDATE` 트리거 또는 Server Action 강제
- 발급 방식 결정 (구 OQ-3)

상세는 [[roadmap/v2-field]] 의 "권한 / RLS" 절.

## TBD

- 운영 시작 시 admin 1명 외에 백업 admin 1명 추가 여부
- audit_log 도입 시점 (v1 에서도 업로드 추적은 `uploads` 테이블이 담당하므로 별도 audit 은 v2 와 함께)
