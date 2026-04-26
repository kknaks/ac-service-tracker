---
title: 페이지 spec — /admin/dashboard
status: draft
tags: [spec, page, dashboard, admin]
updated: 2026-04-26
parent: "[[../README]]"
---

# Spec · `/admin/dashboard`

상위: [[../README]]
관련: [[../04-pages]] · [[data-sync]] · [[../03-data-model]] · [[../08-code-structure]]

> 🔮 **v1 에서는 라우트/코드 자체 제거됨** (사이드바 nav 항목 + 라우트 폴더 + 컴포넌트). v1 진입은 로그인 → `/admin/upload` 직행.
> **v2 에서 DB 영속화 합류 시 본 spec 의 화면을 다시 구현**. [[../roadmap/v2-field]] B 절 참조.

## 목적

관리자의 **메인 진입점**. 한 화면에서 다음 세 가지를 즉시 파악한다:

1. **drift 상태** — 갱신이 필요한 AS 접수가 있는지
2. **데이터 현황** — 적재된 양과 마지막 업로드 시점
3. **최근 업로드 이력** — 누가 언제 무엇을 올렸는지

## 진입 / 위치

- 라우트: `/admin/dashboard`
- 진입 경로:
  - 로그인 직후 → 자동 이동
  - `/` 접속 시 → 자동 이동
  - 사이드바 "대시보드" 클릭

## 화면 구성

```
┌────────────────────────────────────────────────────┐
│  <DriftAlertBanner>                                 │
│   ─ drift 0 :  "✅ 모두 일치합니다"  (녹색)          │
│   ─ drift N :  "갱신 필요 N건"  [알림 보기 →]       │
├────────────────────────────────────────────────────┤
│  <StatsCards>  (4 columns desktop, 2 columns md-)  │
│  ┌─ AS접수 ─┐ ┌ 작업배정 ┐ ┌ 마지막 AS ┐ ┌ 마지막 작업 ┐│
│  │   N건    │ │   N건    │ │   시간    │ │    시간    ││
│  └─────────┘ └─────────┘ └──────────┘ └──────────┘│
├────────────────────────────────────────────────────┤
│  <RecentUploads>  (최근 5건)                        │
│  ┌─────────────────────────────────────────────────┐│
│  │ 종류 │ 파일명 │ 시각 │ 신규 │ 갱신 │ 에러        ││
│  ├─────────────────────────────────────────────────┤│
│  │ AS   │ ...    │ ...  │  N   │  N   │  N         ││
│  └─────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────┘
```

> 빈 상태(첫 진입, 적재·업로드 0건): 위 영역 대신 **`<EmptyOnboarding>`** — "엑셀 업로드부터 시작하세요" + `[/admin/upload 로 이동]` CTA.

## 컴포넌트 트리

```
<DashboardPage>          (RSC)
  ├─ <DriftAlertBanner driftOpenCount={number}/>      (RSC)
  ├─ <StatsCards data={StatsData}/>                   (RSC)
  ├─ <RecentUploads rows={Upload[]}/>                 (RSC)
  └─ <EmptyOnboarding/>   ← 위 셋 대신 (조건부)        (RSC)
```

v1 은 **모든 컴포넌트 RSC**. 클라이언트 컴포넌트 0개.

## 데이터 페치

페이지 진입 시 RSC 에서 5개 쿼리를 **병렬** 실행:

```ts
const [
  driftOpenCount,
  asTotal,
  assignmentTotal,
  lastAsUpload,
  lastAssignmentUpload,
  recentUploads,
] = await Promise.all([
  driftAlertRepo.openCount(),
  asReceptionRepo.count(),
  workAssignmentRepo.count(),
  uploadRepo.lastByKind('as_reception'),
  uploadRepo.lastByKind('work_assignment'),
  uploadRepo.recent(5),
]);
```

> [[../08-code-structure]] 의 RSC 예외 — repo 직접 호출 허용 (조회 only).

### Repository 시그니처 (이번 페이지 기준 추가/확정)

```ts
// drift_alert.repo.ts
openCount(): Promise<number>;
// 구현: SELECT count(*) FROM drift_alerts WHERE resolved_at IS NULL

// upload.repo.ts
lastByKind(kind: 'as_reception' | 'work_assignment'): Promise<Upload | null>;
// 구현: SELECT * FROM uploads WHERE kind = $1 ORDER BY uploaded_at DESC LIMIT 1

recent(limit: number): Promise<Upload[]>;
// 구현: SELECT * FROM uploads ORDER BY uploaded_at DESC LIMIT $1

// as_reception.repo.ts / work_assignment.repo.ts
count(): Promise<number>;
// 구현: SELECT count(*) FROM <table>
```

### 페치 비용 가드

- 5개 쿼리 모두 단일 인덱스 hit (count + ordered limit). 합산 < 50ms 목표.
- 인덱스: `drift_alerts_open_idx`, `uploads_uploaded_at_idx` (이미 [[../03-data-model]] 에 정의).

## 상태별 화면

### 빈 상태 — 첫 진입 (적재 0건 + 업로드 0건)

```
<EmptyOnboarding>
  "엑셀 업로드부터 시작하세요"
  [엑셀 업로드 →]   ← /admin/upload
</EmptyOnboarding>
```

판정: `asTotal === 0 && assignmentTotal === 0 && recentUploads.length === 0`

### drift 0 (= 정상)

DriftAlertBanner 가 **녹색 "✅ 모두 일치합니다"** 로 표시. "알림 보기" 버튼 비활성 또는 숨김.

### drift > 0

DriftAlertBanner 가 **노랑/빨강 "갱신 필요 N건"**. "알림 보기" 버튼 활성 → `/admin/alerts`.

### 부분 데이터 (한쪽만 업로드됨)

해당 카드만 시간 표시. 반대편은 "—" 또는 "아직 없음".

### 로딩

RSC 라 클라이언트 로딩 스피너 없음. 필요 시 페이지 레벨 `loading.tsx` (Next App Router) 로 스켈레톤 제공:

```
<DashboardSkeleton>
  - banner skeleton
  - 4 stat cards skeleton
  - 5-row table skeleton
</DashboardSkeleton>
```

### 에러

DB 호출 실패 시 페이지 `error.tsx` 가 fallback:

```
<DashboardError>
  "대시보드를 불러오지 못했습니다."
  [다시 시도]   ← reset()
</DashboardError>
```

Server Action 이 아닌 RSC fetch 실패 케이스. Sentry 등 도입 시 여기서 캡처.

## RSC vs Client 경계

| 영역 | RSC | Client |
|---|---|---|
| Page entry / 데이터 페치 | ✅ | |
| DriftAlertBanner | ✅ | |
| StatsCards | ✅ | |
| RecentUploads (정적 표시) | ✅ | |
| (없음) | | |

> v1 은 인터랙션이 "Link 클릭" 뿐 — 모두 `<Link>` 로 처리, Client 컴포넌트 불필요.

## 인터랙션

| 행위 | 결과 |
|---|---|
| `<DriftAlertBanner>` 본체 또는 [알림 보기] 클릭 | `/admin/alerts` 이동 |
| `<EmptyOnboarding>` [엑셀 업로드] 클릭 | `/admin/upload` 이동 |
| 사이드바 "업로드" / "알림" 클릭 | 각 페이지 이동 |

자동 갱신 / 폴링 없음. 업로드 후 `revalidatePath('/admin/dashboard')` 로 갱신 (이미 [[specs/data-sync]] 에 명시).

## 비기능 가드

- LCP ≤ 2.5s (RSC + 단일 라운드트립)
- 페이지 번들 size: Client 컴포넌트 없음 → 클라이언트 JS 추가 0
- 데이터 신선도: 업로드 직후 `revalidatePath` 로 즉시 갱신. 그 외에는 페이지 재진입 시 갱신.

## 구현 가이드 ([[../08-code-structure]] 정합)

```
[app/(admin)/dashboard/page.tsx]   ← RSC
  - middleware 가 인증 처리
  - Promise.all 로 5개 repo 호출
  - 빈 상태 분기 → <EmptyOnboarding/>
  - 그 외 → <DriftAlertBanner/>, <StatsCards/>, <RecentUploads/>

[app/(admin)/dashboard/loading.tsx]   ← 스켈레톤
[app/(admin)/dashboard/error.tsx]     ← fallback

[src/components/dashboard/]
  - DriftAlertBanner.tsx  (RSC)
  - StatsCards.tsx        (RSC)
  - RecentUploads.tsx     (RSC)
  - EmptyOnboarding.tsx   (RSC)
  - DashboardSkeleton.tsx

[src/repositories/]
  - drift_alert.repo.ts:    openCount()
  - upload.repo.ts:         lastByKind(kind), recent(limit)
  - as_reception.repo.ts:   count()
  - work_assignment.repo.ts: count()
```

## TBD (이 spec 범위 밖)

- 시간대별 업로드 추이 차트 (운영 데이터 누적 후)
- 알림 페이지로의 deep link (특정 `kind` 만 필터된 상태로 진입)
- 다크모드 변형 (07-pwa-responsive 의 TBD 와 함께)
