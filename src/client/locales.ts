import type { Translate } from './draft.ts'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  ask: '分栏提问',
  askTitle: '针对选中的内容在派生会话中提问，不影响当前会话',
  creating: '正在创建…',
  tabTitle: '旁问',
  tabTitleWithSource: '旁问 · {title}',
  loading: '正在打开旁问…',
  failed: '无法打开这个旁问会话。',
  draftAbout: '关于这段内容：',
  errorNoSession: '当前没有可提问的会话。',
  errorForkUnavailable: '当前会话不允许派生。',
  errorForkFailed: '无法创建旁问会话，请重试。',
} as const

/** Locale key union; every supported language must provide all keys. */
export type LocaleKey = keyof typeof zh

/** English dictionary. */
export const en = {
  ask: 'Ask aside',
  askTitle: 'Ask about the selected text in a forked session without touching this one',
  creating: 'Opening…',
  tabTitle: 'Ask aside',
  tabTitleWithSource: 'Ask aside · {title}',
  loading: 'Opening the side session…',
  failed: 'Could not open this side session.',
  draftAbout: 'About this passage:',
  errorNoSession: 'No conversation is open.',
  errorForkUnavailable: 'This session cannot be forked.',
  errorForkFailed: 'Could not create the side session. Try again.',
} satisfies Record<LocaleKey, string>

/** One dictionary set accepted by the Client locale service. */
export interface LocaleDictionaries {
  readonly zh: Record<LocaleKey, string>
  readonly en: Record<LocaleKey, string>
}

/** The plugin's dictionaries, passed to `ctx.locale.register`. */
export const dictionaries: LocaleDictionaries = { zh, en }

/** Translator seat shape accepted by components. */
export type { Translate }
