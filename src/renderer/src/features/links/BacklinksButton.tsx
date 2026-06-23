import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link2 } from 'lucide-react'
import type { LinkRel, Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { useLinks } from '../../lib/links'

/** 링크 관계별 한글 라벨 (백링크 그룹 표시용) */
const REL_LABEL: Record<LinkRel, string> = {
  relation: '관계',
  causes: '인과',
  precedes: '시간선후',
  opposes: '대립·갈등',
  allies: '동맹·협력',
  transforms: '변화 계기',
  symbolizes: '상징',
  plant: '복선',
  payoff: '회수',
  ref: '본문 언급',
  parent: '상위 항목'
}

/**
 * 백링크 버튼 + 팝오버 레이어 — 현재 항목을 가리키는(to_item === itemId) 다른 항목들을 표시한다.
 * 관계 종류별로 묶고, 클릭하면 해당 항목으로 이동한다. (사이드패널 대신 적당한 크기의 레이어)
 */
export function BacklinksButton({
  project,
  itemId
}: {
  project: Project
  itemId: string | undefined
}): JSX.Element {
  const nav = useNavigate()
  const { data: items } = useItems(project.id)
  const { data: links } = useLinks(project.id)
  const [open, setOpen] = useState(false)

  const target = useMemo(
    () => (items ?? []).find((i) => i.id === itemId),
    [items, itemId]
  )

  /** 이 항목을 가리키는 링크를 관계별로 묶는다. 출발 항목이 사라진 링크는 제외. */
  const groups = useMemo(() => {
    if (!itemId) return [] as { rel: LinkRel; entries: { linkId: string; fromId: string; title: string }[] }[]
    const byId = new Map((items ?? []).map((i) => [i.id, i]))
    const incoming = (links ?? []).filter((l) => l.to_item === itemId)
    const map = new Map<LinkRel, { linkId: string; fromId: string; title: string }[]>()
    for (const l of incoming) {
      const from = byId.get(l.from_item)
      if (!from || from.deleted_at) continue
      const arr = map.get(l.rel) ?? []
      arr.push({ linkId: l.id, fromId: from.id, title: from.title })
      map.set(l.rel, arr)
    }
    const order: LinkRel[] = [
      'relation', 'causes', 'precedes', 'opposes', 'allies', 'transforms', 'symbolizes',
      'plant', 'payoff', 'ref', 'parent'
    ]
    return order
      .filter((rel) => map.has(rel))
      .map((rel) => ({ rel, entries: map.get(rel)! }))
  }, [items, links, itemId])

  const total = groups.reduce((n, g) => n + g.entries.length, 0)

  return (
    <div className="relative">
      <button
        className={`icon-btn relative ${open ? 'text-accent' : ''}`}
        title="백링크"
        onClick={() => setOpen((v) => !v)}
      >
        <Link2 size={16} />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-none text-white">
            {total}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-30 w-72 rounded-app border border-border bg-bg-elev p-2 shadow-[var(--shadow)]">
            <div className="mb-1 flex items-center gap-2 px-2 py-1">
              <Link2 size={14} className="text-text-muted" />
              <span className="text-sm font-semibold">백링크</span>
              {total > 0 && <span className="text-xs text-text-faint">{total}</span>}
            </div>
            {total === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-text-faint">
                {target ? `'${target.title}'을(를)` : '이 항목을'} 가리키는 항목이 없습니다.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {groups.map((g) => (
                  <div key={g.rel} className="mb-2 last:mb-0">
                    <div className="px-2 py-1 text-xs text-text-faint">
                      {REL_LABEL[g.rel]} · {g.entries.length}
                    </div>
                    {g.entries.map((e) => (
                      <button
                        key={e.linkId}
                        className="flex w-full items-center rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm hover:bg-bg-hover"
                        onClick={() => {
                          setOpen(false)
                          nav(`/p/${project.id}/i/${e.fromId}`)
                        }}
                        title={e.title}
                      >
                        <span className="truncate">{e.title}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
