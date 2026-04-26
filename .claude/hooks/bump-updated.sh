#!/usr/bin/env bash
#
# bump-updated.sh
# PostToolUse hook: docs/*.md 의 frontmatter `updated:` 를 오늘 날짜로 갱신.
# Edit / Write / MultiEdit 직후에 호출된다.
#
# Hook 입력: stdin 으로 JSON ({ tool_name, tool_input: { file_path, ... }, ... })
# 정책: docs/ 아래 .md 파일이고, frontmatter(`---` 로 시작) 가 있을 때만 동작.

set -euo pipefail

input=$(cat)

# python3 로 file_path 추출 (jq 의존성 회피)
file_path=$(python3 - <<'PY' "$input" 2>/dev/null || true
import sys, json
try:
    data = json.loads(sys.argv[1])
    print(data.get("tool_input", {}).get("file_path", ""))
except Exception:
    print("")
PY
)

[[ -z "$file_path" ]] && exit 0
[[ ! -f "$file_path" ]] && exit 0

# docs/*.md 만 (하위 디렉토리 포함)
case "$file_path" in
  */docs/*.md|*/docs/**/*.md) ;;
  *) exit 0 ;;
esac

# frontmatter 가 있는지 (1행이 `---`)
[[ "$(head -1 "$file_path")" == "---" ]] || exit 0

today=$(date +%Y-%m-%d)

# 첫 frontmatter 블록 안의 `updated:` 한 줄만 갱신
tmp="$(mktemp)"
awk -v today="$today" '
  BEGIN { fm=0; bumped=0 }
  /^---$/ { fm++; print; next }
  fm==1 && !bumped && /^updated:[[:space:]]/ {
    print "updated: " today
    bumped=1
    next
  }
  { print }
' "$file_path" > "$tmp" && mv "$tmp" "$file_path"

exit 0
