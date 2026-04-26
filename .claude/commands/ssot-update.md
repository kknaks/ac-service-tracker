---
description: 변경 사항을 SSOT 부터 우선 갱신하는 워크플로우. doc-keeper 에이전트에 위임.
argument-hint: <변경 내용 요약>
---

# /ssot-update

다음 변경을 **SSOT 우선** 으로 반영해주세요. 작업은 `doc-keeper` 서브에이전트에 위임합니다.

**변경 요약**: $ARGUMENTS

## 실행 순서 (반드시 이 순서)

1. `docs/README.md` 의 **결정 요약 / 결정 로그 / 미해결 질문** 갱신
2. 영향받는 하위 문서 식별 (라우팅 테이블 기준)
3. 각 하위 문서의 본문 + frontmatter `status` + `updated` 갱신
4. wikilink 무결성 점검 (깨진 링크 없는지)
5. 변경 사항 요약 보고 (생성/수정/삭제 파일 + SSOT 결정 로그 신규 라인)

## 금지

- 하위 문서를 먼저 수정하고 SSOT는 나중에 — ❌
- OQ를 하위 문서에 추가 — ❌ (SSOT 한 곳)
- frontmatter `updated` 미갱신 — ❌
