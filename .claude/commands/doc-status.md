---
description: 모든 문서·코드의 status·frontmatter·wikilink·구조 룰 일관성을 점검합니다.
allowed-tools: Bash(grep:*), Bash(rg:*), Bash(find:*), Bash(ls:*), Read
---

# /doc-status

`doc-keeper` 에이전트에게 다음 점검을 수행해달라고 위임합니다.

## 점검 항목

1. **frontmatter status ↔ SSOT 인덱스 일치**
   각 `docs/*.md` 의 frontmatter `status` 와 `docs/README.md` 인덱스 표의 라벨이 일치하는지

2. **깨진 wikilink**
   `[[파일명]]` 형식으로 참조됐지만 실제로 존재하지 않는 파일

3. **오래된 draft**
   `updated` 필드가 14일 이상 된 `draft` 문서 — 정체된 결정 후보

4. **OQ 매트릭스 일치**
   SSOT 미해결 질문(OQ-N)의 "영향 문서" 와 실제 하위 문서 내 OQ-N 참조 일치 여부

5. **코드 구조 위반** (src/ 존재 시)
   - `supabase` client 가 허용 영역 외에서 import 되는가
   - Components → Service / Repository 직접 호출이 있는가
   - Server Action 이 supabase 를 직접 호출하는가

6. **frontmatter 필수 필드 누락**
   `title` / `status` / `tags` / `updated` / `parent` 중 빠진 것

## 출력 포맷

```
## ✅ 정상
- <항목>

## ⚠️ 경고
- <항목 + 위치>

## ❌ 오류 (수정 필요)
- <항목 + 위치 + 권장 조치>
```

리포트만 출력하고 자동 수정은 하지 않음. 수정이 필요하면 `/ssot-update` 로 별도 진행.
