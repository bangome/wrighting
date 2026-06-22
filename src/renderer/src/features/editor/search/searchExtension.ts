import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorState, Transaction } from '@tiptap/pm/state'

export interface SearchMatch {
  from: number
  to: number
}

interface SearchState {
  term: string
  matches: SearchMatch[]
  active: number // 현재 강조 매치 인덱스
  deco: DecorationSet
}

export const searchPluginKey = new PluginKey<SearchState>('wrighting-search')

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    search: {
      setSearchTerm: (term: string) => ReturnType
      nextMatch: () => ReturnType
      prevMatch: () => ReturnType
      replaceCurrent: (replacement: string) => ReturnType
      replaceAll: (replacement: string) => ReturnType
      clearSearch: () => ReturnType
    }
  }
}

function findMatches(doc: EditorState['doc'], term: string): SearchMatch[] {
  const matches: SearchMatch[] = []
  if (!term) return matches
  const lower = term.toLowerCase()
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    const text = node.text.toLowerCase()
    let idx = text.indexOf(lower)
    while (idx !== -1) {
      matches.push({ from: pos + idx, to: pos + idx + term.length })
      idx = text.indexOf(lower, idx + Math.max(term.length, 1))
    }
  })
  return matches
}

function buildDeco(doc: EditorState['doc'], matches: SearchMatch[], active: number): DecorationSet {
  const decos = matches.map((m, i) =>
    Decoration.inline(m.from, m.to, {
      class: i === active ? 'search-match search-match--active' : 'search-match'
    })
  )
  return DecorationSet.create(doc, decos)
}

/** 본문 내 찾기/바꾸기 — 데코레이션 하이라이트 + 순회 + 치환 */
export const SearchExtension = Extension.create({
  name: 'wrightingSearch',

  addCommands() {
    return {
      setSearchTerm:
        (term: string) =>
        ({ state, dispatch }) => {
          const matches = findMatches(state.doc, term)
          if (dispatch) {
            const tr = state.tr.setMeta(searchPluginKey, { term, matches, active: 0 })
            dispatch(tr)
          }
          return true
        },
      nextMatch:
        () =>
        ({ state, dispatch }) => {
          const s = searchPluginKey.getState(state)
          if (!s || s.matches.length === 0) return false
          const active = (s.active + 1) % s.matches.length
          if (dispatch) dispatch(state.tr.setMeta(searchPluginKey, { ...s, active }))
          return true
        },
      prevMatch:
        () =>
        ({ state, dispatch }) => {
          const s = searchPluginKey.getState(state)
          if (!s || s.matches.length === 0) return false
          const active = (s.active - 1 + s.matches.length) % s.matches.length
          if (dispatch) dispatch(state.tr.setMeta(searchPluginKey, { ...s, active }))
          return true
        },
      replaceCurrent:
        (replacement: string) =>
        ({ state, dispatch }) => {
          const s = searchPluginKey.getState(state)
          if (!s || s.matches.length === 0) return false
          const m = s.matches[s.active]
          if (!m) return false
          if (dispatch) {
            const tr = state.tr.insertText(replacement, m.from, m.to)
            // 치환 후 매치 재계산은 plugin.apply 의 문서 변경 분기에서 처리
            tr.setMeta(searchPluginKey, { recompute: true, term: s.term, active: s.active })
            dispatch(tr)
          }
          return true
        },
      replaceAll:
        (replacement: string) =>
        ({ state, dispatch }) => {
          const s = searchPluginKey.getState(state)
          if (!s || s.matches.length === 0) return false
          if (dispatch) {
            const tr = state.tr
            // 뒤에서부터 치환해야 앞쪽 위치가 어긋나지 않는다
            for (let i = s.matches.length - 1; i >= 0; i--) {
              const m = s.matches[i]
              tr.insertText(replacement, m.from, m.to)
            }
            tr.setMeta(searchPluginKey, { recompute: true, term: s.term, active: 0 })
            dispatch(tr)
          }
          return true
        },
      clearSearch:
        () =>
        ({ state, dispatch }) => {
          if (dispatch)
            dispatch(state.tr.setMeta(searchPluginKey, { term: '', matches: [], active: 0 }))
          return true
        }
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchPluginKey,
        state: {
          init: (_, state) => ({
            term: '',
            matches: [],
            active: 0,
            deco: DecorationSet.create(state.doc, [])
          }),
          apply(tr: Transaction, value: SearchState, _old, newState): SearchState {
            const meta = tr.getMeta(searchPluginKey) as
              | (Partial<SearchState> & { recompute?: boolean })
              | undefined

            if (meta?.recompute) {
              const matches = findMatches(newState.doc, meta.term ?? value.term)
              const active = Math.min(meta.active ?? 0, Math.max(0, matches.length - 1))
              return {
                term: meta.term ?? value.term,
                matches,
                active,
                deco: buildDeco(newState.doc, matches, active)
              }
            }

            if (meta) {
              const term = meta.term ?? value.term
              const matches = meta.matches ?? value.matches
              const active = meta.active ?? 0
              return { term, matches, active, deco: buildDeco(newState.doc, matches, active) }
            }

            if (tr.docChanged && value.term) {
              const matches = findMatches(newState.doc, value.term)
              const active = Math.min(value.active, Math.max(0, matches.length - 1))
              return { ...value, matches, active, deco: buildDeco(newState.doc, matches, active) }
            }

            return value
          }
        },
        props: {
          decorations(state) {
            return searchPluginKey.getState(state)?.deco ?? null
          }
        }
      })
    ]
  }
})
