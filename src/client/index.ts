import type { Context } from '@deepseek-ai/cordis'
import { applyWebAskAside } from './apply.ts'

/** Client plugin name used in Loader diagnostics. */
export const name = 'web-ask-aside-client'

/** Client plugins whose services and slots this bundle consumes. */
export const inject = [
  'slots',
  'sessions',
  'sidebarRight',
  'sidebarRightTabs',
  'resources',
  'conversation',
  'uiConversation',
  'locale',
]

/**
 * Activate the browser half.
 * @param ctx - Client root context.
 */
export function apply(ctx: Context): void {
  applyWebAskAside(ctx)
}
