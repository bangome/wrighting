/**
 * 공유 도메인 타입 — Supabase Postgres 행(row) 구조와 1:1 대응.
 * 웹(renderer)·Electron(main) 양쪽에서 사용한다.
 * snake_case 컬럼명을 그대로 쓴다(Supabase 기본 매핑).
 */

/** Tiptap/ProseMirror 문서 JSON (구조는 에디터가 결정) */
export type RichDoc = { type: 'doc'; content?: unknown[] } | null

/** 바인더 트리 노드의 종류 */
export type ItemType = 'folder' | 'document' | 'sheet' | 'plotboard' | 'canvas' | 'notes'

/** 시트 하위 종류 (캐릭터·이벤트·조직·아이템·장소·세계관·기타). 'concept'는 구버전 호환용. */
export type SheetSubtype =
  | 'character'
  | 'event'
  | 'organization'
  | 'item'
  | 'place'
  | 'worldview'
  | 'other'
  | 'concept'

/** 폴더 표시 뷰 */
export type FolderView = 'grid' | 'list' | 'corkboard' | 'timeline'

/** 작업(할일) 버킷 */
export type TaskBucket = 'inbox' | 'today' | 'upcoming'

/** 링크 관계 종류 — 그래프/백링크/복선의 데이터 소스. 'parent'는 트리 상하관계(상위→하위) */
export type LinkRel = 'relation' | 'plant' | 'payoff' | 'ref' | 'parent'

/** 사용자 프로필 + 동기화 대상 설정 */
export interface Profile {
  user_id: string
  display_name: string | null
  settings: ProfileSettings
  created_at: string
  updated_at: string
}

export interface ProfileSettings {
  theme?: 'dark' | 'light' | 'system'
  /** 툴바에 표시할 항목 키 목록(커스터마이즈) */
  toolbar?: string[]
}

/** 작품 */
export interface Project {
  id: string
  owner: string
  title: string
  cover_path: string | null
  created_at: string
  updated_at: string
}

/** 바인더 트리 통합 노드 */
export interface Item {
  id: string
  project_id: string
  parent_id: string | null
  type: ItemType
  sheet_subtype: SheetSubtype | null
  /** 노트(type='notes') 전용: 연결된 대상 항목. null이면 독립 노트 */
  linked_item_id: string | null
  title: string
  icon: string | null
  /** 카드 요약(그리드·코르크보드·리스트에 노출) */
  synopsis: string | null
  label_id: string | null
  status_id: string | null
  /** 폴더의 기본 표시 뷰 */
  folder_view: FolderView | null
  sort_order: number
  /** soft-delete (휴지통). null이면 살아있음 */
  deleted_at: string | null
  created_at: string
  updated_at: string
}

/** 문서 본문 (type=document 와 1:1) */
export interface DocumentRow {
  item_id: string
  content: RichDoc
  text_plain: string
  word_count: number
  char_count: number
  updated_at: string
}

/** 시트 본문 (type=sheet 와 1:1) */
export interface SheetRow {
  item_id: string
  attributes: Record<string, string>
  tags: string[]
  body: RichDoc
  updated_at: string
}

/** 라벨(색상 태그) */
export interface Label {
  id: string
  project_id: string
  name: string
  color: string
  sort_order: number
}

/** 상태(초안/완료 등) */
export interface Status {
  id: string
  project_id: string
  name: string
  color: string
  sort_order: number
}

/** 아이템 간 링크 (관계·백링크·복선) */
export interface Link {
  id: string
  project_id: string
  from_item: string
  to_item: string
  rel: LinkRel
  label: string | null
  /** 본문 멘션이 자동 생성한 링크인지 (true면 멘션과 동기화) */
  auto: boolean
  created_at: string
}

/** 복선 원장 항목 (경량) */
export interface Foreshadow {
  id: string
  project_id: string
  code: string
  content: string | null
  reveal_at: string | null
  status: 'hidden' | 'hinted' | 'paid'
}

/** 플롯보드/캔버스 노드 */
export interface BoardNode {
  id: string
  board_item_id: string
  kind: 'card' | 'group' | 'ref' | 'shape'
  x: number
  y: number
  w: number
  h: number
  title: string | null
  body: string | null
  color: string | null
  /** kind=ref 일 때 참조하는 아이템 */
  ref_item_id: string | null
  /** kind='shape' 일 때 도형 종류 (rectangle/ellipse/diamond/roundRect) */
  shape: string | null
  /** 플롯보드 막/단계 인덱스 (null이면 자유 배치/캔버스). col_id 도입 후 레거시 */
  lane: number | null
  /** 컬럼(kind='group') 내 카드 순서, 또는 컬럼 자체의 순서 */
  ord: number
  /** kind='card' 일 때 소속 컬럼(kind='group') id. null이면 미배치/캔버스 */
  col_id: string | null
  /** 파트 카드 태그 */
  tags: string[]
  /** 카드에 연결된 문서(document) 항목 id 목록 */
  doc_ids: string[]
  /** 카드가 언급(멘션)하는 항목 id 목록 */
  mention_ids: string[]
}

/** 플롯보드/캔버스 엣지 */
export interface BoardEdge {
  id: string
  board_item_id: string
  source: string
  target: string
  label: string | null
}

/** 작업(할일) */
export interface Task {
  id: string
  project_id: string
  /** null이면 보관함(파일에 속하지 않는 할일) */
  item_id: string | null
  title: string
  done: boolean
  due_date: string | null
  scheduled_at: string | null
  bucket: TaskBucket
  sort_order: number
  created_at: string
}

/** 문서 공유 링크 */
export interface Share {
  id: string
  project_id: string
  item_id: string
  token: string
  expires_at: string | null
  created_at: string
}

/** 문서 스냅샷(기록) */
export interface Snapshot {
  id: string
  item_id: string
  content: RichDoc
  label: string | null
  created_at: string
}

/** Claude Code 하네스 에이전트(.claude/agents/<name>.md) */
export interface HarnessAgent {
  id: string
  owner: string
  /** null = 공용(모든 작품 기본), 값이 있으면 해당 작품 전용 */
  project_id: string | null
  name: string
  description: string
  model: string | null
  body: string
  sort_order: number
  created_at: string
  updated_at: string
}

/** Claude Code 하네스 스킬(.claude/skills/<name>/SKILL.md) */
export interface HarnessSkill {
  id: string
  owner: string
  project_id: string | null
  name: string
  description: string
  body: string
  sort_order: number
  created_at: string
  updated_at: string
}

/** 메인 하네스 지침 (프로젝트 루트 CLAUDE.md) — 작품당 하나인 싱글톤 */
export interface HarnessDoc {
  id: string
  owner: string
  /** null = 공용(기본 템플릿), 값이 있으면 해당 작품 전용 */
  project_id: string | null
  body: string
  updated_at: string
}

/**
 * 하네스 변경 이력 (지침·에이전트·스킬). append-only.
 * 본문에 섞지 않고 별도 보관하며 .claude/ 로 내보내지 않는다(토큰 절약).
 */
export interface HarnessHistory {
  id: string
  owner: string
  project_id: string | null
  target_kind: 'doc' | 'agent' | 'skill' | 'bundle'
  /** 원본 행 id (삭제돼도 이력은 남으므로 dangling 가능) */
  target_id: string | null
  /** 항목 이름(에이전트·스킬 슬러그, 지침은 CLAUDE.md) */
  target_name: string
  action: 'create' | 'update' | 'delete' | 'import'
  /** 사람이 읽는 변경 요약 */
  summary: string
  /** 변경 시점 본문 스냅샷(되돌리기용). null 가능 */
  snapshot: string | null
  created_at: string
}

/** 에이전트 model 선택지 (null=상속) */
export const HARNESS_MODELS = ['sonnet', 'opus', 'haiku'] as const

/** 데스크톱 브리지가 가져오기/내보내기로 주고받는 하네스 묶음 */
export interface HarnessBundle {
  agents: { name: string; description: string; model: string | null; body: string }[]
  skills: { name: string; description: string; body: string }[]
  /** 루트 CLAUDE.md 본문. 없으면 null */
  claudeMd: string | null
}

/** 시트 하위 종류별 라벨 (구버전 'concept' 포함) */
export const SHEET_SUBTYPE_LABEL: Record<SheetSubtype, string> = {
  character: '캐릭터',
  event: '이벤트',
  organization: '조직',
  item: '아이템',
  place: '장소',
  worldview: '세계관',
  other: '기타',
  concept: '세계관'
}

/** '새 시트' 메뉴에 노출되는 생성 가능한 하위 종류 (스크린샷 순서) */
export const SHEET_SUBTYPES: { value: SheetSubtype; label: string }[] = [
  { value: 'character', label: SHEET_SUBTYPE_LABEL.character },
  { value: 'event', label: SHEET_SUBTYPE_LABEL.event },
  { value: 'organization', label: SHEET_SUBTYPE_LABEL.organization },
  { value: 'item', label: SHEET_SUBTYPE_LABEL.item },
  { value: 'place', label: SHEET_SUBTYPE_LABEL.place },
  { value: 'worldview', label: SHEET_SUBTYPE_LABEL.worldview },
  { value: 'other', label: SHEET_SUBTYPE_LABEL.other }
]
