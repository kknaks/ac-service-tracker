---
title: 핵심 플로우
status: agreed
tags: [flows, server-actions, sequence]
updated: 2026-04-26
parent: "[[README]]"
---

# 05 · 핵심 플로우

상위: [[README]]
관련: [[02-architecture]] · [[03-data-model]] · [[06-permissions]]

## A. 두 엑셀 업로드 → 적재 → drift 검증

> 이 절은 핵심 흐름 요약만 담는다. 화면 / 컬럼 매핑 / 엣지 케이스 / 액션 시그니처 등 세부는 [[specs/data-sync]] 참조.

```mermaid
sequenceDiagram
  actor Admin as 관리자
  participant UI as /admin/upload
  participant SA as Server Action<br/>processSync()
  participant SVC as syncService
  participant DB as Supabase

  Admin->>UI: AS접수 + 작업배정 엑셀 선택 (둘 또는 하나)
  UI->>SA: FormData (asFile?, assignmentFile?)
  SA->>SA: 인증 (admin) + zod 검증 (MIME, 크기, 시트명)

  alt 검증 실패
    SA-->>UI: { ok:false, errors[] }
  else 통과
    SA->>SVC: process(...)
    par AS 적재
      SVC->>DB: uploads INSERT (kind='as_reception')
      SVC->>DB: as_receptions UPSERT (external_no)
    and 작업배정 적재
      SVC->>DB: uploads INSERT (kind='work_assignment')
      SVC->>DB: work_assignments UPSERT (external_no)
    end

    alt 두 파일 모두 업로드
      SVC->>SVC: 접수번호 join + request_date 비교
      SVC->>DB: drift_alerts<br/>(신규 open / 일치 시 auto-resolve)
      SVC-->>SA: { uploads, comparison: {newDrifts, autoResolved, missing*} }
    else 한 파일만 업로드
      SVC-->>SA: { uploads, comparison: { skipped: true } }
    end

    SA-->>UI: 결과 카드 데이터
    SA->>SA: revalidatePath('/admin/dashboard') + revalidatePath('/admin/alerts')
  end
  Note over SA: 파일 버퍼는 Server Action 종료 시 폐기 (저장 X)
```

### 검증 단계

1. **파일 검증** — MIME, 확장자, 크기 상한 (10MB)
2. **시트 검증** — `SV00148` (AS) / `SV00162` (작업배정), 헤더 위치(row 3, 작업배정은 row 5 sub) 인식
3. **행 검증** — `external_no` 정규식 `^AR\d+$`, `request_date` 파싱
4. **무결성 검증** — `external_no` 중복은 첫 행 채택 + 경고 (보통 발생 안 함)

### Upsert / Drift 규칙

상세는 [[03-data-model]] 의 upsert 절, [[specs/data-sync]] 의 drift 알고리즘 참조.

---

## B. 인증 / 세션 (v1)

```mermaid
sequenceDiagram
  actor U as 관리자
  participant UI as /login
  participant Auth as Supabase Auth
  participant MW as middleware
  participant App as 보호 라우트
  U->>UI: 이메일 입력
  UI->>Auth: signInWithOtp() (매직링크)
  Auth-->>U: 이메일 발송
  U->>Auth: 매직링크 클릭
  Auth-->>UI: 세션 쿠키 set
  U->>App: 페이지 요청
  App->>MW: 미들웨어 가드
  MW->>Auth: getSession()
  alt 세션 없음
    MW-->>U: redirect /login
  else 세션 OK
    MW-->>App: 통과
  end
```

> v1 은 단일 관리자라 역할 분기 없음. v2 합류 시 `members.role` 조회 단계 추가 ([[roadmap/v2-field]]).

---

## 공통 원칙 (v1)

- **모든 변경은 Server Action 경유** — 클라에서 직접 Supabase mutation 금지
- **에러는 사용자에게 한국어로 명확하게** — Supabase 원문 노출 금지

> 🔮 v2 추가 — 현장 mutation 시퀀스 (audit_log + Realtime broadcast + 낙관적 업데이트). [[roadmap/v2-field]] 참조.
