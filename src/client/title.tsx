import type { ReactElement } from 'react'
import { parseAddress } from './address.ts'
import type { Translate } from './draft.ts'
import type { SideAskTabInfo } from './tab.tsx'

/** Session catalog shape read by the live title. */
export interface TitleCatalog {
  readonly byId: Readonly<Record<string, { readonly displayTitle?: string } | undefined>>
}

/** Injected props of the live tab-title seat. */
export interface SideAskTitleProps {
  readonly useTabInfo: () => SideAskTabInfo
  readonly useSessions: <T>(selector: (state: TitleCatalog) => T) => T
  readonly t: Translate
}

/**
 * Live chip title: the child's own durable title once it has one.
 * @param props - seat props.
 */
export function SideAskTitle({ useTabInfo, useSessions, t }: SideAskTitleProps): ReactElement {
  const info = useTabInfo()
  const parsed = parseAddress(info.tab.contentId)
  const childId = parsed === undefined ? undefined : parsed.childId
  const title = useSessions((state) => (childId === undefined ? undefined : state.byId[childId]?.displayTitle))
  return <span className="dwa-title">{title === undefined || title === '' ? t('tabTitle') : title}</span>
}
