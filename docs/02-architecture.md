---
title: 아키텍처
status: agreed
tags: [architecture, system-design]
updated: 2026-04-26
parent: "[[README]]"
---

# 02 · 아키텍처

상위: [[README]]
관련: [[01-tech-stack]] · [[05-flows]] · [[06-permissions]]

## 개요

별도 백엔드 없이 **Next.js Server Action**이 얇은 데이터 게이트웨이 역할을 하고,
**Supabase**가 인증/저장/실시간을 모두 담당한다.

## 시스템 구성 (v1)

```mermaid
flowchart LR
  Admin["관리자 (Desktop)"]

  subgraph Server["Server (Next.js on Vercel)"]
    SA["Server Actions<br/>(엑셀 파싱, drift 비교)"]
    MW["middleware<br/>(세션 검증)"]
  end

  subgraph SB["Supabase Cloud"]
    Auth["Auth<br/>(이메일/매직링크)"]
    DB[("Postgres<br/>(RLS 단순 — admin only)")]
  end

  Admin -- 두 엑셀 업로드 --> SA
  SA -- upsert/insert --> DB
  Admin -. 세션 .-> MW
  MW <--> Auth
  Admin <-- drift 알림 (RSC) --- SA
```

> 🔮 **v2 추가 예정** — `Field (Mobile PWA)` actor + `Realtime` 서브시스템 + Field 의 mutation 흐름. [[roadmap/v2-field]] 참조.

## 레이어 책임

| 레이어 | 책임 | 비책임 |
|---|---|---|
| Client (RSC + CSR) | 화면, 폼 입력, 결과 카드 | 권한 판단 |
| middleware | 세션 검증, 비로그인 차단 | 비즈니스 규칙 |
| Server Action | 인증, 입력 검증(zod), 파싱, 비교, DB 호출 | UI 상태, 캐시 |
| Supabase Auth | 로그인 / 세션 / 토큰 | 앱 로직 |
| Postgres | 데이터 (v1 은 RLS 최소 — admin only 단일 정책) | 파일 저장 |

> Realtime 은 v1 에서 사용하지 않음 (관리자 단독). v2 에서 도입.

## 데이터 흐름 (v1)

1. **두 엑셀 업로드** — Admin → Server Action `processSync` → 파싱·검증 → 두 테이블에 upsert → drift 비교 → `drift_alerts` 갱신
2. **읽기** — RSC 가 Supabase 쿼리 → 초기 렌더 (대시보드 / 알림 페이지)

상세 시퀀스는 [[05-flows]], 동기화 spec 은 [[specs/data-sync]].

## 배포 구조

- **Vercel** — Next.js 호스팅, 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`(Server Action 전용)
- **Supabase Cloud** — Free tier 시작, 마이그레이션은 `supabase/migrations` 로 버전 관리
- **도메인/SSL** — Vercel 기본 도메인으로 시작, 운영 단계에서 사용자 도메인 부착

## 환경 분리

| 환경 | 용도 | Supabase 프로젝트 |
|---|---|---|
| local | 개발 | Supabase CLI 로컬 인스턴스 |
| preview | PR 미리보기 | Cloud (dev) |
| production | 운영 | Cloud (prod) |

## 보안 가드

- 클라이언트엔 **anon key** 만 노출, `service_role` 은 Server Action 전용.
- RLS 미설정 테이블은 배포 전 차단 (Supabase 대시보드 경고 활용).
- `xlsx` 파싱은 Server Action 내부에서만 수행 (클라이언트 파싱 금지 — 데이터 유출 방지).

## TBD

- 환경별 시드 / 마이그레이션 전략
- v2 합류 시 Realtime 구조 + Field actor 흐름 ([[roadmap/v2-field]])
