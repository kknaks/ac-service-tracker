---
title: 페이지 / 라우팅
status: agreed
tags: [routing, pages, app-router]
updated: 2026-04-26
parent: "[[README]]"
---

# 04 · 페이지 / 라우팅

상위: [[README]]
관련: [[02-architecture]] · [[06-permissions]] · [[07-pwa-responsive]]

## 디렉토리 구조 (App Router) — v1

```
app/
├── layout.tsx                # 루트 레이아웃 (테마)
├── page.tsx                  # 비로그인 → /login, 로그인 → /admin/dashboard
│
├── (auth)/
│   └── login/page.tsx        # 로그인 (단일 관리자)
│
└── (admin)/                  # 관리자 영역 (middleware 가드)
    ├── layout.tsx            # 데스크탑 사이드바 + 모바일 햄버거
    ├── dashboard/page.tsx    # 전체 현황 + drift 알림 배지
    ├── upload/page.tsx       # 두 엑셀 동시 업로드 + 결과 ([[specs/data-sync]])
    └── alerts/page.tsx       # 미해소 drift 리스트 ([[specs/data-sync]])
```

> 🔮 **v2 추가 예정** — `(field)/reservations`, `(field)/reservations/[id]`, `(field)/schedule`, `(admin)/members` 등. [[roadmap/v2-field]] 참조.

## 라우트 가드 정책

`middleware.ts` 에서 세션과 역할 검사.

| 경로 | 비로그인 | 로그인 (admin) |
|---|---|---|
| `/login` | ✅ | → `/admin/dashboard` |
| `/(admin)/*` | → `/login` | ✅ |
| `/` | → `/login` | → `/admin/dashboard` |

> v1 은 단일 관리자라 역할 분기 없음. v2 합류 시 `field` 역할 + `(field)/*` 가드 추가 ([[roadmap/v2-field]]).

> 권한의 진실은 RLS — 미들웨어는 UX 차원의 가드. 자세한 정책은 [[06-permissions]].

## 반응형 분기 원칙 (v1)

- v1 은 **데스크탑 우선** — 엑셀 업로드 / 테이블 / 알림 리스트가 데스크탑에 적합
- 모바일에서도 깨지지 않게 `md:` (≥ 768px) 기준 적당히 대응 (필수 정보 노출, 관리자 출장 시 확인 가능)

> 🔮 v2 (field) 합류 시 모바일 우선으로 재정렬 ([[07-pwa-responsive]] · [[roadmap/v2-field]])

## 페이지별 핵심 컴포넌트 (예정)

| 페이지 | 핵심 컴포넌트 | 데이터 |
|---|---|---|
| `/admin/dashboard` | `<DriftAlertBanner>`, `<RecentUploads>`, `<StatsCards>` | RSC + drift open count |
| `/admin/upload` | `<DualDropZone>` (AS+작업배정), `<UploadResultReport>` | Server Action `processSync` 결과 ([[specs/data-sync]]) |
| `/admin/alerts` | `<DriftList>`, `<DriftDetailDrawer>` | drift_alerts open ([[specs/data-sync]]) |

## TBD

- 다크모드 지원 여부
- v2 합류 시 (field) 라우트 / 컴포넌트 ([[roadmap/v2-field]])
