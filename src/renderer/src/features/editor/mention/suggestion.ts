import type { Editor, Range } from '@tiptap/react'
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import type { Item } from '@shared/types'
import type { MentionSource } from './mention'

/** 멘션 후보 1건 */
interface Candidate {
  id: string
  label: string
  type: Item['type']
}

/**
 * 의존성 없는 경량 DOM 드롭다운으로 멘션 제안 UI를 그린다.
 * (별도 popup 라이브러리 없이 동작 — CSP/번들 부담 최소화)
 */
class MentionPopup {
  el: HTMLDivElement
  items: Candidate[] = []
  selected = 0
  command: (c: Candidate) => void = () => {}

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'mention-popup'
    this.el.style.position = 'absolute'
    this.el.style.zIndex = '50'
  }

  render(): void {
    this.el.innerHTML = ''
    if (this.items.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'mention-popup__empty'
      empty.textContent = '일치하는 항목 없음'
      this.el.appendChild(empty)
      return
    }
    this.items.forEach((c, i) => {
      const row = document.createElement('button')
      row.type = 'button'
      row.className = 'mention-popup__row' + (i === this.selected ? ' is-active' : '')
      row.textContent = c.label
      row.addEventListener('mousedown', (e) => {
        e.preventDefault()
        this.command(c)
      })
      this.el.appendChild(row)
    })
  }

  position(rect: DOMRect | null): void {
    if (!rect) return
    this.el.style.left = `${rect.left}px`
    this.el.style.top = `${rect.bottom + 4}px`
  }

  move(delta: number): void {
    if (this.items.length === 0) return
    this.selected = (this.selected + delta + this.items.length) % this.items.length
    this.render()
  }

  choose(): boolean {
    const c = this.items[this.selected]
    if (!c) return false
    this.command(c)
    return true
  }

  destroy(): void {
    this.el.remove()
  }
}

export function makeMentionSuggestion(
  source: MentionSource
): Omit<SuggestionOptions, 'editor'> {
  return {
    char: '@',
    items: ({ query }: { query: string }): Candidate[] => {
      const q = query.trim().toLowerCase()
      return source.items
        .filter((i) => i.type !== 'folder')
        .filter((i) => (q ? i.title.toLowerCase().includes(q) : true))
        .slice(0, 8)
        .map((i) => ({ id: i.id, label: i.title, type: i.type }))
    },
    command: ({ editor, range, props }: { editor: Editor; range: Range; props: Candidate }) => {
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          { type: 'mention', attrs: { id: props.id, label: props.label } },
          { type: 'text', text: ' ' }
        ])
        .run()
    },
    render: () => {
      let popup: MentionPopup | null = null

      return {
        onStart: (props: SuggestionProps<Candidate>) => {
          popup = new MentionPopup()
          popup.items = props.items
          popup.command = (c) => props.command(c)
          popup.render()
          popup.position(props.clientRect?.() ?? null)
          document.body.appendChild(popup.el)
        },
        onUpdate: (props: SuggestionProps<Candidate>) => {
          if (!popup) return
          popup.items = props.items
          popup.selected = 0
          popup.render()
          popup.position(props.clientRect?.() ?? null)
        },
        onKeyDown: (props: { event: KeyboardEvent }): boolean => {
          if (!popup) return false
          if (props.event.key === 'ArrowDown') {
            popup.move(1)
            return true
          }
          if (props.event.key === 'ArrowUp') {
            popup.move(-1)
            return true
          }
          if (props.event.key === 'Enter') {
            return popup.choose()
          }
          if (props.event.key === 'Escape') {
            popup.destroy()
            popup = null
            return true
          }
          return false
        },
        onExit: () => {
          popup?.destroy()
          popup = null
        }
      }
    }
  }
}
