import { describe, expect, it } from 'vitest'
import { sideAskTitle } from '../../src/client/title.ts'

describe('sideAskTitle', () => {
  it('appends the localized marker to the parent title', () => {
    expect(sideAskTitle('检查 issue 212', '（侧问）', '侧问')).toBe('检查 issue 212（侧问）')
    expect(sideAskTitle('Inspect issue 212', ' (ask aside)', 'Ask aside')).toBe('Inspect issue 212 (ask aside)')
  })

  it('uses the fallback when the parent has no title', () => {
    expect(sideAskTitle(undefined, '（侧问）', '侧问')).toBe('侧问')
    expect(sideAskTitle('   ', '（侧问）', '侧问')).toBe('侧问')
  })

  it('does not append the marker twice', () => {
    expect(sideAskTitle('检查 issue 212（侧问）', '（侧问）', '侧问')).toBe('检查 issue 212（侧问）')
    expect(sideAskTitle('Inspect issue 212 (ask aside)', ' (ask aside)', 'Ask aside')).toBe(
      'Inspect issue 212 (ask aside)',
    )
  })

  it('trims surrounding whitespace from the parent title', () => {
    expect(sideAskTitle('  Parent  ', '（侧问）', '侧问')).toBe('Parent（侧问）')
  })
})
