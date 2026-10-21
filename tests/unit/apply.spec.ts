import type { Context } from '@deepseek-ai/cordis'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyWebAskAside } from '../../src/client/apply.ts'
import { addressFor } from '../../src/client/address.ts'
import type { ResourceProvider, SessionBinding, TabTypeDefinition } from '../../src/client/dsh.ts'

interface OverlayOptions {
  readonly name: string
  readonly id?: string
  readonly inject?: () => { readonly ask: (request: { readonly text: string; readonly turn?: number }) => Promise<void> }
}

interface ForkOptions {
  readonly sessionId: string
  readonly atSeq?: number
  readonly increaseTitle?: boolean
}

interface Registration {
  readonly options: Record<string, unknown>
  readonly component: unknown
}

describe('applyWebAskAside', () => {
  let registrations: Registration[]
  let resourceProviders: ResourceProvider[]
  let tabTypes: TabTypeDefinition[]
  let forkArgs: ForkOptions | undefined
  let opened: { readonly address: string; readonly options?: { readonly preferNewPane?: boolean } } | undefined
  let draftInit: { readonly binding: SessionBinding; readonly options: { readonly prompt?: string } } | undefined
  let released: number
  let forkError: 'unavailable' | undefined
  let mounted: string | undefined
  let renameCalls: string[]
  let archiveCalls: string[]
  let closeHandler: ((sessionId: string, tab: { readonly contentId: string; readonly kind: string }) => void) | undefined

  const fake = () => ({
    effect: (callback: () => (() => void) | void) => {
      const dispose = callback()
      return typeof dispose === 'function' ? dispose : () => {}
    },
    locale: {
      bind: () => (key: string, params?: Record<string, string>) => {
        if (key === 'forkTitleSuffix') return '（侧问）'
        if (key === 'forkTitleFallback') return '侧问'
        return params === undefined ? key : `${key}:${JSON.stringify(params)}`
      },
      register: () => () => {},
    },
    resources: {
      register: (provider: ResourceProvider) => {
        resourceProviders.push(provider)
        return () => {}
      },
    },
    sidebarRightTabs: {
      register: (definition: TabTypeDefinition) => {
        tabTypes.push(definition)
        return () => {}
      },
    },
    slots: {
      inject: (_name: string, callback: () => (() => void) | void) => {
        callback()
        return () => {}
      },
      register: (options: Record<string, unknown>, component: unknown) => {
        registrations.push({ options, component })
        return () => {}
      },
    },
    sessions: {
      list: { getSnapshot: () => ({ byId: { parent: { displayTitle: 'Parent session' } } }) },
      binding: (id: string) =>
        id === 'parent' ? { sessionId: 'parent', session: { rename: async () => {} } } : undefined,
      fork: async (options: ForkOptions) => {
        if (forkError === 'unavailable') {
          throw Object.assign(new Error('unavailable'), {
            name: 'SessionForkError',
            rpcError: { code: 'session/fork-unavailable' },
          })
        }
        forkArgs = options
        return 'child'
      },
      retain: () => {
        const reference = {
          ready: Promise.resolve({
            sessionId: 'child',
            session: {
              rename: async (title: string) => {
                renameCalls.push(title)
              },
            },
          }),
          release: () => {
            released += 1
          },
        }
        return reference
      },
      scope: () => ({}) as Context,
    },
    sidebarRight: {
      mounted: { getSnapshot: () => mounted },
      openResource: (address: string, options?: { readonly preferNewPane?: boolean }) => {
        opened = options === undefined ? { address } : { address, options }
      },
      registerCloseHandler: (
        _kind: string,
        handler: (sessionId: string, tab: { readonly contentId: string; readonly kind: string }) => void,
      ) => {
        closeHandler = handler
        return () => {}
      },
    },
    uiWorkspace: {
      archiveSession: async (sessionId: string) => {
        archiveCalls.push(sessionId)
      },
    },
    uiConversation: {
      binding: () => ({
        target: () => ({
          getSnapshot: () => ({ legacy: { turnEnds: new Map([[3, 42]]) } }),
        }),
      }),
    },
    conversation: {
      input: {
        requestDraftInitialization: (binding: SessionBinding, options: { readonly prompt?: string }) => {
          draftInit = { binding, options }
          return 'applied'
        },
        for: () => ({ focus: () => {} }),
      },
    },
  })

  beforeEach(() => {
    registrations = []
    resourceProviders = []
    tabTypes = []
    forkArgs = undefined
    opened = undefined
    draftInit = undefined
    released = 0
    forkError = undefined
    mounted = 'parent'
    renameCalls = []
    archiveCalls = []
    closeHandler = undefined
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })
  /** Resolve the overlay registration's injected action, failing loudly when absent. */
  function overlayAsk(): (request: { readonly text: string; readonly turn?: number }) => Promise<void> {
    const overlay = registrations.find((entry) => entry.options.name === 'shell.overlay')
    if (overlay === undefined) throw new Error('overlay not registered')
    const inject = (overlay.options as unknown as OverlayOptions).inject
    if (inject === undefined) throw new Error('overlay inject missing')
    return inject().ask
  }


  it('forks at the selected turn, opens the pane, and seeds the quote', async () => {
    const context = fake()
    applyWebAskAside(context as unknown as Context)
    const ask = overlayAsk()
    expect(ask).toBeTypeOf('function')

    await ask?.({ text: 'line one\nline two', turn: 3 })
    expect(forkArgs).toEqual({ sessionId: 'parent', atSeq: 42 })
    expect(opened?.address).toBe(addressFor('child', 'parent'))
    expect(opened?.options).toEqual({ preferNewPane: true })

    const provider = resourceProviders[0]
    expect(provider?.protocol).toBe('askaside')
    const address = opened?.address
    expect(address).toBeDefined()
    const controller = new AbortController()
    const iterator = provider?.open(address ?? '', { signal: controller.signal })[Symbol.asyncIterator]()
    const first = await iterator?.next()
    expect(first?.done).toBe(false)
    expect(first?.value?.ok).toBe(true)
    await Promise.resolve()
    await Promise.resolve()
    expect(draftInit?.binding).toMatchObject({ sessionId: 'child' })
    expect(draftInit?.options.prompt).toBe('draftAbout\n\n> line one\n> line two\n\n')
    controller.abort()
    await iterator?.next()
    expect(released).toBe(2)
  })

  it('forks at the latest completed turn when no turn is known', async () => {
    const context = fake()
    applyWebAskAside(context as unknown as Context)
    const ask = overlayAsk()

    await ask?.({ text: 'plain' })
    expect(forkArgs).toEqual({ sessionId: 'parent' })
  })

  it('reports a missing on-screen session', async () => {
    const context = fake()
    applyWebAskAside(context as unknown as Context)
    const ask = overlayAsk()
    mounted = undefined

    await expect(ask?.({ text: 'plain' })).rejects.toMatchObject({ code: 'noSession' })
  })

  it('maps an unavailable fork to its own error code', async () => {
    const context = fake()
    applyWebAskAside(context as unknown as Context)
    const ask = overlayAsk()
    forkError = 'unavailable'

    await expect(ask?.({ text: 'plain' })).rejects.toMatchObject({ code: 'forkUnavailable' })
  })

  it('titles the fork and archives it when the side tab closes', async () => {
    const context = fake()
    applyWebAskAside(context as unknown as Context)
    const ask = overlayAsk()

    await ask?.({ text: 'plain' })
    await Promise.resolve()
    await Promise.resolve()
    expect(renameCalls).toEqual(['Parent session（侧问）'])
    expect(closeHandler).toBeTypeOf('function')
    closeHandler?.('parent', { contentId: addressFor('child', 'parent'), kind: 'askaside' })
    await Promise.resolve()
    expect(archiveCalls).toEqual(['child'])
  })

  it('registers the tab type and title with the parent title', () => {
    const context = fake()
    applyWebAskAside(context as unknown as Context)
    const definition = tabTypes[0]
    expect(definition?.kind).toBe('askaside')
    expect(definition?.canOpen('dsh-resource://askaside/session/child?parent=parent')).toBe(true)
    expect(definition?.canOpen('dsh-resource://other/session/child')).toBe(false)
    expect(definition?.title('dsh-resource://askaside/session/child?parent=parent')).toBe(
      'tabTitleWithSource:{"title":"Parent session"}',
    )
  })
})
