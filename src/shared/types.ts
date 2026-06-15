/** 공유 도메인 타입 — main / preload / renderer 모두에서 사용 */

/** 씬: 집필 단위. 본문은 manuscript/ 하위 .md 파일에 저장된다. */
export interface Scene {
  id: string
  title: string
  /** 프로젝트 폴더 기준 상대 경로 (예: manuscript/ch01/scene01.md) */
  file: string
  /** 한 줄 시놉시스 */
  synopsis?: string
  /** 절단신공(클리프행어) — 이 회차를 끝내는 한 방 */
  cliffhanger?: string
  /** 이 회차에 심는 복선 ID들 (복선 원장과 공유) */
  plant?: string[]
  /** 이 회차에서 회수하는 복선 ID들 */
  payoff?: string[]
}

/** 씬 메타데이터(본문 제외)의 편집 가능한 부분 */
export type SceneMeta = Pick<Scene, 'synopsis' | 'cliffhanger' | 'plant' | 'payoff'>

/** 챕터: 씬의 묶음 */
export interface Chapter {
  id: string
  title: string
  scenes: Scene[]
}

/** 파일 간 연결(백링크의 원천). from/to 는 프로젝트 상대 경로. */
export interface Connection {
  id: string
  from: string
  to: string
  label?: string
}

/** 프로젝트 메타데이터. dir 은 디스크 경로이며 project.json 에는 저장하지 않는다. */
export interface Project {
  dir: string
  title: string
  createdAt: string
  updatedAt: string
  chapters: Chapter[]
  /** 파일 간 연결 목록 (그래프/백링크의 데이터 소스) */
  connections?: Connection[]
}

/** project.json 에 직렬화되는 형태 (dir 제외) */
export type ProjectFile = Omit<Project, 'dir'>

/** 스토리 바이블 / 메모리 문서 항목 */
export type BibleGroup =
  | 'memory' // 작품 메모리 (톤·금지·핵심 설정 요약)
  | 'world' // 세계관·설정
  | 'plot' // 플롯·아크·회차 시놉시스
  | 'foreshadow' // 떡밥·복선 원장 (일관성의 척추)
  | 'canon' // 불변 규칙(능력 규칙·fair-play·천장)
  | 'voice' // 작가 보이스·문체·표기 규칙
  | 'character' // 인물 시트

export interface BibleEntry {
  /** 프로젝트 폴더 기준 상대 경로 */
  file: string
  title: string
  group: BibleGroup
}

/** 레퍼런스 코퍼스(로컬 임베딩 RAG) 현황 */
export interface CorpusSource {
  source: string
  chunks: number
}
export interface CorpusInfo {
  model: string
  total: number
  sources: CorpusSource[]
}

/** 시트(구조화 엔티티) 프로필 — 인물·장소·아이템 등 1급 엔티티 */
export interface SheetProfile {
  /** character | place | item | organization | concept */
  type: string
  /** 구조화 속성(코드명/역할/성격 등) */
  attributes: Record<string, string>
  tags: string[]
}

export interface SheetData {
  profile: SheetProfile
  body: string
}

/** 사용 가능한 시트 타입(라벨) */
export const SHEET_TYPES: { value: string; label: string }[] = [
  { value: 'character', label: '인물' },
  { value: 'place', label: '장소' },
  { value: 'item', label: '아이템' },
  { value: 'organization', label: '조직' },
  { value: 'concept', label: '개념' }
]

/** AI 역할 — 각 역할은 별도 시스템 프롬프트로 동작 */
export type AiRole = 'architect' | 'drafter' | 'consistency' | 'readerCritic'

export interface AiStartRequest {
  projectDir: string
  role: AiRole
  prompt: string
  /** 현재 열려 있는 씬의 상대 경로. drafter/consistency/readerCritic 맥락 조립에 사용 */
  sceneFile?: string
  /** drafter 집필 시 레퍼런스 코퍼스(RAG) 발췌를 주입할지 (기본 true) */
  useCorpus?: boolean
  /** 선택: 모델 별칭(예: 'opus', 'sonnet'). 미지정 시 Claude Code 기본값 */
  model?: string
}

/** main → renderer 스트리밍 이벤트 */
export type AiEvent =
  | { requestId: string; kind: 'chunk'; text: string }
  | { requestId: string; kind: 'done' }
  | { requestId: string; kind: 'error'; message: string }
