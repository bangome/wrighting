import { describe, expect, it } from 'vitest'
import { characterCountForMode, characterCountModeLabel, countText } from './count'

describe('character count mode', () => {
  it('returns the no-space count when the body count excludes spaces', () => {
    const count = countText('한 글  abc\n다')

    expect(characterCountForMode(count, 'without-space')).toBe(6)
    expect(characterCountModeLabel('without-space')).toBe('공백 제외')
  })

  it('returns the full count when the body count includes spaces', () => {
    const count = countText('한 글  abc\n다')

    expect(characterCountForMode(count, 'with-space')).toBe(10)
    expect(characterCountModeLabel('with-space')).toBe('공백 포함')
  })
})
