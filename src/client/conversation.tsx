import type { ReactElement, ReactNode } from 'react'

/** Props of the local Chat view used by the embedded conversation. */
export interface FixedChatViewProps {
  readonly renderSlot: (name: string, props?: Record<string, unknown>) => ReactNode
}

/** Chat View selected for the embedded conversation. */
export function FixedChatView({ renderSlot }: FixedChatViewProps): ReactElement {
  return <>{renderSlot('conversation.session', { view: 'chat' })}</>
}

/** Props of the embedded Conversation Factory occurrence. */
export interface SideAskConversationPanelProps {
  readonly renderFactorySlot: (
    name: string,
    owner: Record<string, unknown>,
    options: Record<string, unknown>,
  ) => ReactNode
}

/**
 * Embedded conversation for the forked Session, through the shared Factory.
 * @param props - factory occurrence seat.
 */
export function SideAskConversationPanel({ renderFactorySlot }: SideAskConversationPanelProps): ReactElement {
  return (
    <>
      {renderFactorySlot(
        'conversation.content',
        { variant: 'embedded', phase: 'active', hero: false },
        { slots: { views: FixedChatView } },
      )}
    </>
  )
}
