import { describe, expect, it } from 'vitest'
import { addressFor, parseAddress } from '../../src/client/address.ts'

describe('side-ask resource address', () => {
  it('round-trips child and parent identities', () => {
    const address = addressFor('child-session', 'parent-session')
    expect(address).toBe('dsh-resource://askaside/session/child-session?parent=parent-session')
    expect(parseAddress(address)).toEqual({ childId: 'child-session', parentId: 'parent-session' })
  })

  it('encodes reserved characters in the child identity', () => {
    const address = addressFor('child/with space', 'parent')
    expect(parseAddress(address)).toEqual({ childId: 'child/with space', parentId: 'parent' })
  })

  it('keeps a parentless address valid', () => {
    expect(parseAddress('dsh-resource://askaside/session/child')).toEqual({ childId: 'child' })
  })

  it('rejects other protocols and malformed paths', () => {
    expect(parseAddress('dsh-resource://sideask/session/child')).toBeUndefined()
    expect(parseAddress('dsh-resource://askaside/other/child')).toBeUndefined()
    expect(parseAddress('dsh-resource://askaside/session/')).toBeUndefined()
    expect(parseAddress('https://example.com/askaside/session/child')).toBeUndefined()
    expect(parseAddress('not a url')).toBeUndefined()
  })
})
