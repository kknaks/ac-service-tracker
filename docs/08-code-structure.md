---
title: 코드 구조 (4-layer)
status: agreed
tags: [code-structure, conventions, architecture]
updated: 2026-04-25
parent: "[[README]]"
---

# 08 · 코드 구조 (엄격 4-layer)

상위: [[README]]
관련: [[02-architecture]] · [[05-flows]] · [[06-permissions]]

## 결정: A안 — 엄격 4-layer

모든 mutation은 **service 레이어를 경유**한다.
audit_log·트랜잭션·도메인 규칙을 service에서 일관되게 처리하기 위함이다.

## 디렉토리

```
src/
├── app/                       # FE: 라우트 / 페이지
│   ├── (auth)/                  # 로그인
│   ├── (admin)/                 # 관리자 영역
│   ├── (field)/                 # 현장직원 영역
│   └── _components/             # 라우트 전용 컴포넌트
├── components/                # FE: 공통 UI
│   └── ui/                      # shadcn 컴포넌트
├── actions/                   # API 레이어: Server Actions (얇은 controller)
├── services/                  # Service 레이어: 비즈니스 로직
├── repositories/              # DB 레이어: Supabase 호출 캡슐화
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # 브라우저 클라이언트
│   │   ├── server.ts            # RSC / Server Action 클라이언트
│   │   └── middleware.ts        # 미들웨어 클라이언트
│   ├── validations/             # zod 스키마 (엑셀 검증 포함)
│   └── utils.ts
└── types/
    ├── db.ts                    # Supabase 자동 생성 (`supabase gen types`)
    └── domain.ts                # 도메인 타입
```

## 호출 규칙 (단방향)

```
[Components] → [Server Actions] → [Services] → [Repositories] → [Supabase]
```

| 레이어 | 허용 | 금지 |
|---|---|---|
| Components | Server Action 호출 / RSC에서 repo 조회 호출 (read-only) | service·repo 직접 mutation |
| Server Actions | service 호출, zod 검증, 인증 확인, `revalidatePath` | supabase client 직접 import |
| Services | repo 호출, 다른 service 호출, 외부 API 호출 | supabase client 직접 import, Component import |
| Repositories | supabase client 사용 | 비즈니스 로직 / 권한 판단 / 검증 |

> **예외 1**: RSC 의 단순 조회는 `repo` 를 직접 import 가능 (성능·직렬화 비용 절감). mutation은 **무조건 action → service**.
> **예외 2**: 미들웨어에서 `lib/supabase/middleware.ts` 사용 가능.

## 파일 네이밍

| 레이어 | 패턴 | 예 |
|---|---|---|
| Server Action | `<domain>.actions.ts` | `reservation.actions.ts` |
| Service | `<domain>.service.ts` | `reservation.service.ts` |
| Repository | `<domain>.repo.ts` | `reservation.repo.ts` |
| Validation | `<domain>.schema.ts` | `reservation.schema.ts` |
| Component | PascalCase `.tsx` | `ReservationCard.tsx` |

## 의존성 그래프 강제

ESLint `eslint-plugin-boundaries` 또는 `import/no-restricted-paths` 로 컴파일 타임 차단.

```js
// 의도 (실제 설정은 코드 작성 시 lock-in)
{
  zones: [
    { target: "src/components", disallow: ["src/repositories", "src/services"] },
    { target: "src/app",        disallow: ["src/repositories"] /* RSC 조회는 예외 처리 */ },
    { target: "src/actions",    disallow: ["src/repositories"] /* service 경유 */ },
    { target: "src/services",   disallow: ["src/components", "src/app", "src/lib/supabase/client"] },
    { target: "src/repositories", allow: ["src/lib/supabase/server", "src/types"] },
  ]
}
```

## 예시 — 예약 상태 변경

```
[ReservationDetail.tsx]            (Component)
  └─ updateStatus(id, 'done')

[reservation.actions.ts]           (Server Action)
  - getUser() / 권한 검증
  - zod.parse({ id, nextStatus })
  └─ reservationService.changeStatus(...)

[reservation.service.ts]           (Service)
  - 상태 전이 규칙 검증 (pending → in_progress 등)
  - 트랜잭션 내에서:
      reservationRepo.updateStatus(...)
      auditRepo.insert(...)

[reservation.repo.ts]              (Repository)
  - supabase.from('reservations').update(...)
  - supabase.from('audit_log').insert(...)
```

## 트랜잭션 / 멀티 statement

Supabase JS 클라이언트는 멀티 statement 트랜잭션을 직접 지원하지 않는다.
다중 mutation이 필요한 경우:

1. **Postgres function (RPC)** 정의 → `repo.rpc('change_status_with_audit', ...)`
2. 단일 statement로 끝나는 경우는 그대로 두 번 호출 (실패 시 보상 처리)

선택 기준: 멱등성·실패 시 데이터 정합성 영향이 크면 RPC 우선.

## 에러 처리

- 도메인 에러는 `lib/errors.ts` 에 클래스로 정의
- Server Action은 `{ ok, data?, error? }` 형식으로 반환 (throw 대신)
- 사용자 메시지는 한국어, 원문 supabase 에러는 로그에만

## 테스트 (예정)

- Service 단위 테스트: repo를 mock
- Repository 통합 테스트: Supabase 로컬 인스턴스
- E2E: Playwright (현장 시나리오 우선)

## TBD

- 로깅·모니터링 도입 (Sentry 등)
- RPC 패턴이 많아지면 `supabase/functions` 디렉토리 분리
