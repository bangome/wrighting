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

/** 링크 관계 종류 — 그래프/백링크/복선의 데이터 소스 */
export type LinkRel = 'relation' | 'plant' | 'payoff' | 'ref'

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
  kind: 'card' | 'group' | 'ref'
  x: number
  y: number
  w: number
  h: number
  title: string | null
  body: string | null
  color: string | null
  /** kind=ref 일 때 참조하는 아이템 */
  ref_item_id: string | null
  /** 플롯보드 막/단계 인덱스 (null이면 자유 배치/캔버스) */
  lane: number | null
  /** 레인 내 카드 순서 */
  ord: number
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
