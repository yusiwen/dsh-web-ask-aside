import type { ComponentType, ReactElement, ReactNode } from 'react'
import type { SessionReference } from './dsh.ts'
import type { Translate } from './draft.ts'

/** Framework-injected tab information. */
export interface SideAskTabInfo {
  readonly tab: { readonly contentId: string }
}

/** One resource address's current state. */
export interface ResourceState {
  readonly value?: { readonly reference: SessionReference }
  readonly status: 'none' | 'loading' | 'live' | 'failed'
}

/** Injected props of the right-sidebar tab body. */
export interface SideAskTabProps {
  readonly useTabInfo: () => SideAskTabInfo
  readonly useResource: (address: string) => ResourceState
  readonly SessionProvider: ComponentType<{ readonly session: SessionReference; readonly children?: ReactNode }>
  readonly renderSlot: (name: string, props?: Record<string, unknown>) => ReactNode
  readonly t: Translate
}

/**
 * Right-sidebar tab body: retain the forked Session and render its conversation.
 * @param props - the framework seat plus the tab's bound information.
 */
export function SideAskTab({ useTabInfo, useResource, SessionProvider, renderSlot, t }: SideAskTabProps): ReactElement {
  const info = useTabInfo()
  const resource = useResource(info.tab.contentId)
  const value = resource.value
  if (value === undefined) {
    return (
      <div className="dwa-tab">
        <div className="dwa-notice">{resource.status === 'failed' ? t('failed') : t('loading')}</div>
      </div>
    )
  }
  return (
    <div className="dwa-tab">
      <SessionProvider session={value.reference}>{renderSlot('askaside.conversation', {})}</SessionProvider>
    </div>
  )
}
