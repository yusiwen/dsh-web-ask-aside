import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { en, zh } from '../../src/client/locales.ts'

const meta = (locale: 'en' | 'zh'): { meta: { title: string; description: string } } =>
  JSON.parse(readFileSync(resolve(process.cwd(), 'locale', `${locale}.json`), 'utf8'))

describe('locales', () => {
  it('keeps the en and zh key sets identical', () => {
    expect(Object.keys(en).toSorted()).toEqual(Object.keys(zh).toSorted())
  })

  it('provides plugin metadata for both supported languages', () => {
    for (const locale of ['en', 'zh'] as const) {
      const value = meta(locale)
      expect(value.meta.title.length).toBeGreaterThan(0)
      expect(value.meta.description.length).toBeGreaterThan(0)
    }
  })
})
