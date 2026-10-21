import { ADDRESS_PREFIX, TAB_KIND } from '../contract.ts'

/** Identities encoded in one side-ask resource address. */
export interface SideAskAddress {
  readonly childId: string
  readonly parentId?: string
}

/**
 * Parse one side-ask resource address.
 * @param value - possible `dsh-resource://askaside/session/<id>?parent=<id>` address.
 * @returns encoded identities, or undefined for another or malformed address.
 */
export function parseAddress(value: string): SideAskAddress | undefined {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  if (url.protocol !== 'dsh-resource:' || url.hostname.toLowerCase() !== TAB_KIND) return undefined
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length !== 2 || parts[0] !== 'session') return undefined
  let childId: string
  try {
    childId = decodeURIComponent(parts[1] ?? '')
  } catch {
    return undefined
  }
  if (childId === '') return undefined
  const parentId = url.searchParams.get('parent')
  return parentId === null || parentId === '' ? { childId } : { childId, parentId }
}

/**
 * Compose the canonical address for one forked session.
 * @param childId - forked session identity.
 * @param parentId - source session identity.
 * @returns resource address.
 */
export function addressFor(childId: string, parentId: string): string {
  const query = new URLSearchParams({ parent: parentId })
  return `${ADDRESS_PREFIX}${encodeURIComponent(childId)}?${query.toString()}`
}
