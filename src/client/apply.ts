import type { Context } from '@deepseek-ai/cordis'
import { addressFor, parseAddress } from './address.ts'
import { asDshClient, type SessionReference } from './dsh.ts'
import { SideAskConversationPanel } from './conversation.tsx'
import { quotePrompt, type Translate } from './draft.ts'
import { dictionaries } from './locales.ts'
import { ADDRESS_PREFIX, LOCALE_NS, PACKAGE_NAME, SOURCE, TAB_ID, TAB_KIND } from '../contract.ts'
import { SideAskTab } from './tab.tsx'
import { SideAskTitle } from './title.tsx'
import { SideAskTrigger, type SideAskRequest } from './trigger.tsx'
import { CSS } from './styles.ts'
import { sideAskTitle } from './title.ts'

/** Tooltip/error code carried by a typed rejection. */
interface CodedError extends Error {
  readonly code: 'noSession' | 'forkUnavailable'
}

/** @param code - machine-readable failure kind. @returns a tagged error. */
function codedError(code: CodedError['code']): CodedError {
  return Object.assign(new Error(code), { code })
}

/** @param signal - cancellation signal. @returns resolution at abort. */
function waitForAbort(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve()
  return new Promise((resolve) => {
    signal.addEventListener('abort', () => resolve(), { once: true })
  })
}

/**
 * Mount the side-ask feature on the Client context.
 * @param ctx - Client root context.
 */
export function applyWebAskAside(ctx: Context): void {
  const client = asDshClient(ctx)
  const t: Translate = client.locale.bind(LOCALE_NS)
  /** Draft text waiting for the tab's resource stream to retain the child. */
  const pendingPrompts = new Map<string, string>()
  /** Child sessions whose tab close already started an archive. */
  const archiving = new Set<string>()

  /**
   * Seed the forked Session's composer once its binding is ready.
   * @param sessionId - forked Session identity.
   * @param reference - retained owned reference.
   */
  async function seed(sessionId: string, reference: SessionReference): Promise<void> {
    try {
      const binding = await reference.ready
      const prompt = pendingPrompts.get(sessionId)
      if (prompt === undefined) return
      pendingPrompts.delete(sessionId)
      client.conversation.input.requestDraftInitialization(binding, { prompt })
    } catch (failure) {
      console.warn('[web-ask-aside] could not seed the side-session draft', failure)
    }
  }

  /**
   * Pin a localized title on the fork. `SessionFace.rename` marks the title as
   * explicit, so DSH never replaces it with an automatically generated one.
   * @param childId - forked Session identity.
   * @param parentId - source Session identity.
   */
  function renameFork(childId: string, parentId: string): void {
    const parentTitle = client.sessions.list.getSnapshot().byId[parentId]?.displayTitle
    const title = sideAskTitle(parentTitle, t('forkTitleSuffix'), t('forkTitleFallback'))
    const reference = client.sessions.retain(childId, { source: SOURCE })
    void (async () => {
      try {
        const binding = await reference.ready
        await binding.session.rename(title)
      } catch (failure) {
        console.warn('[web-ask-aside] could not title the side Session', failure)
      } finally {
        reference.release()
      }
    })()
  }

  /**
   * Best-effort focus of the newly opened composer; never steals focus from
   * another editor in the main conversation.
   * @param sessionId - forked Session identity.
   */
  function focusWhenMounted(sessionId: string): void {
    let attempts = 0
    const attempt = (): void => {
      attempts += 1
      const active = document.activeElement
      if (
        active instanceof HTMLElement &&
        active.closest('[contenteditable="true"]') !== null &&
        active.closest('[data-rightbar-col]') === null
      ) {
        return
      }
      try {
        const scope = client.sessions.scope(sessionId)
        if (scope !== undefined) client.conversation.input.for(scope).focus()
      } catch {
        // The editor has not mounted yet; the next attempt handles it.
      }
      const focused = document.activeElement
      if (focused instanceof HTMLElement && focused.closest('[data-rightbar-col]') !== null) return
      if (attempts < 8) window.setTimeout(attempt, 150)
    }
    window.setTimeout(attempt, 120)
  }

  /**
   * Fork the on-screen Session at the selected turn and open the side pane.
   * @param request - selected passage and its turn.
   */
  const startSideAsk = async ({ text, turn }: SideAskRequest): Promise<void> => {
    const sessionId = client.sidebarRight.mounted.getSnapshot()
    if (sessionId === undefined) throw codedError('noSession')
    const binding = client.sessions.binding(sessionId)
    if (binding === undefined) throw codedError('noSession')
    let atSeq: number | undefined
    if (turn !== undefined && Number.isSafeInteger(turn)) {
      try {
        const chat = client.uiConversation.binding(binding).target('chat').getSnapshot()
        const end = chat?.legacy?.turnEnds?.get(turn)
        if (Number.isSafeInteger(end)) atSeq = end
      } catch (failure) {
        console.warn('[web-ask-aside] chat timeline unavailable; forking at the latest completed turn', failure)
      }
    }
    let childId: string
    try {
      childId = await client.sessions.fork({
        sessionId,
        ...(atSeq === undefined ? {} : { atSeq }),
      })
    } catch (failure) {
      const rpcError = (failure as { readonly rpcError?: { readonly code?: unknown } }).rpcError
      const unavailable =
        failure instanceof Error &&
        failure.name === 'SessionForkError' &&
        rpcError?.code === 'session/fork-unavailable'
      if (unavailable) throw codedError('forkUnavailable')
      throw failure
    }
    pendingPrompts.set(childId, quotePrompt(t, text))
    renameFork(childId, sessionId)
    try {
      client.sidebarRight.openResource(addressFor(childId, sessionId), { preferNewPane: true })
    } catch (failure) {
      pendingPrompts.delete(childId)
      throw failure
    }
    focusWhenMounted(childId)
  }

  ctx.effect(() => client.locale.register(LOCALE_NS, dictionaries), 'web-ask-aside: dictionaries')

  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {}
    const style = document.createElement('style')
    style.dataset.plugin = PACKAGE_NAME
    style.textContent = CSS
    document.head.append(style)
    return () => style.remove()
  }, 'web-ask-aside: styles')

  ctx.effect(
    () =>
      client.resources.register({
        protocol: TAB_KIND,
        async *open(resourceAddress, { signal }) {
          const parsed = parseAddress(resourceAddress)
          if (parsed === undefined) throw new Error(`dsh-web-ask-aside: invalid resource address "${resourceAddress}"`)
          if (signal.aborted) return
          const reference = client.sessions.retain(parsed.childId, { source: SOURCE, signal })
          try {
            // Start seeding before the first frame so it never waits for a
            // consumer pull; the frame itself must not wait for history.
            void seed(parsed.childId, reference)
            yield { ok: true as const, value: { reference } }
            await waitForAbort(signal)
          } finally {
            reference.release()
          }
        },
      }),
    'web-ask-aside: resource provider',
  )

  ctx.effect(
    () =>
      client.sidebarRight.registerCloseHandler(TAB_KIND, (_parentSessionId, tab) => {
        const parsed = parseAddress(tab.contentId)
        if (parsed === undefined || archiving.has(parsed.childId)) return
        archiving.add(parsed.childId)
        try {
          void client.uiWorkspace
            .archiveSession(parsed.childId)
            .catch((failure) => {
              console.warn('[web-ask-aside] could not archive the closed side Session', failure)
            })
            .finally(() => archiving.delete(parsed.childId))
        } catch (failure) {
          archiving.delete(parsed.childId)
          console.warn('[web-ask-aside] could not archive the closed side Session', failure)
        }
      }),
    'web-ask-aside: archive closed side Session',
  )

  ctx.effect(
    () =>
      client.sidebarRightTabs.register({
        id: TAB_ID,
        kind: TAB_KIND,
        patterns: [`${ADDRESS_PREFIX}**`],
        priority: 'extension',
        canOpen: (resourceAddress) => parseAddress(resourceAddress) !== undefined,
        title: (resourceAddress) => {
          const parsed = parseAddress(resourceAddress)
          const parent =
            parsed === undefined || parsed.parentId === undefined
              ? undefined
              : client.sessions.list.getSnapshot().byId[parsed.parentId]
          const source = parent?.displayTitle
          return source === undefined || source === ''
            ? t('tabTitle')
            : t('tabTitleWithSource', { title: source.length <= 24 ? source : `${source.slice(0, 23)}…` })
        },
      }),
    'web-ask-aside: tab type',
  )

  ctx.effect(
    () =>
      client.slots.inject('sidebar.right.pane.tab', () =>
        client.slots.register(
          {
            name: 'sidebar.right.pane.tab',
            key: TAB_ID,
            locale: LOCALE_NS,
            children: {
              'askaside.conversation': { kind: 'single', scope: 'session' },
            },
          },
          SideAskTab,
        ),
      ),
    'web-ask-aside: tab body',
  )

  ctx.effect(
    () =>
      client.slots.inject('askaside.conversation', () =>
        client.slots.register({ name: 'askaside.conversation' }, SideAskConversationPanel),
      ),
    'web-ask-aside: conversation panel',
  )

  ctx.effect(
    () =>
      client.slots.inject('sidebar.right.pane.tab.title', () =>
        client.slots.register(
          { name: 'sidebar.right.pane.tab.title', key: TAB_ID, locale: LOCALE_NS },
          SideAskTitle,
        ),
      ),
    'web-ask-aside: tab title',
  )

  ctx.effect(
    () =>
      client.slots.inject('shell.overlay', () =>
        client.slots.register(
          {
            name: 'shell.overlay',
            id: 'web-ask-aside.trigger',
            order: 40,
            locale: LOCALE_NS,
            inject: () => ({ ask: startSideAsk }),
          },
          SideAskTrigger,
        ),
      ),
    'web-ask-aside: selection trigger',
  )
}
