import { MAX_QUOTE } from '../contract.ts'

/** Translator bound to one locale namespace. */
export type Translate = (key: string, params?: Record<string, string>) => string

/**
 * Bound a value to a maximum display length.
 * @param value - input value.
 * @param max - maximum characters, including the ellipsis.
 * @returns the original or a truncated value.
 */
export function truncate(value: string, max: number): string {
  const text = value
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`
}

/**
 * Normalize browser-selected text into a bounded plain-text passage.
 * @param value - raw selection text.
 * @returns normalized passage, or an empty string.
 */
export function normalizeSelectionText(value: string): string {
  const text = value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text === '' ? '' : truncate(text, MAX_QUOTE)
}

/**
 * Build the seeded composer draft: the quoted passage plus a short lead-in.
 * @param t - translator for the active locale.
 * @param text - selected passage.
 * @returns plain-text draft.
 */
export function quotePrompt(t: Translate, text: string): string {
  const quoted = text
    .split('\n')
    .map((line) => (line.trim() === '' ? '>' : `> ${line}`))
    .join('\n')
  return `${t('draftAbout')}\n\n${quoted}\n\n`
}
