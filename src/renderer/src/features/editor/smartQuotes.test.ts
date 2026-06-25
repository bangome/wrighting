import { describe, expect, it } from 'vitest'
import { smartQuoteFor } from './smartQuotes'

describe('smartQuoteFor', () => {
  it('returns opening curly quotes when the previous character starts a phrase', () => {
    expect(smartQuoteFor('"', '')).toBe('“')
    expect(smartQuoteFor("'", ' ')).toBe('‘')
  })

  it('returns closing curly quotes after text', () => {
    expect(smartQuoteFor('"', '다')).toBe('”')
    expect(smartQuoteFor("'", 'a')).toBe('’')
  })

  it('ignores non-quote input', () => {
    expect(smartQuoteFor('x', '')).toBeNull()
  })
})
