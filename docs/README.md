---
title: clean_scheduler SSOT
status: agreed
tags: [ssot, index]
updated: 2026-04-26
---

# clean_scheduler — SSOT

> 이 문서는 프로젝트의 **단일 진입점(Single Source of Truth)** 이다.
> 결정·미해결 질문·하위 문서 인덱스가 여기에 모인다.

## 한 줄 요약

**v1 (현재)** — 관리자 1명이 두 엑셀(AS접수리스트, 작업배정관리)을 업로드하면 Supabase 에 저장되고, 두 데이터 간 `요청일자` drift 를 자동 검증·알림한다.
**v2 (예정)** — 현장직원 영역 + 모바일 PWA 추가. 상세는 [[roadmap/v2-field]].

## 결정 요약 (현재까지)

| 항목 | 결정 |
|---|---|
| 프레임워크 | Next.js 15 (App Router) |
| 백엔드 | 별도 백엔드 없음 — Supabase + Server Actions |
| 데이터 | Supabase Postgres + RLS |
| 실시간 | v1 미사용 (단일 관리자). v2 에서 Supabase Realtime 도입 |
| 엑셀 처리 | 업로드 → SheetJS 파싱 → DB 저장 → 파일 폐기 (Storage 미사용) |
| 엑셀 양식 | **두 파일** — `AS접수리스트` (43컬럼) + `작업배정관리` (58컬럼, 멀티헤더) |
| 데이터 모델 | **3+1 테이블 분리** — `as_receptions`, `work_assignments`, `drift_alerts`, `uploads` |
| 조인 / 머지 | 접수번호(`AR…`) UNIQUE 키. JOIN은 SQL view 가 아닌 **service 레이어** 에서 |
| 동기화 검증 | `A/S요청일자` ↔ `요청일자` 차이만 비교 → `drift_alerts` open. 재업로드 시 일치하면 자동 해소(`auto`) |
| 단일 파일 업로드 | 허용 — 적재만, 비교는 skip |
| 누락 처리 | 한쪽에만 존재하는 접수번호도 `drift_alerts.kind='missing_*'` 로 기록 |
| **사용자 범위 (v1)** | **단일 관리자**. 현장직원·`members` 테이블·PWA·모바일 우선은 v2 ([[roadmap/v2-field]]) |
| 반응형 (v1) | 데스크탑 우선. 모바일에서 깨지지만 않게 |
| UI | Tailwind + shadcn/ui. v1 = 데스크탑 우선, `md:` 미만에서도 깨지지만 않게 |
| PWA | v1 미도입. v2 에서 `@ducanh2912/next-pwa` 도입 |
| 배포 | Vercel + Supabase Cloud (예정) |
| 코드 구조 | **A안 — 엄격 4-layer** (fe → action → service → repo) |

상세 근거는 [[01-tech-stack]], [[02-architecture]] 참조.

## 문서 인덱스

| # | 문서 | 상태 | 비고 |
|---|---|---|---|
| 00 | [[README]] (이 문서) | 🟢 agreed | SSOT |
| 01 | [[01-tech-stack]] | 🟢 agreed | 스택 확정 |
| 02 | [[02-architecture]] | 🟢 agreed | v1 시스템 구조 + mermaid |
| 03 | [[03-data-model]] | 🟢 agreed | 3+1 테이블 + service-level join |
| 04 | [[04-pages]] | 🟢 agreed | v1 = `(admin)/*` 3 페이지 |
| 05 | [[05-flows]] | 🟢 agreed | A 듀얼 엑셀 + B 인증 |
| 06 | [[06-permissions]] | 🟢 agreed | admin only, RLS 단순화 |
| 07 | [[07-pwa-responsive]] | 🟢 agreed | 데스크탑 우선 (PWA = v2) |
| 08 | [[08-code-structure]] | 🟢 agreed | A안 엄격 4-layer |

### 기능 spec (`docs/specs/`)

| 파일 | 상태 | 요약 |
|---|---|---|
| [[specs/data-sync]] | 🟢 agreed | 두 엑셀의 요청일자 drift 검증 + 자동 해소 + 알림 |
| [[specs/page-dashboard]] | 🟢 agreed | `/admin/dashboard` — drift 카드 + 통계 + 최근 업로드 |
| [[specs/page-alerts]] | 🟢 agreed | `/admin/alerts` — drift 리스트 + Drawer + kind별 갱신 가이드 |

### 로드맵 (`docs/roadmap/`)

| 파일 | 상태 | 요약 |
|---|---|---|
| [[roadmap/v2-field]] | 🟡 draft | v2 — 현장직원 영역(라우트·members·RLS·PWA·모바일 우선) 모음 |

## 미해결 질문 (Open Questions)

> 모든 보류 사유는 여기에 모은다. 하위 문서에 흩지 않는다.

_현재 v1 미해결 질문 없음._

### 해소된 질문 (참고용 이력)

- ~~OQ-1 · 엑셀 양식 미수령~~ → **2026-04-26 해소**. 두 엑셀(AS접수리스트, 작업배정관리) 수령. [[specs/data-sync]] 참조.
- ~~OQ-2 · 재업로드 시 머지 키~~ → **2026-04-26 해소**. 조인 키 = 접수번호(`AR…`). 단, 머지 모델 자체가 "단일 reservations 머지" 가 아니라 **두 테이블 분리 + service-level join** 으로 변경됨. [[03-data-model]] 참조.
- ~~OQ-3 · 현장직원 계정 발급 방식~~ → **2026-04-26 v2 로 이관**. v1 은 단일 관리자만. 발급 방식은 v2 착수 시점에 결정. [[roadmap/v2-field]] 참조.

## 결정 로그

| 일자 | 결정 | 메모 |
|---|---|---|
| 2026-04-25 | 백엔드 없이 Next.js + Supabase로 진행 | 비즈니스 로직 단순, RLS로 권한 충분 |
| 2026-04-25 | 엑셀 파일 자체는 저장하지 않음 | 파싱 후 폐기, Storage 미사용 |
| 2026-04-25 | 재업로드는 머지(upsert) 방식 | 현장 변경분 보존 필요 |
| 2026-04-25 | 문서 SSOT 구조 도입 | 본 문서가 진입점, `[[wikilink]]` 사용 |
| 2026-04-25 | 코드 구조 A안(엄격 4-layer) 채택 | 거의 모든 mutation에 audit_log 부착, service 경유 강제 ([[08-code-structure]]) |
| 2026-04-25 | `.claude/` 네이티브 도입 | settings + doc-keeper 에이전트 + ssot-update/doc-status 커맨드 |
| 2026-04-26 | 엑셀 샘플 2종 수령 (AS접수, 작업배정). 헤더 위치: AS=row3, 작업배정=row3+sub row5 | OQ-1 closed |
| 2026-04-26 | 조인 키 = 접수번호(`AR…`) UNIQUE | OQ-2 closed |
| 2026-04-26 | 데이터 모델: **3+1 테이블 분리** (`as_receptions`, `work_assignments`, `drift_alerts`, `uploads`) + minimal 1급 컬럼 + `raw jsonb` | [[03-data-model]] |
| 2026-04-26 | JOIN 은 SQL view 가 아닌 **service 레이어**에서 수행 | 유연성 + ([[08-code-structure]] 정합) |
| 2026-04-26 | drift 비교 컬럼 = `요청일자` 단 1쌍 | 향후 확장 위해 `drift_alerts.field` 컬럼 보유 |
| 2026-04-26 | 한 파일만 업로드도 허용 — 적재만, 비교 skip | 운영 유연성 |
| 2026-04-26 | 한쪽에만 존재하는 접수번호도 `drift_alerts` 에 `kind='missing_*'` 로 기록 | 누락 운영 추적 |
| 2026-04-26 | drift 자동 해소 — 재업로드 시 일치하면 `resolved_by='auto'` | [[specs/data-sync]] |
| 2026-04-26 | 화면 3개 — `/admin/upload` (듀얼), `/admin/dashboard`, `/admin/alerts` | [[04-pages]] |
| 2026-04-26 | 기능 spec 디렉토리 신설 — `docs/specs/` | 첫 spec: [[specs/data-sync]] |
| 2026-04-26 | **v1 = 관리자 단독**. 현장직원·`members`·PWA·모바일 우선은 v2 로 이관 | OQ-3 closed → [[roadmap/v2-field]] |
| 2026-04-26 | v1: `members` 테이블 제거 (Supabase `auth.users` 만 사용) | v2 에서 재추가 |
| 2026-04-26 | v1: PWA 미도입 | v2 에서 도입 |
| 2026-04-26 | v1: 데스크탑 우선 반응형 | (field) v2 추가 시 모바일 우선 |
| 2026-04-26 | 로드맵 디렉토리 신설 — `docs/roadmap/` | 첫 문서: [[roadmap/v2-field]] |
| 2026-04-26 | `/admin/dashboard` spec 작성 (drift=0 시 ✅ 표시 / 첫 진입 시 onboarding CTA / 자동 갱신 없음) | [[specs/page-dashboard]] |
| 2026-04-26 | `/admin/alerts` spec 작성 (Drawer 상세 / `?kind=` URL 필터 / limit 50 / kind별 갱신 가이드 카피) | [[specs/page-alerts]] |
| 2026-04-26 | Drawer 의 raw 펼침 영역 제거 — MVP 단순화. 갱신 가이드 + 핵심 비교만. payload < 5KB | 운영 후 재검토 (TBD in [[specs/page-alerts]]) |
| 2026-04-26 | doc-keeper 점검: 결정 요약(Realtime/members/UI/PWA) v1 정합 갱신, 02/04/05 status 🟡→🟢 승격, 06/07 인덱스 라벨 일치 회복 | v1 코드 작성 가능 상태 |
