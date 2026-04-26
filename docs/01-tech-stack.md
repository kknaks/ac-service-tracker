---
title: 기술 스택
status: agreed
tags: [tech-stack, decision]
updated: 2026-04-26
parent: "[[README]]"
---

# 01 · 기술 스택

상위: [[README]]

## 선택

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | **Next.js 15 (App Router)** | RSC + Server Actions로 별도 백엔드 불필요 |
| BaaS | **Supabase** | Auth + Postgres(RLS) + Realtime 일체형 |
| UI | **Tailwind CSS + shadcn/ui** | 반응형, 모바일 친화, 커스터마이즈 용이 |
| 엑셀 파싱 | **SheetJS (`xlsx`)** | Server Action에서 파싱 → 그대로 폐기 |
| 폼/검증 | **react-hook-form + zod** | 엑셀 행 검증에도 zod 스키마 재사용 |
| 데이터 페칭 | **TanStack Query** | Realtime 구독 + 캐시 |
| 패키지 매니저 | **pnpm** | 워크스페이스 확장 여지 |
| 런타임 / 배포 | **Vercel** | Next.js 정합성, 무중단 배포 |

## 의존성 메모

- `xlsx` 는 npm 공식 채널 사용 (CDN 버전 보안 이슈 회피).
- `shadcn/ui` 는 컴포넌트를 `components/ui/` 로 직접 가져오므로 라이브러리 lock-in 없음.
- 인증은 `@supabase/ssr` 로 RSC + middleware 환경 대응.

## 의도적으로 배제

- **별도 백엔드(Express/NestJS 등)**: 비즈니스 로직 단순 + RLS로 권한 충분.
- **자체 인증 구현**: Supabase Auth 사용.
- **Storage 사용**: 엑셀 원본 보관 불필요 → 파싱 후 폐기.
- **Redux/Zustand 글로벌 상태**: 서버 상태는 TanStack Query, 클라 상태 최소화.

## v1 / v2 스택 분리

v1 은 관리자 단독 운영이라 아래 항목은 **v2 ([[roadmap/v2-field]])** 로 이관:

- `@ducanh2912/next-pwa` — PWA (현장직원 모바일 사용 시 도입)
- 모바일 우선 디자인 토큰 — v1 은 데스크탑 우선
