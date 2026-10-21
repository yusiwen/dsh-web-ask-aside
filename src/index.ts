import type { Context } from '@deepseek-ai/cordis'

/** Host plugin name used in Loader diagnostics. */
export const name = 'web-ask-aside'

/**
 * Host half of the bundle. The feature is browser-only: the right-sidebar tab,
 * selection trigger, and fork call all run in the Client module. This row exists
 * so the bundle is part of the composed profile and its Client module is served.
 * @param _ctx - Host plugin context.
 */
export function apply(_ctx: Context): void {}
