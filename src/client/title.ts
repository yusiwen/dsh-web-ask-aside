/**
 * Compose a side-ask Session title from the inherited parent title.
 *
 * The suffix is localized and durable: DSH pins an explicit rename against
 * automatic title regeneration, so the fork keeps this label after the user's
 * first message.
 *
 * @param parentTitle - the parent's current display title, if known.
 * @param suffix - the localized marker, including any leading separator.
 * @param fallback - the localized title used when the parent has no title.
 * @returns the parent title with one marker, or the fallback.
 */
export function sideAskTitle(parentTitle: string | undefined, suffix: string, fallback: string): string {
  const base = parentTitle?.trim()
  if (base === undefined || base === '') return fallback
  return base.endsWith(suffix) ? base : `${base}${suffix}`
}
