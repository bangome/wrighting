import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

export interface SmartQuoteSource {
  enabled: boolean
}

function isOpeningContext(prev: string): boolean {
  return prev === '' || /[\s([{<「『“‘]/.test(prev)
}

export function smartQuoteFor(mark: string, prev: string): string | null {
  if (mark === '"') return isOpeningContext(prev) ? '“' : '”'
  if (mark === "'") return isOpeningContext(prev) ? '‘' : '’'
  return null
}

export function createSmartQuotes(source: SmartQuoteSource) {
  return Extension.create({
    name: 'wrightingSmartQuotes',

    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            handleTextInput(view, from, to, text) {
              if (!source.enabled) return false
              const prev = from > 1 ? view.state.doc.textBetween(from - 1, from, '') : ''
              const quote = smartQuoteFor(text, prev)
              if (!quote) return false
              view.dispatch(view.state.tr.insertText(quote, from, to))
              return true
            }
          }
        })
      ]
    }
  })
}
