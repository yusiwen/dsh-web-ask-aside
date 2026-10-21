/** Stable identities shared by the Host row and the browser bundle. */

/** npm package identity; the browser module id must equal this value. */
export const PACKAGE_NAME = 'dsh-web-ask-aside'

/** Loader row id used by profile patches and plugin management. */
export const ENTRY_ID = 'web-ask-aside'

/** Right-sidebar tab type identity. */
export const TAB_ID = `${PACKAGE_NAME}/tab`

/** Resource protocol and tab kind. Keep them stable: saved layouts reference them. */
export const TAB_KIND = 'askaside'

/** Resource-address prefix for one forked side session. */
export const ADDRESS_PREFIX = `dsh-resource://${TAB_KIND}/session/`

/** Session-retain source name used by the resource provider. */
export const SOURCE = 'webAskAside'

/** Locale namespace owned by this plugin. */
export const LOCALE_NS = 'webAskAside'

/** Upper bound for the quoted passage; longer selections keep their start. */
export const MAX_QUOTE = 4000
