import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Clock, Download, Languages, Settings2, Sigma } from 'lucide-react'
import type { Item, Project, RichDoc } from '@shared/types'
import { hanjaCandidates } from '../../lib/hanja'
import { useCreateSnapshot, useSnapshots } from '../../lib/snapshots'
import { useEditorPrefs } from '../../store/editorPrefs'
import { exportDocument, type ExportFormat } from '../export/exporters'

const SPECIALS = ['…', '—', '·', '※', '○', '●', '◇', '◆', '□', '■', '★', '☆', '「', '」', '『', '』', '〈', '〉', '《', '》', '‥', '→', '←', '↑', '↓', '“', '”', '‘', '’']

const EXPORTS: { fmt: ExportFormat; label: string }[] = [
  { fmt: 'docx', label: 'MS Word (.docx)' },
  { fmt: 'epub', label: 'EPUB (.epub)' },
  { fmt: 'md', label: '마크다운 (.md)' },
  { fmt: 'txt', label: '텍스트 (.txt)' },
  { fmt: 'hwp', label: '한글 오피스 (.hwp)' }
]

type Pop = 'hanja' | 'special' | 'history' | 'export' | 'settings' | null

function Popover({ children, onClose }: { children: React.ReactNode; onClose: () => void }): JSX.Element {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute right-0 top-9 z-30 w-64 rounded-app border border-border bg-bg-elev p-2 shadow-[var(--shadow)]">
        {children}
      </div>
    </>
  )
}

export function DocTools({
  editor,
  project,
  item
}: {
  editor: Editor
  project: Project
  item: Item
}): JSX.Element {
  const [pop, setPop] = useState<Pop>(null)
  const prefs = useEditorPrefs()
  const { data: snapshots } = useSnapshots(item.id)
  const createSnapshot = useCreateSnapshot(item.id)

  const sel = editor.state.selection
  const selectedText = editor.state.doc.textBetween(sel.from, sel.to, ' ')
  const candidates = hanjaCandidates(selectedText)

  const toggle = (p: Pop): void => setPop(pop === p ? null : p)

  return (
    <div className="flex items-center gap-0.5">
      {/* 한자 변환 */}
      <div className="relative">
        <button className="icon-btn" title="한자 변환" onClick={() => toggle('hanja')}>
          <Languages size={16} />
        </button>
        {pop === 'hanja' && (
          <Popover onClose={() => setPop(null)}>
            <div className="mb-1 px-1 text-xs text-text-faint">
              {selectedText ? `'${selectedText}' 후보` : '변환할 한글을 선택하세요'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {candidates.length === 0 ? (
                <span className="px-1 text-sm text-text-faint">후보 없음</span>
              ) : (
                candidates.map((h) => (
                  <button
                    key={h}
                    className="rounded border border-border px-3 py-1.5 text-lg hover:bg-bg-hover"
                    onClick={() => {
                      editor.chain().focus().insertContent(h).run()
                      setPop(null)
                    }}
                  >
                    {h}
                  </button>
                ))
              )}
            </div>
          </Popover>
        )}
      </div>

      {/* 문자표 */}
      <div className="relative">
        <button className="icon-btn" title="문자표" onClick={() => toggle('special')}>
          <Sigma size={16} />
        </button>
        {pop === 'special' && (
          <Popover onClose={() => setPop(null)}>
            <div className="grid grid-cols-7 gap-1">
              {SPECIALS.map((c) => (
                <button
                  key={c}
                  className="flex h-8 items-center justify-center rounded hover:bg-bg-hover"
                  onClick={() => editor.chain().focus().insertContent(c).run()}
                >
                  {c}
                </button>
              ))}
            </div>
          </Popover>
        )}
      </div>

      {/* 문서 기록 */}
      <div className="relative">
        <button className="icon-btn" title="문서 기록" onClick={() => toggle('history')}>
          <Clock size={16} />
        </button>
        {pop === 'history' && (
          <Popover onClose={() => setPop(null)}>
            <button
              className="mb-2 w-full rounded-[var(--radius-sm)] bg-accent py-1.5 text-sm text-white"
              onClick={() =>
                createSnapshot.mutate({ projectId: project.id, content: editor.getJSON() as RichDoc })
              }
            >
              현재 상태 저장
            </button>
            <div className="max-h-60 overflow-y-auto">
              {(snapshots ?? []).length === 0 ? (
                <p className="px-1 py-2 text-xs text-text-faint">저장된 기록이 없습니다.</p>
              ) : (
                snapshots!.map((s) => (
                  <button
                    key={s.id}
                    className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-bg-hover"
                    onClick={() => {
                      editor.commands.setContent((s.content as object) ?? '', { emitUpdate: true })
                      setPop(null)
                    }}
                  >
                    {new Date(s.created_at).toLocaleString('ko-KR')}
                  </button>
                ))
              )}
            </div>
          </Popover>
        )}
      </div>

      {/* 내보내기 */}
      <div className="relative">
        <button className="icon-btn" title="내보내기" onClick={() => toggle('export')}>
          <Download size={16} />
        </button>
        {pop === 'export' && (
          <Popover onClose={() => setPop(null)}>
            {EXPORTS.map((e) => (
              <button
                key={e.fmt}
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-bg-hover"
                onClick={() => {
                  void exportDocument(item.title, editor.getJSON() as RichDoc, e.fmt)
                  setPop(null)
                }}
              >
                {e.label}
              </button>
            ))}
          </Popover>
        )}
      </div>

      {/* 에디터 설정 */}
      <div className="relative">
        <button className="icon-btn" title="에디터 설정" onClick={() => toggle('settings')}>
          <Settings2 size={16} />
        </button>
        {pop === 'settings' && (
          <Popover onClose={() => setPop(null)}>
            <div className="flex flex-col gap-3 p-1 text-sm">
              <div className="flex items-center justify-between">
                <span>확대/축소</span>
                <div className="flex items-center gap-2">
                  <button className="icon-btn px-2" onClick={() => prefs.set({ fontScale: Math.max(0.85, prefs.fontScale - 0.05) })}>
                    −
                  </button>
                  <span className="w-12 text-center text-xs">{Math.round(prefs.fontScale * 100)}%</span>
                  <button className="icon-btn px-2" onClick={() => prefs.set({ fontScale: Math.min(1.5, prefs.fontScale + 0.05) })}>
                    +
                  </button>
                </div>
              </div>
              <Toggle label="포커스 모드" on={prefs.focusMode} onChange={(v) => prefs.set({ focusMode: v })} />
              <Toggle label="네이티브 맞춤법 검사" on={prefs.spellcheck} onChange={(v) => prefs.set({ spellcheck: v })} />
              <Toggle label="스마트 따옴표" on={prefs.smartQuotes} onChange={(v) => prefs.set({ smartQuotes: v })} />
            </div>
          </Popover>
        )}
      </div>
    </div>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <button
        onClick={() => onChange(!on)}
        className={`relative h-5 w-9 rounded-full transition ${on ? 'bg-accent' : 'bg-border-strong'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  )
}
