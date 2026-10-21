import { describe, expect, it } from 'vitest'
import { MAX_QUOTE } from '../../src/contract.ts'
import { normalizeSelectionText, quotePrompt, truncate } from '../../src/client/draft.ts'

const t = (key: string): string => key

describe('draft construction', () => {
  it('truncates to the requested character budget', () => {
    expect(truncate('abcdef', 4)).toBe('abc…')
    expect(truncate('abc', 4)).toBe('abc')
  })

  it('normalizes line endings, trailing spaces, and blank runs', () => {
    expect(normalizeSelectionText('  one\r\n  two  \n\n\n  three  ')).toBe('one\n  two\n\n  three')
  })

  it('returns an empty string for a whitespace-only selection', () => {
    expect(normalizeSelectionText(' \n\t\n ')).toBe('')
  })

  it('caps long selections at MAX_QUOTE', () => {
    const result = normalizeSelectionText('x'.repeat(MAX_QUOTE + 500))
    expect(result).toHaveLength(MAX_QUOTE)
    expect(result.endsWith('…')).toBe(true)
  })

  it('quotes every line, including blank lines', () => {
    expect(quotePrompt(t, 'one\ntwo\n\nthree')).toBe('draftAbout\n\n> one\n> two\n>\n> three\n\n')
  })
})
