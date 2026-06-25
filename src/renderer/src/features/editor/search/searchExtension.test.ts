import { Schema } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { describe, expect, it } from 'vitest'
import { selectSearchMatch } from './searchExtension'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'text*', group: 'block', toDOM: () => ['p', 0] },
    text: { group: 'inline' }
  }
})

describe('selectSearchMatch', () => {
  it('moves the editor selection to the found word and requests scrolling', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('alpha target omega')])
    ])
    const state = EditorState.create({ doc })

    const tr = selectSearchMatch(state.tr, { from: 7, to: 13 })

    expect(tr.selection.from).toBe(7)
    expect(tr.selection.to).toBe(13)
    expect(tr.scrolledIntoView).toBe(true)
  })
})
