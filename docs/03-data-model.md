---
title: 데이터 모델
status: agreed
tags: [data-model, schema, supabase]
updated: 2026-04-26
parent: "[[README]]"
---

# 03 · 데이터 모델

상위: [[README]]
관련: [[02-architecture]] · [[06-permissions]] · [[specs/data-sync]]

## 결정 (2026-04-26)

- **v1 은 단일 관리자**. `members` 테이블은 v2 ([[roadmap/v2-field]]) 에서 추가. 본 문서는 v1 스코프만 다룬다.
- **3 테이블 분리** — 두 엑셀을 각각 자체 테이블에 적재. 비교는 service 레이어에서 접수번호로 join.
- **1급 컬럼은 minimal** — 조회·필터·비교에 쓰는 것만. 나머지 원본은 `raw jsonb` 로 보존.
- **uploads 테이블** — 업로드 배치 메타 추적 (어느 파일이 언제 누구에 의해, 결과 카운트 포함).

## 테이블

> 사용자: Supabase `auth.users` 만 사용. 별도 프로파일 테이블 없음. v2 에서 `members` 추가 ([[roadmap/v2-field]]).

### `as_receptions` — AS접수리스트 적재

| 컬럼 | 타입 | 출처 / 용도 |
|---|---|---|
| `id` | uuid PK | DB 생성 |
| `external_no` | text UNIQUE | **접수번호** (AS의 "접수 번호", `AR…`) — 조인 키 |
| `request_date` | date | **A/S요청일자** — drift 대상 |
| `customer_name` | text | 표시용 |
| `raw` | jsonb | 43컬럼 원본 (필드명 그대로) |
| `upload_id` | uuid FK→`uploads.id` | 어느 업로드 배치 |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | upsert 시 갱신 |

### `work_assignments` — 작업배정관리 적재

| 컬럼 | 타입 | 출처 / 용도 |
|---|---|---|
| `id` | uuid PK | |
| `external_no` | text UNIQUE | **접수번호** (작업배정의 "접수번호", `AR…`) — 조인 키 |
| `request_date` | date | **요청일자** — drift 대상 |
| `customer_name` | text | |
| `raw` | jsonb | 58컬럼 원본 (멀티헤더 → 평탄화 키 사용. 자세한 매핑은 [[specs/data-sync]]) |
| `upload_id` | uuid FK→`uploads.id` | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | upsert 시 갱신 |

### `drift_alerts` — 검출된 차이 이력

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | uuid PK | |
| `external_no` | text | 접수번호 |
| `field` | text | 현재 항상 `'request_date'`. 미래 다른 필드 확장 대비. |
| `kind` | text | `'mismatch'` / `'missing_in_assignment'` / `'missing_in_as'` |
| `as_value` | jsonb | AS 값 (없으면 null) |
| `assignment_value` | jsonb | 작업배정 값 (없으면 null) |
| `detected_at` | timestamptz | |
| `resolved_at` | timestamptz null | 자동/수동 해소 시 set |
| `resolved_by` | text null | `'auto'` / `'manual'` |
| `last_upload_id` | uuid FK→`uploads.id` | 마지막으로 검출된 업로드 |

> **고유성**: `(external_no, field)` 조합으로 **현재 open 인 row 는 최대 1개**. 자동 해소되면 새 drift 가 생길 때 또 새 row 생성 (이력은 누적).

### `uploads` — 업로드 배치 메타

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | uuid PK | |
| `kind` | text | `'as_reception'` / `'work_assignment'` |
| `filename` | text | 원본 파일명 (예: `AS접수리스트_0425.xlsx`) |
| `uploaded_by` | uuid FK→`auth.users.id` | v2 에서 `members.id` 로 변경 가능 |
| `uploaded_at` | timestamptz | |
| `total_rows` | int | 데이터 행 수 |
| `inserted` | int | 신규 |
| `updated` | int | 기존 row 갱신 |
| `errors_count` | int | 검증/파싱 실패 행 |
| `error_report` | jsonb null | 에러 행/컬럼/사유 (옵션) |

## 인덱스

```sql
CREATE UNIQUE INDEX as_receptions_external_no_uniq ON as_receptions(external_no);
CREATE UNIQUE INDEX work_assignments_external_no_uniq ON work_assignments(external_no);

-- drift open 조회용 (페이지 핵심 쿼리)
CREATE INDEX drift_alerts_open_idx
  ON drift_alerts(external_no, field) WHERE resolved_at IS NULL;

-- 검출 이력 시계열
CREATE INDEX drift_alerts_detected_idx ON drift_alerts(detected_at DESC);

-- upload 시계열
CREATE INDEX uploads_uploaded_at_idx ON uploads(uploaded_at DESC);
```

## Upsert 정책

```sql
-- as_receptions
INSERT INTO as_receptions (external_no, request_date, customer_name, raw, upload_id)
VALUES (...)
ON CONFLICT (external_no) DO UPDATE SET
  request_date = EXCLUDED.request_date,
  customer_name = EXCLUDED.customer_name,
  raw = EXCLUDED.raw,
  upload_id = EXCLUDED.upload_id,
  updated_at = now();

-- work_assignments: 동일 패턴
```

> 두 테이블 모두 **엑셀 = 진실** 가정. 매 업로드마다 `request_date`/`customer_name`/`raw` 를 덮어쓴다.
> drift_alerts 는 별도 테이블이므로 이 upsert에 영향받지 않는다.

## 마이그레이션

- `supabase/migrations/` 에 SQL 파일로 버전 관리
- 네이밍: `YYYYMMDDHHMMSS_<요약>.sql`
- 첫 마이그레이션 후보:
  - `..._init_as_receptions.sql`
  - `..._init_work_assignments.sql`
  - `..._init_uploads.sql`
  - `..._init_drift_alerts.sql`

## RLS 개요 (v1)

상세 정책은 [[06-permissions]]. v1 은 단일 관리자라 정책이 단순:

- 모든 4 테이블: **로그인한 사용자만 R/W**. 역할 분기 없음.
- 또는 모든 mutation 을 Server Action(service_role) 으로 통과시키고 RLS 는 SELECT 만 강제하는 방식 가능.

## TBD

- v2 합류 시 — `members` 테이블, `audit_log`, `assigned_engineer_id` 컬럼 승격, field 용 RLS 등 ([[roadmap/v2-field]])
