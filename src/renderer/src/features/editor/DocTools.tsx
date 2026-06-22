import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Clock, Download, Languages, Repeat2, Search, Settings2, Share2, Sigma } from 'lucide-react'
import type { Item, Project, RichDoc } from '@shared/types'
import { hanjaCandidates } from '../../lib/hanja'
import { useCreateSnapshot, useSnapshots } from '../../lib/snapshots'
import { useCreateShare, useRevokeShare, useShare, shareUrl } from '../../lib/shares'
import { useEditorPrefs, FONT_FAMILIES, LINE_HEIGHTS, PLATFORMS } from '../../store/editorPrefs'
import { exportDocument, type ExportFormat } from '../export/exporters'
import { RepetitionPanel } from './RepetitionPanel'

const SPECIALS = ['…', '—', '·', '※', '○', '●', '◇', '◆', '□', '■', '★', '☆', '「', '」', '『', '』', '〈', '〉', '《', '》', '‥', '→', '←', '↑', '↓', '“', '”', '‘', '’']

const EXPORTS: { fmt: ExportFormat; label: string }[] = [
  { fmt: 'docx', label: 'MS Word (.docx)' },
  { fmt: 'epub', label: 'EPUB (.epub)' },
  { fmt: 'md', label: '마크다운 (.md)' },
  { fmt: 'txt', label: '텍스트 (.txt)' },
  { fmt: 'hwp', label: '한글 (.hwpx, 베타)' }
]

type Pop = 'hanja' | 'special' | 'history' | 'export' | 'settings' | 'repeat' | 'share' | null

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
  item,
  onOpenSearch
}: {
  editor: Editor
  project: Project
  item: Item
  onOpenSearch: () => void
}): JSX.Element {
  const [pop, setPop] = useState<Pop>(null)
  const prefs = useEditorPrefs()
  const { data: snapshots } = useSnapshots(item.id)
  const createSnapshot = useCreateSnapshot(item.id)
  const { data: share } = useShare(item.id)
  const createShare = useCreateShare(project.id)
  const revokeShare = useRevokeShare(project.id)

  const sel = editor.state.selection
  const selectedText = editor.state.doc.textBetween(sel.from, sel.to, ' ')
  const candidates = hanjaCandidates(selectedText)

  const toggle = (p: Pop): void => setPop(pop === p ? null : p)

  return (
    <div className="flex items-center gap-0.5">
      {/* 찾기/바꾸기 */}
      <button className="icon-btn" title="찾기/바꾸기 (⌘F)" onClick={onOpenSearch}>
        <Search size={16} />
      </button>

      {/* 반복 표현 */}
      <div className="relative">
        <button className="icon-btn" title="반복 표현 점검" onClick={() => toggle('repeat')}>
          <Repeat2 size={16} />
        </button>
        {pop === 'repeat' && (
          <Popover onClose={() => setPop(null)}>
            <RepetitionPanel
              editor={editor}
              onPick={(word) => {
                editor.chain().setSearchTerm(word).run()
                setPop(null)
                onOpenSearch()
              }}
            />
          </Popover>
        )}
      </div>

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

      {/* 공유 링크 */}
      <div className="relative">
        <button className="icon-btn" title="공유 링크" onClick={() => toggle('share')}>
          <Share2 size={16} />
        </button>
        {pop === 'share' && (
          <Popover onClose={() => setPop(null)}>
            {share ? (
              <div className="flex flex-col gap-2">
                <div className="px-1 text-xs text-text-faint">공유 링크가 활성화되어 있습니다.</div>
                <div className="flex items-center gap-1">
                  <input
                    readOnly
                    value={shareUrl(share.token)}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1 text-xs outline-none"
                  />
                  <button
                    className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs hover:bg-bg-hover"
                    onClick={() => void navigator.clipboard.writeText(shareUrl(share.token))}
                  >
                    복사
                  </button>
                </div>
                <button
                  className="text-left text-xs text-danger hover:underline"
                  onClick={() => revokeShare.mutate({ id: share.id, itemId: item.id })}
                >
                  공유 중단
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="px-1 text-xs text-text-faint">
                  링크가 있는 누구나 이 문서를 읽을 수 있습니다.
                </div>
                <button
                  className="w-full rounded-[var(--radius-sm)] bg-accent py-1.5 text-sm text-white disabled:opacity-50"
                  disabled={createShare.isPending}
                  onClick={() => createShare.mutate(item.id)}
                >
                  {createShare.isPending ? '생성 중…' : '공유 링크 만들기'}
                </button>
              </div>
            )}
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
              <div className="flex items-center justify-between">
                <span>글꼴</span>
                <select
                  value={prefs.fontFamily}
                  onChange={(e) => prefs.set({ fontFamily: e.target.value })}
                  className="h-7 rounded-[var(--radius-sm)] border border-border bg-bg-elev px-2 text-xs outline-none"
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span>줄간격</span>
                <select
                  value={prefs.lineHeight}
                  onChange={(e) => prefs.set({ lineHeight: Number(e.target.value) })}
                  className="h-7 rounded-[var(--radius-sm)] border border-border bg-bg-elev px-2 text-xs outline-none"
                >
                  {LINE_HEIGHTS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span>연재 플랫폼</span>
                <select
                  value={prefs.platform}
                  onChange={(e) => prefs.set({ platform: e.target.value })}
                  className="h-7 rounded-[var(--radius-sm)] border border-border bg-bg-elev px-2 text-xs outline-none"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                      {p.goal ? ` (${p.goal.toLocaleString()}자)` : ''}
                    </option>
                  ))}
                </select>
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
