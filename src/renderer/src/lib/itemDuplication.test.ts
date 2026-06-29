import { describe, expect, it } from 'vitest'
import { duplicateItemTitle } from './itemDuplication'

describe('duplicateItemTitle', () => {
  it('adds a copy suffix when duplicating an original title', () => {
    expect(duplicateItemTitle('1장')).toBe('1장 사본')
  })

  it('keeps duplicated titles distinct when duplicating a copy', () => {
    expect(duplicateItemTitle('1장 사본')).toBe('1장 사본 2')
  })
})
