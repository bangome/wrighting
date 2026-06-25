# wrighting

맥·윈도우·웹에서 모두 동작하는 **한국어 소설 집필 워크스페이스**.
스크리브너의 집필 구조(바인더·코르크보드·아웃라이너)와 옵시디언의 캔버스·그래프뷰를 한국어 전용으로 합쳤습니다.

- **웹앱**: 모든 브라우저에서 접속 (Vite + React SPA)
- **데스크톱**: 같은 SPA를 감싼 Electron 앱 (맥/윈도우)
- **백엔드**: Supabase (Postgres + Auth + RLS + Realtime + Storage)
- **동기화**: 1인 다기기 동기화 (Postgres 단일 진실원본 + Realtime 무효화)

## 주요 기능 (1단계)

- 작품 라이브러리(책장), 계정 로그인
- 바인더 트리: 문서/캐릭터·시트/플롯보드/캔버스/폴더 생성·이름변경·휴지통
- 리치텍스트 에디터: 서식·정렬·목록·단어수, **한자 변환·문자표·스마트 따옴표·맞춤법 토글**, 포커스 모드·확대축소
- 폴더 4뷰: 그리드 / 리스트 / 프리보드(코르크보드) / 타임라인
- 캐릭터 시트: 속성·태그·설명 + 백링크
- 플롯보드/캔버스: React Flow 색상 카드·엣지
- 관계 그래프(Cytoscape) + 백링크
- 작업(할일) 관리, 글쓰기 타이머, 커맨드 팔레트(⌘K), 문서 기록(스냅샷)
- 내보내기: docx / md / txt (epub·hwp 후속)

> AI 집필·AI 리뷰는 이번 범위에서 제외했습니다.

## 설정

### 1. Supabase 준비

**로컬 개발 (권장):**
```bash
# Supabase CLI 설치 후
supabase start          # 로컬 Postgres/Auth/Studio 기동
supabase db reset       # supabase/migrations/*.sql 적용
```
`supabase start` 출력의 `API URL`과 `anon key`를 복사합니다.

**클라우드:** supabase.com에서 프로젝트 생성 → SQL Editor에서 `supabase/migrations/0001_init.sql`, `0002_create_project_rpc.sql`을 순서대로 실행.

### 2. 환경변수

```bash
cp .env.example .env
# .env 에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 채우기
```

### 3. 의존성

```bash
npm install
```

## 실행

```bash
npm run dev          # Electron + Vite 개발 모드
```
웹으로만 띄우려면 Vite dev 서버를 직접 사용하거나 `npm run build` 후 `out/renderer`를 정적 호스팅하세요.

### MCP 서버

MCP는 정적 웹앱과 별도 서버 프로세스로 배포합니다. 로컬에서는 아래처럼 실행합니다.

```bash
npm run dev:mcp
```

배포 환경에서는 빌드 후 Node 서버를 시작합니다.

```bash
npm run build:mcp
npm run start:mcp
```

- Health check: `GET /health`
- MCP endpoint: `/mcp` (Streamable HTTP)
- 환경변수: `PORT`, `MCP_HOST`, `MCP_ALLOWED_ORIGIN`

웹앱은 `out/renderer`를 정적 호스팅하고, MCP 서버는 Render/Railway/Fly.io 같은 Node 서버 호스팅에 따로 올리는 구성을 권장합니다.

Vercel에 올릴 때는 `vercel.json` 설정을 사용합니다.

```bash
npm install -g vercel
vercel login
vercel
```

Vercel 프로젝트 설정은 아래처럼 둡니다.

- Build Command: `npm run build:web`
- Output Directory: `out/renderer`
- Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, 필요 시 `MCP_ALLOWED_ORIGIN`

배포 후 MCP 주소는 `https://<프로젝트 도메인>/mcp`입니다. 상태 확인은 `https://<프로젝트 도메인>/health`로 합니다.

## 빌드 · 패키징

```bash
npm run typecheck    # 타입 검사
npm run build        # main/preload/renderer 빌드
npm run package:mac  # 맥 .dmg/.zip
npm run package:win  # 윈도우 설치 프로그램
```

## 구조

```
src/
  shared/types.ts            # DB row 타입 (Supabase 스키마와 1:1)
  renderer/src/              # 웹 SPA (실제 앱)
    lib/                     # supabase, queries, items, links, documents, sheets, boards, tasks, realtime …
    routes/                  # Login, Library, Workspace
    features/                # workspace, editor, folder-views, sheet, plotboard, graph, tasks, command-palette, export
    store/                   # ui, editorPrefs (zustand)
  main/ · preload/           # Electron 얇은 셸 (IPC 없음)
supabase/migrations/         # 스키마 + RLS + create_project RPC
```
