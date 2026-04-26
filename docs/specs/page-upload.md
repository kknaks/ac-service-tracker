---
title: 페이지 spec — /admin/upload
status: agreed
tags: [spec, page, upload, admin]
updated: 2026-04-26
parent: "[[../README]]"
---

# Spec · `/admin/upload`

상위: [[../README]]
관련: [[../04-pages]] · [[specs/data-sync]] · [[specs/page-dashboard]] · [[specs/page-alerts]]

## 목적

관리자가 두 엑셀(작업배정관리, AS접수리스트)을 업로드하면 즉시 추출 결과를 미리보기로 확인하고, 마지막 단계에서 두 데이터를 비교해 갱신 필요 항목을 한 화면에서 본다.

> **v1 범위**: 클라이언트 무상태 도구. **DB 저장 없음** — 페이지 닫으면 결과는 사라짐. DB 영속화는 v2 ([[../roadmap/v2-field]] · A 절).

## 설계 원칙

1. **한 페이지에 모든 단계**. 라우트 분리 / 모달 없이 위→아래 자연스러운 흐름
2. **자동 분석** — 파일 선택 즉시 파싱·미리보기. "분석" 같은 별도 클릭 없음
3. **미니멀 미리보기** — 파일명·"분석 완료" 같은 메타는 표시 안 함. **추출 데이터 자체** 가 진실
4. **무상태** — 비교 결과는 클라이언트 메모리에만. DB 저장은 v2
5. **Locked 시각화** — 이전 단계 미완료 시 잠금 아이콘, 진행 가능해지면 활성

## 레이아웃

```
┌─────────────────────────┬─────────────────────────┐
│ ● 1 작업배정 업로드     │ 🔒/2 AS 업로드          │
│                         │                         │
│  업로드 전 (드롭존)     │ 업로드 전 (드롭존)      │
│  업로드 후 (미리보기)   │ 업로드 후 (미리보기)    │
│  ─ 행수 + ×변경 (한 줄) │  ─ 행수 + ×변경         │
│  ─ 5컬럼 테이블 + 스크롤│  ─ 5컬럼 테이블 + 스크롤│
└─────────────────────────┴─────────────────────────┘

🔒/3  비교 시작
┌────────────────────────────────────────────────────┐
│ 두 데이터의 요청일자를 비교합니다.    [비교 시작]   │
└────────────────────────────────────────────────────┘
```

- 좌우 grid: `md:grid-cols-2 gap-4`
- 카드 높이 통일: `h-[420px]`
- 모바일: 세로 stack (`grid-cols-1`)

## 컴포넌트 트리

```
<UploadFlow>                            (Client — useState 로 step 결과 관리)
  ├─ <SectionHeader num=1 state="current|done" />
  ├─ <Step1Assignment result onResult />     ← 작업배정관리
  ├─ <SectionHeader num=2 state="locked|current|done" />
  ├─ <Step2As result onResult />             ← TBD (AS접수리스트)
  ├─ <SectionHeader num=3 state="locked|current" />
  └─ <Step3Compare canCompare />             ← TBD (저장 + drift)
```

각 Step 컴포넌트는 내부에서 4가지 상태를 가짐:

| 내부 상태 | 화면 |
|---|---|
| `idle` (file === null) | `<DropPanel>` — 드롭존 |
| `pending` (분석 중) | `<LoadingPanel>` — 스피너 + ×변경 |
| `error` (`result.ok === false`) | `<ErrorPanel>` — 메시지 + ×변경 |
| `success` | `<PreviewPanel>` — 행수 + 미리보기 테이블 + ×변경 |

## 자동 분석 트리거

```
파일 선택 (드래그 / file input)
  → useState 로 file set
  → useTransition 으로 server action 즉시 호출
  → result state 갱신
```

**버튼 클릭 없음.** 파일이 들어가는 순간 분석.

## 표시 컬럼

> 헤더 라벨은 **엑셀 원본 그대로** 사용. 순서는 행 식별자(접수번호) 우선, 그 다음 엑셀 col 순서, 마지막에 고객명.

### 작업배정 미리보기

| 컬럼 헤더 (엑셀 원본) | DB 필드 | 엑셀 col |
|---|---|---|
| 접수번호 | `external_no` | 21 |
| 주문일자 | `order_date` | 2 |
| 요청일자 | `request_date` | 3 |
| 기사 약속시간 | `promised_time` | 4 |
| 고객명 | `customer_name` | 16 |

### AS접수리스트 미리보기

| 컬럼 헤더 (엑셀 원본) | DB 필드 | 엑셀 col |
|---|---|---|
| 접수 번호 | `external_no` | 9 |
| 접수일자 | `received_date` | 2 |
| A/S요청일자 | `request_date` | 6 |
| 약속시간 | `promised_time` | 8 |
| 고객명 | `customer_name` | 15 |
| 고객번호 | `customer_no` | 12 |

> `contract_no` 는 데이터에는 1급으로 보존되지만 미리보기에서는 가독성 위해 생략. 필요 시 노출 변경 가능.

## Server Action

### `previewAssignmentExcel`

```ts
async function previewAssignmentExcel(
  _prev: AssignmentPreviewResult | null,
  formData: FormData,
): Promise<AssignmentPreviewResult>
```

- 인증 검증 + 파일 검증(zod)
- `parseAssignmentExcel(buffer)` 직접 호출 (DB 저장 X)
- 반환: `{ ok, fileName, fileSize, totalRows, parsedRows, errorRows, errors[20], rows[전체] }`
- 4-layer 룰: parser 는 `lib/parsers/` (utility), service 우회 아님

### `previewAsExcel`

위와 동일 패턴, AS 측.

> Step 3 (비교) 는 Server Action 없음. 클라이언트의 `lib/comparison.ts` `compareRows()` 가 즉시 처리.
> v2 에서 `commitAndCompare(...)` 가 도입되어 비교 후 DB 저장. [[../roadmap/v2-field]] A 절.

## Step 3 — 비교 (client-side)

`lib/comparison.ts` 의 `compareRows(assignment, as)` 가 양쪽 rows 를 받아 4가지 판정:

| kind | 의미 |
|---|---|
| `match` | 양쪽 row 존재 + `request_date` + `promised_time` 모두 일치 |
| `mismatch` | 양쪽 row 존재 + 둘 중 하나라도 다름 (AS 갱신 필요) |
| `missing_in_as` | 배정에만 존재, AS 누락 |
| `missing_in_assignment` | AS에만 존재, 배정 누락 |

정렬 우선순위: `mismatch → missing_in_as → missing_in_assignment → match` (action item 우선).

### 결과 화면 구성

```
┌─ 요약 카드 ─────────────────────────────────────────────┐
│ 총 N건 · 갱신 필요 N · AS 누락 N · 배정 누락 N · 일치 N │ × 다시 비교
└────────────────────────────────────────────────────────┘

┌─ ⚠ 갱신 필요 N건 ──────────────────────────────────────┐
│  · AS 측 요청일자/시간을 작업배정에 맞춰 수정 후 재업로드 │
│  [표 — mismatch 만, 7컬럼 (배정/AS 그룹)]               │
│  (갱신 필요 0건이면 녹색 "모두 일치" 카드)               │
└────────────────────────────────────────────────────────┘

▶ 전체 비교 결과 (N건)                       ← 아코디언 (기본 접힘)
   [표 — 모든 kind 포함]
```

### 결과 표 컬럼 (8개, 2-row 헤더)

```
| 접수번호 | 고객명 | 고객번호 |   배정      |    AS       | 판정 |
|          |        |         | 요청일자│시간 │ 요청일자│시간 |      |
```

> `고객번호` 는 AS 측에만 존재하므로 `missing_in_as` (배정만 있는) 행은 빈값.

판정 배지 색상:
- `match` — 녹색
- `mismatch` — 노랑
- `missing_in_as` — 빨강
- `missing_in_assignment` — 회색

## 상태 전환

| 시나리오 | Step 1 헤더 | Step 2 헤더 | Step 3 헤더 |
|---|---|---|---|
| 진입 | ● current | 🔒 locked | 🔒 locked |
| Step 1 분석 OK | ✓ done | ● current | 🔒 locked |
| Step 2 분석 OK | ✓ done | ✓ done | ● current |
| 비교 완료 | ✓ done | ✓ done | ✓ done (`compareRows()` 결과 보유) |

> 진행 자동화: 한 step 의 result 가 `ok === true` 가 되면 다음 step 활성. 사용자가 수동으로 "다음" 누를 필요 없음.

## 빈 / 로딩 / 에러 상태 (각 step 내부)

### 드롭존 (idle)

- 파일 아이콘 + "엑셀을 업로드해주세요"
- "드래그 또는 [파일 선택]"
- dragover 시 테두리 강조

### 분석 중 (pending)

- 스피너 + "분석 중..." + 작은 ×변경 링크

### 에러 (failed)

- AlertCircle 아이콘 + 에러 메시지(들) + ×변경 링크

### 미리보기 (success)

- 카드 상단에 한 줄: `{rows}행 [· 에러 N (있으면)]   ×변경`
- 카드 본문: 5컬럼 테이블 + sticky header + 스크롤 영역
- 정상 인식 0행이면 테이블 안에 "인식된 행이 없습니다" placeholder

## 인터랙션

| 행위 | 결과 |
|---|---|
| 드롭존에 .xlsx 드래그 | 즉시 분석 시작 |
| `[파일 선택]` 클릭 → 파일 선택 | 즉시 분석 시작 |
| `×변경` 클릭 | 현재 step 의 file/result 초기화 → 드롭존으로 |
| `[비교 시작]` 클릭 (Step 3 활성) | (TBD) commitAndCompare → 결과 표시 |

## 비기능

- 파일 크기 상한: 10MB (zod 검증)
- 파싱 시간: 53행 기준 100ms 내외 — 즉각적 피드백
- 클라 → 서버 직렬화: parsed rows 전체 (작업배정 53행 raw 포함 시 ~50KB) — 무시할 수준

## v1 에서 의도적으로 안 하는 것

- 파일명·크기·"분석 완료" 같은 메타 표시 — **데이터 자체** 만 보여줌
- 통계 카드 (총 / 정상 / 에러) — 미리보기 상단 한 줄로 충분
- 컬럼 매핑 배지 — 테이블 헤더가 매핑 자체
- 에러 행별 상세 리스트 — 카운트만 (×변경 후 재분석 가능)
- 별도 "분석" 버튼 — 자동 트리거

## TBD

- Step 2 (AS) 구현 — 컬럼 합의 후 같은 패턴
- Step 3 (비교) 구현 — `commitAndCompare` Server Action + 결과 표시 UX
- 대용량 파일 (수천 행) 시 페이지네이션 / 가상화
- 결과 표시 후 navigation (대시보드로 이동 등)
