---
title: 반응형 (v1) / PWA (v2)
status: agreed
tags: [responsive, pwa, ux, desktop-first]
updated: 2026-04-26
parent: "[[README]]"
---

# 07 · 반응형 (v1) / PWA (v2)

상위: [[README]]
관련: [[04-pages]] · [[roadmap/v2-field]]

> **v1 은 PWA 미도입, 데스크탑 우선**.
> PWA / 모바일 우선 전략은 v2 (현장직원 영역) 에서 도입. 상세는 [[roadmap/v2-field]] 의 "PWA" 절.

## v1 반응형 전략

### 원칙

1. **데스크탑 우선** — 1280px 기준 디자인 (관리자 업무 환경)
2. **모바일에서도 깨지지 않게** `md:` (≥ 768px) 에서 풀 레이아웃, 그 미만은 단순화
3. **터치 타겟 ≥ 44px** — 관리자가 모바일에서 출장 중 확인하는 케이스 대비
4. **테이블 → 모바일은 카드 리스트** — `<DataList responsive>` 컴포넌트로 일괄 처리

### 레이아웃

| 영역 | Mobile (< 768px) | Desktop (≥ 768px) |
|---|---|---|
| `(admin)` | 햄버거 + Drawer + 컨테이너 풀폭 | 좌측 사이드바 (~240px) + 본문 max-w-7xl |

### 페이지별 모바일 분기 (예)

| 페이지 | 모바일 처리 |
|---|---|
| `/admin/dashboard` | 카드 세로 스택, 차트는 가로 스크롤 |
| `/admin/upload` | 두 드롭존 세로 배치, 결과 카드 풀폭 |
| `/admin/alerts` | 테이블 → 카드 리스트 |

### 타이포 / 간격

- 본문: 14px (데스크탑 데이터 테이블), 16px (모바일)
- 행간: 1.5
- 색상은 shadcn 기본 토큰 사용

## 성능 가드 (v1)

- 모바일 4G 가정, 초기 JS ≤ 200KB gzip 목표
- Server Component 우선 — 클라이언트 컴포넌트는 인터랙션 영역만 (드롭존, 테이블 정렬 등)
- LCP 이미지: `next/image` + `priority`

## v2 합류 시 갱신할 것

- (field) 영역만 **모바일 우선** 으로 별도 디자인 토큰 사용
- PWA 도입 — manifest, Service Worker, 캐시 전략, iOS 안내 컴포넌트
- 푸시 알림 검토 (Supabase Realtime + Web Push)
- 오프라인 큐잉 — 네트워크 끊김 중 상태 변경 보류

상세는 [[roadmap/v2-field]] 의 "PWA" / "반응형 우선순위 변경" 절.

## TBD

- 다크모드 도입 여부 (v1 / v2 공통)
- 폰트 — Pretendard 등 한국어 최적 폰트 도입 검토
