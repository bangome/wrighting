/** 센터 패널에 열려 있는 대상 — 원고 씬(prose) 또는 자료 문서(markdown) */
export type Selection =
  | { kind: 'scene'; id: string; file: string; title: string }
  | { kind: 'doc'; file: string; title: string }

export function selectionKey(sel: Selection | null): string | null {
  if (!sel) return null
  return sel.kind === 'scene' ? `scene:${sel.id}` : `doc:${sel.file}`
}
