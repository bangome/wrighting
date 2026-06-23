# wrighting MCP 서버

wrighting 앱의 클라우드(Supabase) 데이터를 **Claude Code**에 노출하는 MCP(stdio) 서버입니다.
하네스(CLAUDE.md·에이전트·스킬)와 소설 콘텐츠(원고·시트·플롯보드·링크·복선)를 **읽고 쓸 수** 있어,
`.claude/` 파일로 내보내지 않고도 Claude Code가 클라우드에서 직접 집필 지침과 원고를 다룰 수 있습니다.

## 설정

```bash
cd mcp
npm install
cp .env.example .env   # 값 채우기
npm run build
```

`.env`:

| 변수 | 설명 |
| --- | --- |
| `WRIGHTING_SUPABASE_URL` | Supabase 프로젝트 URL (앱의 `VITE_SUPABASE_URL`과 동일) |
| `WRIGHTING_SUPABASE_SERVICE_KEY` | **Service role key** (RLS 우회 — 외부 공유 금지) |
| `WRIGHTING_OWNER_ID` | 소유자 `auth.users.id`. `create_project` 등 쓰기에 필수, 단일 사용자도 권장 |
| `WRIGHTING_PROJECT_ID` / `WRIGHTING_PROJECT` | (선택) 이 인스턴스의 기본 작품. 도구에서 `projectId`/`project` 생략 시 사용 |
| `GEMINI_API_KEY` | (선택) RAG 의미검색(`search mode=semantic`)·`reindex` 용. 없으면 `search`는 키워드로만 동작 |

### 작품 매핑

각 소설을 별도 작품으로 다룰 때는, 소설 폴더의 `.mcp.json` 에 그 작품을 기본값으로 지정하면 매핑이 자동됩니다.
도구 호출 시 작품 해석 우선순위:

1. 인자 `projectId` → 2. 인자 `project`(제목, 부분 일치) → 3. `WRIGHTING_PROJECT_ID` → 4. `WRIGHTING_PROJECT`(제목) → 5. 작품이 하나뿐이면 그것 → 6. 실패(목록 안내)

`resolve_project` 도구로 현재 어떤 작품에 매핑되는지 먼저 확인할 수 있습니다.

> ⚠️ service role key는 전체 DB 접근 권한입니다. `.env`는 커밋되지 않으며(`.gitignore`), 로컬 개인용으로만 사용하세요.

## Claude Code에 등록

프로젝트 루트의 `.mcp.json` (또는 `claude mcp add`):

```json
{
  "mcpServers": {
    "wrighting": {
      "command": "node",
      "args": ["C:/aegis_dx/reference/wrighting/mcp/dist/index.js"],
      "env": {
        "WRIGHTING_SUPABASE_URL": "https://xxxx.supabase.co",
        "WRIGHTING_SUPABASE_SERVICE_KEY": "eyJ..."
      }
    }
  }
}
```

개발 중에는 빌드 없이 `tsx`로도 실행할 수 있습니다:
`"command": "npx", "args": ["tsx", ".../mcp/src/index.ts"]`.

## 제공 도구 (43종)

작품-범위 도구는 모두 `projectId` 또는 `project`(제목)를 선택 인자로 받으며, 생략 시 위 매핑 규칙으로 해석합니다.

**작품 & 매핑**
- `list_projects` — 작품 목록
- `resolve_project` — 현재 매핑되는 작품 확인
- `create_project(title)` — 새 작품 + 기본 폴더·라벨·상태 시드 (`WRIGHTING_OWNER_ID` 필요)

**바인더(항목)**
- `list_items(type?, includeDeleted?)` · `find_items(query)` · `get_item(itemId)`
- `create_folder(title, parentId?)` · `create_document(title, text?, parentId?)` · `create_sheet(title, subtype, …)`
- `update_item(itemId, {title?, synopsis?, parentId?, statusId?, labelId?, icon?, sortOrder?})`
- `delete_item(itemId, hard?)`(soft=휴지통) · `restore_item(itemId)`

**본문**
- `get_document` · `update_document(itemId, text)`(전체 교체)
- `get_sheet` · `update_sheet(itemId, attributes?, tags?, bodyText?)`(부분)

**복선·링크**
- `list_foreshadow` · `create_foreshadow(code, …)` · `update_foreshadow(id, …)` · `delete_foreshadow(id)`
- `list_links` · `create_link(fromItem, toItem, rel?, label?)` · `delete_link(id)`

**라벨·상태**
- `list_labels` · `list_statuses` · `create_status(name, color?)` · `create_label(name, color?)`

**플롯보드·캔버스**
- `create_plotboard(title, parentId?)` — 새 플롯보드 항목 생성
- `create_canvas(title, parentId?)` — 새 캔버스 항목 생성
- `create_board_node(boardItemId, …)` · `update_board_node(id, …)` · `delete_board_node(id)`
- `create_board_edge(boardItemId, source, target, label?)` · `delete_board_edge(id)`

**하네스**
- `get_harness` — **실효 하네스**(CLAUDE.md + 에이전트 + 스킬, 공용+작품 병합)

**지식 그래프 · 검색 (지식 활용)**
- `list_by_subtype(subtype)` — 하위종류별 시트 목록
- `search_sheets(subtype?, tag?, query?)` — 시트 태그·하위종류·제목 검색
- `get_relations(itemId, direction?, rel?)` — 관계 트리플(상대 항목 해석)
- `get_backlinks(itemId)` — 들어오는 링크 + "등장 문서"
- `traverse(itemId, depth?, rel?, maxNodes?)` — 관계 그래프 BFS 탐색
- `get_entity_context(itemId)` — 한 항목 지식 1콜 번들(속성+관계+등장문서+연관시트)
- `search(query, mode?)` — `semantic`(임베딩)·`keyword`(ILIKE)·`auto`
- `reindex(scope?, itemId?)` — 문서·시트 본문을 청크·임베딩(재)생성. **의미검색 전 1회 실행**

### RAG 의미검색 사용법

1. `GEMINI_API_KEY` 설정 (`.env`).
2. `reindex` 1회 실행 → `doc_chunks` 에 Gemini 임베딩(1536차원, 코사인) 적재.
3. `search(query, mode='semantic')` 또는 `auto` 로 의미 검색.

- 임베딩: `gemini-embedding-001`, `output_dimensionality=1536`(HNSW 인덱스 한계 2000 이내) + L2 정규화.
- 본문 수정 후에는 해당 항목을 `reindex(itemId=…)` 로 재색인해야 검색에 반영됨.
- 마이그레이션 `0014_rag_embeddings.sql`(pgvector 확장 + `doc_chunks` + `match_doc_chunks` RPC) 적용 필요.

시트 `subtype`: `character`·`event`·`organization`·`item`·`place`·`worldview`·`other`.
본문 텍스트는 평문/간이 마크다운(`#`·`##`·`###` 제목)으로 주고받으며, 저장 시 Tiptap 구조로 변환됩니다.

## 참고: 참조 소설 → wrighting 매핑

`luckyapt`·`rubycarrier`·`mdoctor` 같은 하네스 소설의 설정 구조는 다음과 같이 옮기면 됩니다.

| 참조 소설 자료 | wrighting |
| --- | --- |
| `_workspace/00_*` 인물·목소리 | `create_sheet(subtype='character')` (속성=출생연도·말투 등) |
| 세계관/설정집 | `create_sheet(subtype='worldview'\|'place'\|'organization'\|'item')` |
| 회차 본문(`episodes/*.md`) | `create_document`(문서 폴더 하위) |
| 복선 원장(M·F·I…) | `create_foreshadow` + `create_link(rel='plant'\|'payoff')` |
| 플롯/구성(막 구조) | plotboard 항목 + `create_board_node`/`create_board_edge` |
| CLAUDE.md·에이전트·스킬 | 앱 하네스 탭에서 가져오기 → `get_harness` 로 노출 |
