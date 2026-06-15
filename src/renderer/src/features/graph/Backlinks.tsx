import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link2, Plus, X } from 'lucide-react'
import type { Item, Project } from '@shared/types'
import { useItems } from '../../lib/items'
import { useAddLink, useLinks, useRemoveLink } from '../../lib/links'
import { iconFor } from '../workspace/itemIcons'

/** 아이템의 관계(나가는 링크) + 백링크(들어오는 링크) */
export function Backlinks({ project, item }: { project: Project; item: Item }): JSX.Element {
  const nav = useNavigate()
  const { data: items } = useItems(project.id)
  const { data: links } = useLinks(project.id)
  const addLink = useAddLink(project.id)
  const removeLink = useRemoveLink(project.id)
  const [adding, setAdding] = useState(false)

  const byId = new Map((items ?? []).map((i) => [i.id, i]))
  const outgoing = (links ?? []).filter((l) => l.from_item === item.id)
  const incoming = (links ?? []).filter((l) => l.to_item === item.id)
  const candidates = (items ?? []).filter(
    (i) => i.id !== item.id && i.type !== 'folder'
  )

  function Row({ otherId, linkId }: { otherId: string; linkId: string }): JSX.Element | null {
    const other = byId.get(otherId)
    if (!other) return null
    const Icon = iconFor(other)
    return (
      <div className="group flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-bg-hover">
        <Icon size={14} className="text-text-muted" />
        <button className="flex-1 truncate text-left text-sm" onClick={() => nav(`/p/${project.id}/i/${other.id}`)}>
          {other.title}
        </button>
        <button
          className="opacity-0 group-hover:opacity-100 text-text-faint hover:text-danger"
          onClick={() => removeLink.mutate(linkId)}
        >
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="mt-10 border-t border-border pt-5">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text-muted">
        <Link2 size={15} /> 관계
        <button className="ml-auto icon-btn p-1" onClick={() => setAdding(!adding)} title="링크 추가">
          <Plus size={14} />
        </button>
      </div>

      {adding && (
        <select
          autoFocus
          className="mb-2 w-full rounded-[var(--radius-sm)] border border-border bg-bg-elev px-2 py-1.5 text-sm outline-none"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              addLink.mutate({ from_item: item.id, to_item: e.target.value })
              setAdding(false)
            }
          }}
        >
          <option value="" disabled>
            연결할 항목 선택…
          </option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      )}

      {outgoing.length === 0 && incoming.length === 0 ? (
        <p className="text-xs text-text-faint">아직 연결된 항목이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {outgoing.length > 0 && (
            <div>
              <div className="px-2 text-xs text-text-faint">나가는 링크</div>
              {outgoing.map((l) => (
                <Row key={l.id} otherId={l.to_item} linkId={l.id} />
              ))}
            </div>
          )}
          {incoming.length > 0 && (
            <div>
              <div className="px-2 text-xs text-text-faint">백링크</div>
              {incoming.map((l) => (
                <Row key={l.id} otherId={l.from_item} linkId={l.id} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
