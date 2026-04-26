---
title: 페이지 spec — /admin/alerts
status: draft
tags: [spec, page, alerts, drift, admin]
updated: 2026-04-26
parent: "[[../README]]"
---

# Spec · `/admin/alerts`

상위: [[../README]]
관련: [[../04-pages]] · [[data-sync]] · [[page-dashboard]] · [[../03-data-model]] · [[../08-code-structure]]

> 🔮 **v1 미사용** — 현재 v1 은 in-memory 도구라 `drift_alerts` 테이블이 비어있어 알림 페이지도 빈 상태. **v2 에서 DB 영속화 합류 시 본 spec 활성**. [[../roadmap/v2-field]] B 절 참조.

## 목적

미해소 drift 리스트를 보고, **어떤 AS 접수의 어느 필드를 어떤 값으로** 갱신해야 하는지 정확히 파악한다. drift 의 종류(`kind`)에 따라 갱신 안내 메시지가 달라진다.

## 진입 / 위치

- 라우트: `/admin/alerts`
- 진입 경로:
  - `/admin/dashboard` 의 `<DriftAlertBanner>` 클릭
  - 사이드바 "알림" 메뉴

## 화면 구성

```
┌──────────────────────────────────────────────────────────┐
│ <AlertSummary>                                            │
│  미해소 drift 총 N건                                       │
│  · mismatch              : N건                             │
│  · missing_in_as         : N건                             │
│  · missing_in_assignment : N건                             │
├──────────────────────────────────────────────────────────┤
│ <FilterBar>     [전체] [mismatch] [missing_in_as] [...]   │  ← URL ?kind=
├──────────────────────────────────────────────────────────┤
│ <DriftList>                                               │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ 접수번호 │ kind │ 고객명 │ AS요청일자 │ 작업배정요청일자 │ 검출 ││
│ ├─────────────────────────────────────────────────────┤  │
│ │ AR2604…  │ mism │ 염민수 │ 2026-04-25 │ 2026-05-02   │ ... │
│ │  …                                                   │  │
│ └─────────────────────────────────────────────────────┘  │
│  (limit 50)                                               │
└──────────────────────────────────────────────────────────┘

   ▶ 행 클릭 → 우측 슬라이드 <DriftDetailDrawer>
```

빈 상태 (drift 0):

```
┌──────────────────────────────────────────────────────────┐
│                       ✅                                  │
│           모든 데이터가 일치합니다                          │
│   마지막 검증: <시간> · <어느 업로드>                       │
└──────────────────────────────────────────────────────────┘
```

## 컴포넌트 트리

```
<AlertsPage>                         (RSC)
  ├─ <AlertSummary counts={...}/>    (RSC)
  ├─ <FilterBar selected={kind}/>    (RSC, <Link>로 URL 변경)
  ├─ <DriftList items={...}>         (RSC)
  │    └─ <DriftRow item onClick=…/> (Client — onClick 필요)
  ├─ <DriftDetailDrawer>             (Client — 열림/닫힘 상태)
  └─ <EmptyDrift lastVerifiedAt={…}/>← 위 셋 대신 (조건부)
```

## 데이터 페치 (RSC)

페이지 진입 시 URL search params 의 `kind` 를 읽어 한 번에 페치:

```ts
// app/(admin)/alerts/page.tsx
export default async function AlertsPage({
  searchParams,
}: { searchParams: { kind?: string } }) {
  const kind = parseKind(searchParams.kind);  // 검증 — 없으면 undefined

  const [counts, items] = await Promise.all([
    driftAlertRepo.openCountByKind(),
    driftAlertRepo.listOpenWithRelated({ kind, limit: 50 }),
  ]);

  if (counts.total === 0) return <EmptyDrift … />;

  return (
    <>
      <AlertSummary counts={counts} />
      <FilterBar selected={kind} counts={counts} />
      <DriftList items={items} />
    </>
  );
}
```

> **JOIN 정책**: `drift_alerts` + `as_receptions` + `work_assignments` 를 LEFT JOIN. v1 은 raw 영역이 없어서 `customer_name` 만 select — 50건 페이로드 < 5KB. drawer 즉시 표시 가능 (추가 라운드트립 X).

## Repository 시그니처

```ts
// drift_alert.repo.ts
type DriftWithRelated = {
  id: string;
  external_no: string;
  kind: 'mismatch' | 'missing_in_as' | 'missing_in_assignment';
  field: 'request_date';
  as_value: unknown;            // 원본 값 (date 또는 null)
  assignment_value: unknown;
  detected_at: Date;
  last_upload_id: string | null;
  as: { customer_name: string } | null;
  assignment: { customer_name: string } | null;
};

listOpenWithRelated(opts: {
  kind?: 'mismatch' | 'missing_in_as' | 'missing_in_assignment';
  limit: number;
}): Promise<DriftWithRelated[]>;
// SQL:
// SELECT da.*,
//        ar.customer_name AS as_customer,
//        wa.customer_name AS wa_customer
// FROM drift_alerts da
// LEFT JOIN as_receptions ar ON ar.external_no = da.external_no
// LEFT JOIN work_assignments wa ON wa.external_no = da.external_no
// WHERE da.resolved_at IS NULL
//   AND ($1::text IS NULL OR da.kind = $1)
// ORDER BY da.detected_at DESC
// LIMIT $2

openCountByKind(): Promise<{
  total: number;
  mismatch: number;
  missing_in_as: number;
  missing_in_assignment: number;
}>;
```

## 필터 (FilterBar)

URL search params 기반. `<Link>` 컴포넌트로 RSC 유지.

| 버튼 | URL |
|---|---|
| 전체 | `/admin/alerts` |
| mismatch | `/admin/alerts?kind=mismatch` |
| missing_in_as | `/admin/alerts?kind=missing_in_as` |
| missing_in_assignment | `/admin/alerts?kind=missing_in_assignment` |

각 버튼 옆에 카운트 배지 노출 (`mismatch (N)`).

`parseKind()`는 허용된 값 외에는 `undefined` 반환 — 잘못된 쿼리는 전체 표시로 fallback.

## 정렬

기본: `detected_at DESC`. v1 은 정렬 변경 옵션 없음 (단순화).

## 상세 Drawer (`<DriftDetailDrawer>`)

행 클릭 시 우측에서 슬라이드. **shadcn `Sheet` 컴포넌트** 사용 추천.

### 구성

```
┌────────────────────────────────────┐
│ ╳ 접수번호 AR2604130031163        │  ← 상단 close + 접수번호
│   [mismatch] 배지                  │
├────────────────────────────────────┤
│ 갱신 가이드                         │  ← kind 별 메시지
│ ┌────────────────────────────────┐ │
│ │ AS 엑셀의 [접수번호 X] 행에서   │ │
│ │ "A/S요청일자" 를               │ │
│ │ 2026-05-02 (작업배정 값) 으로   │ │
│ │ 수정 후 재업로드 하세요.        │ │
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ 비교                                │
│  필드       │ AS         │ 작업배정 │
│  요청일자   │ 2026-04-25 │ 2026-05-02│  ← 강조
│  고객명     │ 염민수      │ 염민수   │
└────────────────────────────────────┘

(v1 은 원본 raw 영역 없음 — MVP 운영 후 필요해지면 추가)
```

### 갱신 가이드 카피 (kind 별)

| kind | 메시지 |
|---|---|
| `mismatch` | "AS 엑셀의 접수번호 **{external_no}** 행에서 `A/S요청일자` 를 **{assignment_value}** (작업배정의 값)으로 수정 후 재업로드하세요." |
| `missing_in_as` | "이 접수는 **AS접수리스트에서 누락**되었습니다. AS 엑셀에 접수번호 **{external_no}** 를 추가 후 재업로드하세요." |
| `missing_in_assignment` | "이 접수는 **작업배정관리에서 누락**되었습니다. 작업배정 엑셀을 확인 후 재업로드하세요. (수동 갱신은 AS 가 아닌 작업배정 측 책임)" |

### Drawer 의 데이터

페이지에서 이미 fetch 한 `DriftWithRelated` 를 props 로 전달 — 추가 fetch 없음.

## 인터랙션

| 행위 | 결과 |
|---|---|
| `<DriftRow>` 클릭 | Drawer open + 해당 item 데이터 주입 |
| Drawer 닫기 (╳ / 바깥 클릭 / Esc) | Drawer close |
| `<FilterBar>` 버튼 클릭 | URL 변경 → RSC 재페치 |
| `<EmptyDrift>` 의 "업로드 페이지로" CTA | `/admin/upload` 이동 |

## 빈 / 로딩 / 에러

### 빈 (drift 0)

`<EmptyDrift>` — 큰 ✅ + "모든 데이터가 일치합니다" + 마지막 업로드 시간.

### 로딩

페이지 레벨 `loading.tsx` 스켈레톤:

```
<AlertsSkeleton>
  - summary skeleton (카운트 카드)
  - filter bar skeleton
  - 5-row table skeleton
</AlertsSkeleton>
```

### 에러

`error.tsx` fallback — "알림을 불러오지 못했습니다 [다시 시도]"

## RSC vs Client 경계

| 영역 | RSC | Client |
|---|---|---|
| Page entry / 데이터 페치 | ✅ | |
| AlertSummary | ✅ | |
| FilterBar (`<Link>` 사용) | ✅ | |
| DriftList | ✅ | |
| DriftRow (onClick) | | ✅ |
| DriftDetailDrawer (open state) | | ✅ |
| EmptyDrift | ✅ | |

> Drawer 의 open/close 상태는 URL 에 두지 않고 클라이언트 상태로만 관리. 새로고침 시 닫힘 (admin 1명, 단순 UX 우선).

## 비기능 가드

- 단일 쿼리 (LEFT JOIN × 2) — 인덱스: `drift_alerts_open_idx (external_no, field) WHERE resolved_at IS NULL`
- 응답 < 200ms (50건 기준)
- Client 번들 추가: shadcn Sheet ≈ 5KB

## 구현 가이드 ([[../08-code-structure]] 정합)

```
[app/(admin)/alerts/page.tsx]      ← RSC
  - searchParams.kind 파싱
  - Promise.all([openCountByKind, listOpenWithRelated])
  - 빈 상태 분기 → <EmptyDrift/>

[app/(admin)/alerts/loading.tsx]   ← 스켈레톤
[app/(admin)/alerts/error.tsx]     ← fallback

[src/components/alerts/]
  - AlertSummary.tsx       (RSC)
  - FilterBar.tsx          (RSC, <Link>)
  - DriftList.tsx          (RSC)
  - DriftRow.tsx           (Client — "use client", onClick)
  - DriftDetailDrawer.tsx  (Client — Sheet, open state)
  - EmptyDrift.tsx         (RSC)
  - AlertsSkeleton.tsx

[src/repositories/drift_alert.repo.ts]
  - listOpenWithRelated(opts): JOIN 쿼리
  - openCountByKind(): GROUP BY kind
```

## v1 에서 의도적으로 안 하는 것

- **Drawer 의 raw 영역 자체 제거** — 갱신 가이드 + 핵심 비교(요청일자/고객명)만으로 충분. MVP 운영 후 검증 욕구 발생 시 추가
- 강제 dismiss (자동 해소만)
- CSV export
- 정렬 변경
- 검색 (접수번호로 찾기)
- 페이지네이션 — 50 초과 시 도입

## TBD

- Drawer raw 영역 도입 검토 (MVP 운영 후 검증 욕구 발생 시) + diff highlight 까지 갈지 단순 펼침으로 그칠지
- 50건 초과 시 페이지네이션 도입 트리거 (운영 데이터 보고)
- "일괄 dismiss" 액션 (강제 해소)
- 알림 이력(해소된 것 포함) 별도 페이지 — `/admin/alerts/history`
