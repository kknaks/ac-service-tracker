---
title: clean_scheduler SSOT
status: agreed
tags: [ssot, index]
updated: 2026-04-26
---

# clean_scheduler — SSOT

> 사용자 노출 브랜드: **A/C Service Tracker** (UI 텍스트). 코드/저장소명은 `clean_scheduler` 유지.

> 이 문서는 프로젝트의 **단일 진입점(Single Source of Truth)** 이다.
> 결정·미해결 질문·하위 문서 인덱스가 여기에 모인다.

## 한 줄 요약

**v1 (현재)** — 관리자 1명이 두 가지 흐름을 사용한다:
- `/admin/upload` — 작업배정 + AS 두 엑셀 업로드 → **클라이언트에서 즉시 파싱·비교** (in-memory)
- `/admin/contacts` — 작업배정 엑셀 업로드 → **박진영 담당 신규 접수번호** 추출 + DB 영속(추출 이력) + 엑셀 출력

**v2 (예정)** — `uploads` / `as_receptions` / `work_assignments` / `drift_alerts` DB 영속화 + 대시보드/알림 페이지 데이터 연결 + 현장직원 영역 + 모바일 PWA. 상세는 [[roadmap/v2-field]].

## 결정 요약 (현재까지)

| 항목 | 결정 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) — breaking changes 는 루트 `AGENTS.md` 참조 |
| 백엔드 | 별도 백엔드 없음 — Supabase + Server Actions |
| 데이터 | Supabase Postgres + RLS |
| 실시간 | v1 미사용 (단일 관리자). v2 에서 Supabase Realtime 도입 |
| 엑셀 처리 | 업로드 → SheetJS 파싱 → DB 저장 → 파일 폐기 (Storage 미사용) |
| 엑셀 양식 | **두 파일** — `AS접수리스트` (43컬럼) + `작업배정관리` (58컬럼, 멀티헤더) |
| 데이터 모델 | **3+1 테이블 분리** — `as_receptions`, `work_assignments`, `drift_alerts`, `uploads` |
| 조인 / 머지 | 접수번호(`AR…`) UNIQUE 키. JOIN은 SQL view 가 아닌 **service 레이어** 에서 |
| 동기화 검증 | `A/S요청일자` ↔ `요청일자` 차이만 비교 → `drift_alerts` open. 재업로드 시 일치하면 자동 해소(`auto`) |
| 단일 파일 업로드 | 허용 — 적재만, 비교는 skip |
| 누락 처리 | 한쪽에만 존재하는 접수번호도 `drift_alerts.kind='missing_*'` 로 기록 (v2) |
| **v1 비교 동작** | `/admin/upload` 는 클라이언트 `compareRows()` (in-memory). `/admin/contacts` 는 `contact_extractions` / `contact_extraction_items` 테이블에 추출 이력 영속 |
| **v1 DB 사용 범위** | minimal — 신규 접수 추출 이력 2 테이블만. v2 의 양쪽 적재·drift 테이블은 미도입 |
| **v2 합류 시** | `uploads` / `as_receptions` / `work_assignments` / `drift_alerts` 추가 + 자동 해소 + 대시보드/알림 데이터 연결 |
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
| 02 | [[02-architecture]] | 🟡 draft | v1 = 클라이언트 비교, DB 사용 안 함. 다이어그램 갱신 필요 |
| 03 | [[03-data-model]] | 🟡 draft | v1 = `contact_extractions` / `contact_extraction_items` 만 사용. v2 = 4 테이블 추가 |
| 04 | [[04-pages]] | 🟢 agreed | v1 = `(admin)/*` 3 페이지 |
| 05 | [[05-flows]] | 🟢 agreed | A 듀얼 엑셀 + B 인증 |
| 06 | [[06-permissions]] | 🟡 draft | v1 = 인증만 (DB 미사용). v2 에서 RLS 활성 |
| 07 | [[07-pwa-responsive]] | 🟢 agreed | 데스크탑 우선 (PWA = v2) |
| 08 | [[08-code-structure]] | 🟢 agreed | A안 엄격 4-layer |

### 기능 spec (`docs/specs/`)

| 파일 | 상태 | 요약 |
|---|---|---|
| [[specs/data-sync]] | 🟢 agreed | 두 엑셀의 요청일자 drift 검증 + 자동 해소 + 알림 |
| [[specs/page-dashboard]] | 🟡 draft | **v1 라우트 제거**. v2 에서 다시 구현 |
| [[specs/page-alerts]] | 🔴 v2-only | v1 라우트 제거 예정. v2 에서 다시 구현 |
| [[specs/page-upload]] | 🟢 agreed | `/admin/upload` — 3-step + 자동 분석 + 미니멀 미리보기 + client-side 비교 |
| [[specs/page-contacts]] | 🟢 agreed | `/admin/contacts` — 박진영 신규 접수 추출 + DB 영속 + 엑셀 출력 |

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
| 2026-04-26 | **Phase 1 — Next.js 스캐폴딩 완료**. Next 16.2.4 / React 19.2.4 / Tailwind 4 / TypeScript 5.9. `src/{actions,services,repositories,lib/{supabase,validations},types,components/ui}` 디렉토리 + .gitkeep | git init 자동 수행됨. AGENTS.md (Next 16 자동 생성) 보존 + CLAUDE.md 헤더에 참조 추가 |
| 2026-04-26 | **Phase 2 — 의존성 + shadcn init 완료**. `@supabase/ssr`, `@supabase/supabase-js`, `xlsx`, `zod` 4, `react-hook-form` + `@hookform/resolvers`, `@tanstack/react-query` | shadcn `base-nova` style + `neutral` color. button + cn util 생성 |
| 2026-04-26 | **Phase 3 — Supabase 환경 + 마이그레이션 작성 완료**. `.env.local` (publishable + secret key 사용 — 신 키 시스템), `src/lib/supabase/{client,server,middleware}.ts`, `src/middleware.ts` (admin/login 가드), `supabase/migrations/*.sql` 4개 (uploads/as_receptions/work_assignments/drift_alerts + RLS) | 환경변수 이름: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`. 마이그레이션은 사용자가 Supabase SQL Editor 에 적용 필요 |
| 2026-04-26 | **Phase 4 — 인증 + 어드민 레이아웃 + 대시보드 완료**. shadcn primitives (card/input/label/sonner/separator/badge), 4개 repo (count/recent/openCount/lastByKind), auth.actions (signIn/signOut), `(auth)/login` + `admin/{dashboard,layout}`, dashboard 컴포넌트 4개 (`DriftAlertBanner`, `StatsCards`, `RecentUploads`, `EmptyOnboarding`) | 라우트 그룹 `(admin)` → `admin/` 폴더로 변경 (URL 에 `/admin/` prefix 노출 필요). build 통과. Next 16 의 `middleware` → `proxy` 권장 경고는 추후 처리 |
| 2026-04-26 | **Phase 5a — 업로드 + 적재 + drift 비교 완료**. `lib/parsers/excel.ts` (멀티헤더 인식), `lib/validations/sync.schema.ts`, `types/sync.ts`, repo 확장 (upsertBatch / resolveOpen / upsertOpen / create), `services/{drift,sync}.service.ts`, `actions/sync.actions.ts`, `admin/upload/page.tsx` + `<DualDropZone>` + `<UploadResultCard>` | 4-layer 룰 엄격 적용 — supabase client 는 repo 만 import, action 은 service 만 호출. build/typecheck 통과 |
| 2026-04-26 | **업로드 흐름 재설계 시작** — 현재 "검증 시작 → 즉시 적재" 가 블랙박스라 사용자가 결과 확신 못 함. 단계별 진행 합의: ①문서 → ②코드(파일 업로드 → 추출 컬럼 미리보기, **DB 저장 비활성**) → ③계층 룰 점검 → ④DB 연결 마지막. 비교 로직 안정화 전까지 DB 오염 방지 목적 | 적용 중 |
| 2026-04-26 | `work_assignments` 1급 컬럼 3개 추가 — `order_date` (주문일자, col 2), `promised_time` (기사 약속시간, col 4, text), `contract_no` (계약번호, col 20). AS접수는 v1 minimal 유지 | [[03-data-model]] · [[specs/data-sync]]. 마이그레이션은 step ④ 에서 |
| 2026-04-26 | **Step 2 (a) 완료** — 작업배정관리 단일 파일 업로드 → 파싱 + 미리보기 (DB 저장 X). `previewAssignmentExcel` action, `<AssignmentPreview>` 컴포넌트, 컬럼 매핑 배지 + 통계 + 에러 리스트 + 샘플 테이블 | DB 저장은 Step ④ |
| 2026-04-26 | **파서 — ERP dimension 캐시 우회 fix**. SheetJS 가 sheet `!ref` 캐시(`A1:BF2`)만 보고 row 1-2 만 읽는 문제 발견. cells 키 기반 `rebuildRef()` 헬퍼로 ref 재계산. 53건 데이터 정상 인식 확인 | `src/lib/parsers/excel.ts` |
| 2026-04-26 | **Step 3 (계층 점검) 통과**. supabase 격리 / components·actions → repo·service 룰 / 파일 네이밍 / Action `{ok}` 반환 모두 준수. `parser` 직접 호출은 service 우회 아님 (lib utility, DB 무관) | 합의된 gray area: auth API 직접 호출 (Phase 4 합의) |
| 2026-04-26 | **업로드 페이지 디자인 확정** — 3-step 한 페이지, Step 1\|Step 2 좌우 grid + Step 3 아래. 자동 분석(파일 선택 즉시), 미니멀 미리보기(파일명·통계·매핑 모두 제거 — 데이터 자체로 진실). Step 1 표시 5컬럼(접수번호/요청일자/주문일자/약속/고객명) | [[specs/page-upload]] 신규 |
| 2026-04-26 | `as_receptions` 1급 컬럼 2개 추가 — `promised_time` (약속시간, col 8, text), `contract_no` (계약번호, col 10). 양쪽 테이블 5개 1급 컬럼 대칭 + 작업배정만 `order_date` 추가 1급 | [[03-data-model]] · [[specs/data-sync]] · [[specs/page-upload]]. 마이그레이션은 step ④ 에서 |
| 2026-04-26 | `as_receptions` 에 `received_date` (접수일자, col 2) 추가 — 작업배정의 `order_date` 와 의미적 대칭 | 미리보기에 노출되는 핵심 일자 |
| 2026-04-26 | **미리보기 컬럼 헤더 = 엑셀 원본 그대로** 로 통일. 순서: 접수번호 → 엑셀 col 순서 → 고객명. 작업배정 `접수번호 / 주문일자 / 요청일자 / 기사 약속시간 / 고객명`, AS `접수 번호 / 접수일자 / A/S요청일자 / 약속시간 / 고객명` | [[specs/page-upload]] |
| 2026-04-26 | **`promised_time` 의 `00:00` 도 그대로 표시** — sentinel 필터 제거. 운영 측에서 의미 판단 | [[specs/page-upload]] |
| 2026-04-26 | **클라이언트 비교 로직 도입** — `lib/comparison.ts` 의 pure 함수 `compareRows(assignment, as)`. DB 무관. 4가지 판정: `match` / `mismatch` / `missing_in_as` / `missing_in_assignment` | Step 3 가 client-only 동작 |
| 2026-04-26 | **Step 3 결과 UX** — 상단 요약 + "갱신 필요" 만 강조 표시 + 전체 비교 결과는 아코디언으로 접힘. Step 3 도 결과 나오면 ✓ done 상태 | [[specs/page-upload]] |
| 2026-04-26 | **v1 범위 재정의** — DB 저장 / drift_alerts / uploads 등 영속화 모두 **v2 로 이관**. v1 = 클라이언트 in-memory 도구. 영향: 02/03/06 → 🟡 draft 로 강등, 페이지 spec (dashboard/alerts) 도 🟡 draft (v1 미사용) | [[roadmap/v2-field]] |
| 2026-04-26 | **브랜드명 = A/C Service Tracker** (UI 표시). 코드/저장소명은 `clean_scheduler` 유지. 사이드바 / 로그인 / 메타 적용 | |
| 2026-04-26 | **v1 사이드바 nav 2개로 정리** — `업로드` / `알림`. 대시보드 라우트 + 컴포넌트 폴더 제거 (`src/app/admin/dashboard/` + `src/components/dashboard/`). 로그인/`/` 진입은 `/admin/upload` 로 redirect | MVP 화면 = upload + alerts + (TBD 추가 1) |
| 2026-04-26 | `as_receptions` 1급 컬럼 `customer_no` 추가 (고객번호, col 12). AS 측에만 존재. 작업배정에는 없음. AS 미리보기 + 비교 결과표에 노출 | [[03-data-model]] · [[specs/data-sync]] · [[specs/page-upload]] |
| 2026-04-26 | **신규 접수 페이지 추가** — `/admin/contacts`. 박진영(변경 전.기사 명) 담당 작업배정 row 중 DB 미등록 접수번호만 추출 → 체크 → 엑셀 출력 + DB 영속. 알림 페이지(`/admin/alerts`) 는 v1 에서 라우트 제거 | [[specs/page-contacts]] |
| 2026-04-26 | **v1 에 minimal DB 도입** — `contact_extractions` (배치) + `contact_extraction_items` (영속, external_no UNIQUE 신규 비교 기준) 두 테이블만. v2 의 4 테이블은 그대로 미도입 | [[03-data-model]] |
| 2026-04-26 | `ParsedAssignmentRow` 1급 컬럼 2개 승격 — `contact_phone` (컨택 전화번호, col 12), `assigned_engineer_before` (변경 전.기사 명, col 42). `contacts` 페이지의 표시·필터에 사용 | [[specs/page-contacts]] |
