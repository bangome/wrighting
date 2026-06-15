import { useEffect, useState } from 'react'
import type { Project, BibleEntry } from '@shared/types'
import { type Selection, selectionKey } from '../selection'

interface Props {
  project: Project
  selection: Selection | null
  onSelect: (sel: Selection) => void
  onProjectChange: (project: Project) => void
  onOpenGraph: () => void
}

export function Binder({
  project,
  selection,
  onSelect,
  onProjectChange,
  onOpenGraph
}: Props): JSX.Element {
  const [bible, setBible] = useState<BibleEntry[]>([])
  const [addingChar, setAddingChar] = useState(false)
  const [charName, setCharName] = useState('')
  const selKey = selectionKey(selection)

  useEffect(() => {
    void window.api.listBible(project.dir).then(setBible)
  }, [project.dir])

  async function addChapter(): Promise<void> {
    onProjectChange(await window.api.addChapter(project.dir, ''))
  }

  async function addScene(chapterId: string): Promise<void> {
    onProjectChange(await window.api.addScene(project.dir, chapterId, ''))
  }

  async function confirmAddChar(): Promise<void> {
    const name = charName.trim()
    setAddingChar(false)
    setCharName('')
    if (!name) return
    setBible(await window.api.addCharacter(project.dir, name))
  }

  return (
    <aside className="binder">
      <header className="binder-header">
        <span>{project.title}</span>
        <span className="binder-actions">
          <button className="icon-btn" title="관계 그래프" onClick={onOpenGraph}>
            ⬡ 그래프
          </button>
          <button
            className="icon-btn"
            title="원고 전체 내보내기 (.txt/.md)"
            onClick={() => void window.api.exportManuscript(project.dir)}
          >
            내보내기
          </button>
        </span>
      </header>

      <section className="binder-section">
        <div className="section-title">
          <span>원고</span>
          <button className="icon-btn" title="장 추가" onClick={addChapter}>
            + 장
          </button>
        </div>
        <nav className="tree">
          {project.chapters.length === 0 ? (
            <p className="empty">‘+ 장’으로 첫 장을 추가하세요.</p>
          ) : (
            <ul>
              {project.chapters.map((ch) => (
                <li key={ch.id} className="chapter-item">
                  <div className="chapter-row">
                    <span className="chapter">{ch.title}</span>
                    <button className="icon-btn" title="씬 추가" onClick={() => addScene(ch.id)}>
                      +
                    </button>
                  </div>
                  <ul>
                    {ch.scenes.map((sc) => (
                      <li
                        key={sc.id}
                        className={`scene${selKey === `scene:${sc.id}` ? ' selected' : ''}`}
                        onClick={() =>
                          onSelect({ kind: 'scene', id: sc.id, file: sc.file, title: sc.title })
                        }
                      >
                        {sc.title}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </section>

      <section className="binder-section">
        <div className="section-title">
          <span>자료 (바이블)</span>
          <button className="icon-btn" title="인물 추가" onClick={() => setAddingChar(true)}>
            + 인물
          </button>
        </div>
        <nav className="tree">
          <ul>
            {bible.map((e) => (
              <li
                key={e.file}
                className={`scene bible-${e.group}${selKey === `doc:${e.file}` ? ' selected' : ''}`}
                onClick={() => onSelect({ kind: 'doc', file: e.file, title: e.title })}
              >
                {e.title}
              </li>
            ))}
            {addingChar && (
              <li className="char-input-row">
                <input
                  autoFocus
                  className="char-input"
                  placeholder="인물 이름"
                  value={charName}
                  onChange={(ev) => setCharName(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter') void confirmAddChar()
                    if (ev.key === 'Escape') {
                      setAddingChar(false)
                      setCharName('')
                    }
                  }}
                  onBlur={() => void confirmAddChar()}
                />
              </li>
            )}
          </ul>
        </nav>
      </section>
    </aside>
  )
}
