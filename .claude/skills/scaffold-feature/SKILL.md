---
name: scaffold-feature
description: 새 도메인을 4-layer 구조(actions/services/repositories/schema)에 맞춰 표준 템플릿으로 스캐폴딩한다. 사용자가 "새 도메인 만들어줘", "feature 추가", "scaffold <name>", "<name> 모듈 만들어" 같은 요청을 할 때 호출. docs/08-code-structure.md 의 룰을 강제한다.
---

# scaffold-feature

`docs/08-code-structure.md` 룰에 따라 새 도메인의 4-layer 파일 세트를 생성한다.

## 입력

도메인 이름 (lowerCamelCase 또는 snake_case 단일 명사). 예: `reservation`, `member`, `audit`.

## 산출물

```
src/
├── actions/<domain>.actions.ts      # Server Action (controller 역할)
├── services/<domain>.service.ts     # 비즈니스 로직
├── repositories/<domain>.repo.ts    # Supabase 호출
└── lib/validations/<domain>.schema.ts  # zod 스키마
```

## 절차

1. **사전 점검**
   - `src/` 디렉토리 존재 여부 확인. 없으면 사용자에게 "프로젝트 스캐폴딩(`create-next-app`) 먼저 필요" 안내 후 종료
   - 동일 도메인 파일이 이미 있으면 덮어쓰지 말고 사용자에게 확인

2. **파일 생성 (아래 템플릿 사용)**

3. **결과 보고**
   - 생성된 파일 목록
   - 다음 작업 제안 (예: "actions/<domain>.actions.ts 의 TODO 채우기")

## 템플릿

### `src/lib/validations/<domain>.schema.ts`

```ts
import { z } from "zod";

// TODO: 도메인 입력 스키마 정의
export const <domain>InputSchema = z.object({
  // id: z.string().uuid(),
});

export type <Domain>Input = z.infer<typeof <domain>InputSchema>;
```

### `src/repositories/<domain>.repo.ts`

```ts
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/db";

// 이 레이어만 supabase client 를 직접 import 한다.
// 비즈니스 로직 / 권한 판단 / 검증을 여기에 넣지 않는다.

type Row = Database["public"]["Tables"]["<table>"]["Row"];

export const <domain>Repo = {
  async findById(id: string): Promise<Row | null> {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("<table>")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // TODO: list / insert / update / delete 추가
};
```

### `src/services/<domain>.service.ts`

```ts
import { <domain>Repo } from "@/repositories/<domain>.repo";
// import { auditRepo } from "@/repositories/audit.repo";
// 다른 service / 외부 API 호출 가능. supabase client 직접 import 금지.

export const <domain>Service = {
  async getById(id: string) {
    return <domain>Repo.findById(id);
  },

  // TODO: 비즈니스 로직 (상태 전이 검증, audit_log 기록 등)
};
```

### `src/actions/<domain>.actions.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { <domain>Service } from "@/services/<domain>.service";
import { <domain>InputSchema } from "@/lib/validations/<domain>.schema";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function get<Domain>(id: string): Promise<ActionResult<unknown>> {
  // 1. 인증
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "인증이 필요합니다" };

  // 2. 검증 (필요 시)
  // const parsed = <domain>InputSchema.safeParse({ id });
  // if (!parsed.success) return { ok: false, error: "잘못된 입력입니다" };

  // 3. service 위임
  try {
    const data = await <domain>Service.getById(id);
    return { ok: true, data };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "조회에 실패했습니다" };
  }
}

// TODO: create / update / delete 액션 추가. 각 액션은 service 만 호출.
// 변경 후 revalidatePath("/...") 호출.
```

## 치환 규칙

- `<domain>` → 입력값 그대로 (예: `reservation`)
- `<Domain>` → PascalCase (예: `Reservation`)
- `<table>` → 일단 `<domain>` 의 복수형 추정 (예: `reservations`). 실제 테이블명은 사용자 확인 필요.

## 룰 (강제)

- supabase client import 는 **repository 파일에서만** 발생해야 한다
- service 는 component / app 디렉토리에서 import 하지 않는다
- action 은 service 만 호출. repo 직접 호출 금지
- 모든 action 반환은 `{ ok, data?, error? }` 형식

상세 룰: `docs/08-code-structure.md`
