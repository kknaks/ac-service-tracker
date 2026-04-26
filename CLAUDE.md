# clean_scheduler

**v1 (현재)** — 관리자가 두 엑셀(AS접수리스트, 작업배정관리)을 업로드하면 Supabase 에 저장되고, 두 데이터 간 `요청일자` drift 를 자동 검증·알림한다. 단일 관리자 운영, 데스크탑 우선.

**v2 (예정)** — 현장직원 영역 + 모바일 PWA. 상세는 `docs/roadmap/v2-field.md`.

> ⚠️ **Next 16 사용** — `@AGENTS.md` 의 breaking changes 경고를 반드시 읽고 코드 작성. (Next 14/15 와 다른 부분 다수)

---

## 문서 라우팅 (작업 전 반드시 확인)

모든 작업은 **`docs/README.md` (SSOT)** 부터 확인 후 주제별 하위 문서를 참조한다.

| 주제 | 경로 |
|---|---|
| 전체 개요 · 결정 요약 · 미해결 질문 · 문서 인덱스 | `docs/README.md` |
| 라이브러리/도구 선택 근거 | `docs/01-tech-stack.md` |
| 시스템 구조 · 데이터 흐름 · 배포 | `docs/02-architecture.md` |
| DB 스키마 · 테이블 · 키 | `docs/03-data-model.md` |
| 라우트 · 페이지 구조 · 레이아웃 | `docs/04-pages.md` |
| Server Action · 사용자 시나리오 | `docs/05-flows.md` |
| 인증 · RLS 정책 | `docs/06-permissions.md` |
| PWA · 반응형 전략 | `docs/07-pwa-responsive.md` |
| 코드 구조 · 4-layer 룰 · 디렉토리 | `docs/08-code-structure.md` |
| 기능 spec (도메인별 구체 설계) | `docs/specs/*.md` (예: `data-sync.md`) |
| 향후 버전 로드맵 (v2 등) | `docs/roadmap/*.md` (예: `v2-field.md`) |

## 유지보수 규칙

1. **SSOT 우선**: 결정/변경은 `docs/README.md` 의 결정 로그·요약을 먼저 갱신, 그다음 하위 문서를 상세화한다.
2. **충돌 시 SSOT가 진실**: 하위 문서끼리 충돌하면 SSOT 기준으로 정렬한다.
3. **상태 라벨**: 모든 문서 frontmatter `status` 를 최신으로 유지한다.
   - `agreed` 🟢 — 합의됨, 코드 작성 가능
   - `draft` 🟡 — 초안, 변경 가능
   - `blocked` 🔴 — 보류 (사유는 SSOT 미해결 질문에 명시)
4. **참조는 wikilink**: 문서 간 링크는 Obsidian `[[01-tech-stack]]` 형식.
5. **미해결 질문은 SSOT 한 곳**: 하위 문서에 흩지 않고 SSOT에 모은다.
6. **frontmatter `updated`**: 문서 본문을 수정하면 같은 커밋에서 갱신한다.

## 코드 작성 룰 (요약)

상세는 `docs/08-code-structure.md`. 핵심:

- **호출 방향**: `Components → Server Actions → Services → Repositories → Supabase` (단방향, 건너뛰기 금지)
- **supabase client 는 `repositories/` 에서만 import** (RSC 단순 조회 + middleware 예외)
- **mutation은 항상 service 경유** (도메인 룰·트랜잭션 일관 처리)
- **Server Action 반환은 `{ ok, data?, error? }`** 객체 (throw 대신)
- **파일명**: `<domain>.actions.ts` / `.service.ts` / `.repo.ts` / `.schema.ts`

## 작업 흐름

```
요구 변경 발생
  → SSOT 결정 로그/요약 업데이트
  → 영향받는 하위 문서 status 조정 + 본문 갱신
  → (코드가 있다면) 08-code-structure 룰 준수하여 반영
```

## 자동화 도구

- **`/ssot-update <변경 요약>`** — SSOT 우선 갱신 워크플로우
- **`/doc-status`** — 문서·코드 일관성 점검
- **`@doc-keeper`** — 문서/구조 룰 강제 서브에이전트 (수동 호출 가능)
