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

- **v1 은 단일 관리자**. `members` 테이블은 v2 ([[roadmap/v2-field]]) 에서 추가.
- **v1 사용 테이블 = `contact_extractions` / `contact_extraction_items` 만**. 그 외 4개 (`uploads` / `as_receptions` / `work_assignments` / `drift_alerts`) 는 v2 합류 시 도입.
- **1급 컬럼은 minimal** — 조회·필터·비교에 쓰는 것만. 나머지 원본은 `raw jsonb` 로 보존.

## 테이블 사용 현황

| 테이블 | 사용 시점 | 용도 |
|---|---|---|
| `contact_extractions` | **v1** | 신규 접수 추출 batch (작업 로그 한 행) |
| `contact_extraction_items` | **v1** | 추출된 접수번호 영속 (신규 비교 기준) |
| `uploads` | v2 | 업로드 배치 메타 |
| `as_receptions` | v2 | AS접수 적재 |
| `work_assignments` | v2 | 작업배정 적재 |
| `drift_alerts` | v2 | drift 이력 |

## ParsedAssignmentRow (메모리 타입)

작업배정 엑셀 파싱 결과의 in-memory 타입 (`src/types/sync.ts`). v1 의 두 화면(`/admin/upload`, `/admin/contacts`) 이 공유.

| 필드 | 타입 | 출처 col | 용도 |
|---|---|---|---|
| `external_no` | string | 21 | 조인 키 |
| `order_date` | string\|null | 2 | 표시 |
| `request_date` | string\|null | 3 | drift 비교 / 표시 |
| `promised_time` | string\|null | 4 | 표시 |
| `contact_phone` | string\|null | 12 | `/admin/contacts` 표시 |
| `customer_name` | string\|null | 16 | 표시 |
| `contract_no` | string\|null | 20 | 표시 |
| `assigned_engineer_before` | string\|null | 42 (변경 전.기사 명) | `/admin/contacts` 박진영 필터 |
| `raw` | jsonb | — | 58컬럼 원본 보존 |

## 테이블 (v1)

> 사용자: Supabase `auth.users` 만 사용. 별도 프로파일 테이블 없음. v2 에서 `members` 추가.

### `contact_extractions` — 신규 접수 추출 배치 (v1)

| 컬럼 | 타입 | 용도 |
|---|---|---|
| `id` | uuid PK | |
| `extracted_at` | timestamptz | 추출 시각 (`작업 로그 리스트` 의 "추출일") |
| `performed_by` | uuid → `auth.users.id` | 수행자 |
| `items_count` | int | 체크된 행 수 (`작업 로그 리스트` 의 "체크 작업 수") |

### `contact_extraction_items` — 추출된 접수번호 영속 (v1)

| 컬럼 | 타입 | 용도 |
|---|---|---|
| `id` | uuid PK | |
| `extraction_id` | uuid FK → `contact_extractions.id` | |
| `external_no` | text UNIQUE | **신규 비교 기준** — 한 번 들어가면 영구히 "신규 아님" |
| `order_date` | date | |
| `request_date` | date | |
| `promised_time` | text | |
| `customer_name` | text | |
| `contact_phone` | text | |
| `created_at` | timestamptz | |

> **트랜잭션 의도**: `commitContactExtraction` 시 `extractions` 1 row + `items` N row 동시 insert. 실패 시 둘 다 롤백 → 다음 업로드에도 같은 행이 신규로 다시 등장.

## 테이블 (v2 — 미도입, 설계 보존)

### `as_receptions` — AS접수리스트 적재 (v2)

| 컬럼 | 타입 | 출처 / 용도 |
|---|---|---|
| `id` | uuid PK | DB 생성 |
| `external_no` | text UNIQUE | **접수 번호** (col 9, `AR…`) — 조인 키 |
| `received_date` | date | **접수일자** (col 2) |
| `request_date` | date | **A/S요청일자** (col 6) — drift 대상 |
| `promised_time` | text | **약속시간** (col 8) — sentinel datetime 의 시간만 의미. text (예: `"12:00"`) |
| `contract_no` | text | **계약번호** (col 10) — `CT…` |
| `customer_no` | text | **고객번호** (col 12) — AS 만 보유 (작업배정에는 없음) |
| `customer_name` | text | **고객명** (col 15) |
| `raw` | jsonb | 43컬럼 원본 (필드명 그대로) |
| `upload_id` | uuid FK→`uploads.id` | 어느 업로드 배치 |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | upsert 시 갱신 |

### `work_assignments` — 작업배정관리 적재 (v2)

| 컬럼 | 타입 | 출처 / 용도 |
|---|---|---|
| `id` | uuid PK | |
| `external_no` | text UNIQUE | **접수번호** (작업배정의 "접수번호", col 21, `AR…`) — 조인 키 |
| `request_date` | date | **요청일자** (col 3) — drift 대상 |
| `order_date` | date | **주문일자** (col 2) — 표시 |
| `promised_time` | text | **기사 약속시간** (col 4) — sentinel datetime 의 시간 부분만 의미. text 로 보존 (예: `"12:00"`, 또는 원본 그대로) |
| `contract_no` | text | **계약번호** (col 20) — `CT…` |
| `customer_name` | text | **고객명** (col 16) |
| `raw` | jsonb | 58컬럼 원본 (멀티헤더 → 평탄화 키 사용. 자세한 매핑은 [[specs/data-sync]]) |
| `upload_id` | uuid FK→`uploads.id` | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | upsert 시 갱신 |

> AS / 작업배정 1급 컬럼이 의미적 대칭:
> - 공통: `external_no` / `request_date` / `customer_name` / `promised_time` / `contract_no`
> - "작성 시점 일자" 의미: AS = `received_date` (접수일자) ↔ 작업배정 = `order_date` (주문일자)
>
> 그 외 모든 컬럼은 `raw` 에 보존.

### `drift_alerts` — 검출된 차이 이력 (v2)

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

### `uploads` — 업로드 배치 메타 (v2)

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

### v1

```sql
-- 신규 비교 핵심 (한 번 영구 등록)
CREATE UNIQUE INDEX contact_extraction_items_external_no_uniq
  ON contact_extraction_items(external_no);

-- 작업 로그 시계열 페이지네이션
CREATE INDEX contact_extractions_extracted_at_idx
  ON contact_extractions(extracted_at DESC);

-- 상세 조회 (logId → items)
CREATE INDEX contact_extraction_items_extraction_id_idx
  ON contact_extraction_items(extraction_id);
```

### v2 (예정)

```sql
CREATE UNIQUE INDEX as_receptions_external_no_uniq ON as_receptions(external_no);
CREATE UNIQUE INDEX work_assignments_external_no_uniq ON work_assignments(external_no);

CREATE INDEX drift_alerts_open_idx
  ON drift_alerts(external_no, field) WHERE resolved_at IS NULL;

CREATE INDEX drift_alerts_detected_idx ON drift_alerts(detected_at DESC);
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

### v1 (실제 적용)

- `..._init_contact_extractions.sql`
- `..._init_contact_extraction_items.sql`

> 기존에 작성됐던 v2 마이그레이션 파일들 (`..._init_uploads.sql` / `..._init_as_receptions.sql` / `..._init_work_assignments.sql` / `..._init_drift_alerts.sql`) 은 v1 에 적용하지 않는다. 보관만 — v2 도입 시점에 적용.

## RLS 개요 (v1)

상세 정책은 [[06-permissions]]. v1 은 단일 관리자라 정책이 단순:

- 두 contact_* 테이블: **로그인한 사용자만 SELECT**, mutation 은 Server Action(service_role) 경유.

## TBD

- v2 합류 시 — `members` 테이블, `audit_log`, `assigned_engineer_id` 컬럼 승격, field 용 RLS 등 ([[roadmap/v2-field]])
