import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronDown, ChevronRight, ExternalLink, StickyNote } from 'lucide-react'
import type { Item, Project } from '@shared/types'
import { useItems, useCreateItem } from '../../lib/items'
import { iconFor } from '../workspace/itemIcons'
import { NoteCard } from './NoteCard'

/** 연결 대상별 노트 그룹 (접기/펼치기 + 대상 열기) */
function LinkedGroup({
  project,
  target,
  notes,
  targets
}: {
  project: Project
  target: Item
  notes: Item[]
  targets: Item[]
}): JSX.Element {
  const nav = useNavigate()
  const [open, setOpen] = useState(true)
  const Icon = iconFor(target)
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-1.5 text-sm text-text-muted">
        <button onClick={() => setOpen(!open)} className="icon-btn p-0.5">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <Icon size={15} />
        <span className="font-medium text-text">{target.title}</span>
        <button
          className="icon-btn p-0.5"
          title="대상 열기"
          onClick={() => nav(`/p/${project.id}/i/${target.id}`)}
        >
          <ExternalLink size={13} />
        </button>
        <span className="text-xs text-text-faint">{notes.length}</span>
      </div>
      {open && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
          {notes.map((n) => (
            <NoteCard key={n.id} project={project} note={n} targets={targets} />
          ))}
        </div>
      )}
    </section>
  )
}

/** 노트 탭 — 독립 노트 + 항목 연결 노트를 그룹으로 표시 */
export function NotesPage({ project }: { project: Project }): JSX.Element {
  const { data: items } = useItems(project.id)
  const create = useCreateItem(project.id)

  const all = items ?? []
  const notes = useMemo(() => all.filter((i) => i.type === 'notes'), [all])
  // 노트를 연결할 수 있는 대상(노트·폴더 제외)
  const targets = useMemo(
    () => all.filter((i) => i.type !== 'notes' && i.type !== 'folder'),
    [all]
  )
  const byId = useMemo(() => new Map(all.map((i) => [i.id, i])), [all])

  const standalone = notes.filter((n) => !n.linked_item_id || !byId.has(n.linked_item_id))
  const grouped = useMemo(() => {
    const m = new Map<string, Item[]>()
    for (const n of notes) {
      if (n.linked_item_id && byId.has(n.linked_item_id)) {
        const arr = m.get(n.linked_item_id) ?? []
        arr.push(n)
        m.set(n.linked_item_id, arr)
      }
    }
    return m
  }, [notes, byId])

  function addNote(): void {
    create.mutate({ projectId: project.id, parentId: null, type: 'notes' })
  }

  return (
    <div className="mx-auto h-full max-w-[840px] overflow-y-auto px-8 py-7">
      {/* 헤더 */}
      <div className="mb-5 flex items-center gap-2.5">
        <button className="icon-btn p-1" title="새 노트" onClick={addNote}>
          <Plus size={18} />
        </button>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <StickyNote size={17} className="text-text-muted" /> 노트
        </h2>
        <span className="text-sm text-text-faint">{notes.length}</span>
      </div>

      {notes.length === 0 && (
        <p className="mt-16 text-center text-sm text-text-faint">
          아직 노트가 없습니다. + 버튼으로 첫 노트를 추가하세요.
        </p>
      )}

      {/* 독립 노트 */}
      {standalone.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
          {standalone.map((n) => (
            <NoteCard key={n.id} project={project} note={n} targets={targets} />
          ))}
        </div>
      )}

      {/* 항목 연결 노트 */}
      {[...grouped.entries()].map(([targetId, ns]) => {
        const target = byId.get(targetId)
        if (!target) return null
        return (
          <LinkedGroup
            key={targetId}
            project={project}
            target={target}
            notes={ns}
            targets={targets}
          />
        )
      })}
    </div>
  )
}
