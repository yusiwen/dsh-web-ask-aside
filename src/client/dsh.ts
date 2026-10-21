/**
 * Minimal structural view of the DSH Client services this plugin uses.
 *
 * This is the deliberate adapter layer: the plugin depends on public Client
 * extension points, and this file is the only place that spells their shapes.
 * When a DSH 0.2.x client API changes, update this file and its tests instead
 * of hunting through components.
 */
import type { ComponentType } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { Translate } from './draft.ts'

/** One retained Session generation. */
export interface SessionBinding {
  readonly sessionId: string
}

/** One owned Session reference acquired through `sessions.retain`. */
export interface SessionReference {
  readonly ready: Promise<SessionBinding>
  release(): void
}

/** One row of the Session catalog. */
export interface SessionSummary {
  readonly displayTitle?: string
}

/** Session catalog and fork/retain operations used by the plugin. */
export interface SessionsService {
  readonly list: {
    getSnapshot(): { readonly byId: Readonly<Record<string, SessionSummary | undefined>> }
  }
  binding(sessionId: string): SessionBinding | undefined
  fork(options: {
    readonly sessionId: string
    readonly atSeq?: number
    readonly increaseTitle?: boolean
  }): Promise<string>
  retain(target: string, options: { readonly source: string; readonly signal?: AbortSignal }): SessionReference
  scope(sessionId: string): Context | undefined
}

/** The on-screen Session and resource-opening operation. */
export interface SidebarRightService {
  readonly mounted: { getSnapshot(): string | undefined }
  openResource(address: string, options?: { readonly preferNewPane?: boolean }): void
}

/** Static declaration of one right-sidebar tab type. */
export interface TabTypeDefinition {
  readonly id: string
  readonly kind: string
  readonly patterns: readonly string[]
  readonly priority?: 'extension' | 'builtin' | 'fallback'
  readonly canOpen: (address: string) => boolean
  readonly title: (address: string) => string
}

/** Right-sidebar tab-type registry. */
export interface SidebarRightTabsService {
  register(definition: TabTypeDefinition): () => void
}

/** One frame produced by a resource provider. */
export type ResourceFrame = { readonly ok: true; readonly value: unknown }

/** One resource protocol provider. */
export interface ResourceProvider {
  readonly protocol: string
  open(address: string, context: { readonly signal: AbortSignal }): AsyncIterable<ResourceFrame>
}

/** Client resource registry. */
export interface ResourcesService {
  register(provider: ResourceProvider): () => void
}

/** Options accepted by the slot registry. */
export interface SlotRegistration {
  readonly name: string
  readonly key?: string
  readonly id?: string
  readonly order?: number
  readonly locale?: string
  readonly children?: Readonly<Record<string, { readonly kind: string; readonly scope: string }>>
  readonly inject?: () => Record<string, unknown>
}

/** Slot registry face used by the plugin. */
export interface SlotsService {
  inject(name: string, callback: () => (() => void) | void): () => void
  register<P extends object>(options: SlotRegistration, component: ComponentType<P>): () => void
}

/** Per-session composer facade. */
export interface SessionInputFacade {
  focus(): void
}

/** Conversation service's input registry. */
export interface ConversationInputResolver {
  for(scope: Context): SessionInputFacade
  requestDraftInitialization(binding: SessionBinding, options: { readonly prompt?: string }): string
}

/** Scope-addressed conversation service. */
export interface ConversationService {
  readonly input: ConversationInputResolver
}

/** Minimal Chat target snapshot used to cut the fork at a turn boundary. */
export interface ChatSnapshot {
  readonly legacy?: {
    readonly turnEnds?: ReadonlyMap<number, number>
  }
}

/** Conversation assembly service. */
export interface UiConversationService {
  binding(binding: SessionBinding): {
    target(target: string): { getSnapshot(): ChatSnapshot | undefined }
  }
}

/** Locale service face. */
export interface LocaleService {
  bind(namespace: string): Translate
  register(
    namespace: string,
    dictionaries: { readonly zh: Record<string, string>; readonly en: Record<string, string> },
  ): () => void
}

/** The Client context with the services this plugin requires. */
export interface DshClientContext extends Context {
  readonly sessions: SessionsService
  readonly sidebarRight: SidebarRightService
  readonly sidebarRightTabs: SidebarRightTabsService
  readonly resources: ResourcesService
  readonly slots: SlotsService
  readonly conversation: ConversationService
  readonly uiConversation: UiConversationService
  readonly locale: LocaleService
}

/**
 * View a Client context through the plugin's required service set.
 * @param ctx - the Client root context.
 * @returns the same context with the required services typed.
 */
export function asDshClient(ctx: Context): DshClientContext {
  return ctx as unknown as DshClientContext
}
