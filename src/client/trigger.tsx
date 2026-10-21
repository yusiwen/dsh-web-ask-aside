import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react'
import type { Translate } from './draft.ts'
import { readSelection, type SelectionTarget } from './selection.ts'

/** What the trigger asks the injected action to do. */
export interface SideAskRequest {
  readonly text: string
  readonly turn?: number
}

/** Injected props of the frame-wide trigger. */
export interface SideAskTriggerProps {
  /** Fork the on-screen Session and open the side pane. */
  readonly ask: (request: SideAskRequest) => Promise<void>
  /** Translator bound to this plugin's locale namespace. */
  readonly t: Translate
}

/** @param failure - unknown rejection. @returns a `code` property when the error carries one. */
function failureCode(failure: unknown): string | undefined {
  if (!(failure instanceof Error) || !('code' in failure)) return undefined
  const code = (failure as { readonly code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}

/** Split-pane glyph used by the selection trigger. */
function SplitGlyph(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden="true" fill="none">
      <rect x={2} y={3} width={12} height={10} rx={2} stroke="currentColor" strokeWidth={1.3} />
      <path d="M9.5 3v10" stroke="currentColor" strokeWidth={1.3} />
    </svg>
  )
}

/**
 * Frame-wide selection trigger and its failure toast.
 * @param props - injected face and translator.
 */
export function SideAskTrigger({ ask, t }: SideAskTriggerProps): ReactElement {
  const [target, setTarget] = useState<SelectionTarget | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Set when a pointer press already ran the action; the following click must not repeat it. */
  const pointerAction = useRef(false)
  /** Re-entrancy guard shared by pointer, click, and keyboard activation. */
  const acting = useRef(false)

  useEffect(() => {
    let frame = 0
    const update = (): void => {
      if (frame !== 0) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = 0
        setTarget(readSelection())
      })
    }
    const hide = (): void => {
      if (frame !== 0) {
        cancelAnimationFrame(frame)
        frame = 0
      }
      setTarget(null)
    }
    const onPointerDown = (event: PointerEvent): void => {
      const element = event.target instanceof Element ? event.target : null
      if (element === null || element.closest('[data-side-ask-trigger]') === null) hide()
    }
    document.addEventListener('selectionchange', update)
    document.addEventListener('pointerup', update, true)
    document.addEventListener('keyup', update, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    // Follow the selection while the transcript settles or scrolls; a selection
    // that leaves the viewport hides on the next evaluation.
    document.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      document.removeEventListener('selectionchange', update)
      document.removeEventListener('pointerup', update, true)
      document.removeEventListener('keyup', update, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    if (error === null) return undefined
    const timer = window.setTimeout(() => setError(null), 5000)
    return () => window.clearTimeout(timer)
  }, [error])

  const askNow = useCallback(async (): Promise<void> => {
    if (target === null || acting.current) return
    acting.current = true
    setBusy(true)
    setError(null)
    try {
      await ask({ text: target.text, ...(target.turn === undefined ? {} : { turn: target.turn }) })
      setTarget(null)
    } catch (failure) {
      const code = failureCode(failure)
      setError(
        t(
          code === 'noSession'
            ? 'errorNoSession'
            : code === 'forkUnavailable'
              ? 'errorForkUnavailable'
              : 'errorForkFailed',
        ),
      )
    } finally {
      acting.current = false
      setBusy(false)
    }
  }, [ask, t, target])

  let style: CSSProperties | undefined
  if (target !== null) {
    const above = target.rect.top > 52
    const half = 58
    const left = Math.min(
      Math.max(target.rect.left + target.rect.width / 2, half + 8),
      Math.max(half + 8, window.innerWidth - half - 8),
    )
    style = {
      top: above ? target.rect.top - 6 : target.rect.bottom + 8,
      left,
      transform: above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
    }
  }

  return (
    <Fragment>
      {target === null ? null : (
        <button
          type="button"
          className="dwa-trigger"
          data-side-ask-trigger=""
          style={style}
          disabled={busy}
          title={t('askTitle')}
          aria-label={t('askTitle')}
          onPointerDown={(event) => {
            // Run on the press, before the browser collapses the selection the
            // trigger is anchored to.
            event.preventDefault()
            event.stopPropagation()
            pointerAction.current = true
            void askNow()
          }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (pointerAction.current) {
              pointerAction.current = false
              return
            }
            void askNow()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              void askNow()
            }
          }}
        >
          <SplitGlyph />
          <span>{busy ? t('creating') : t('ask')}</span>
        </button>
      )}
      {error === null ? null : (
        <div className="dwa-toast" role="status">
          {error}
        </div>
      )}
    </Fragment>
  )
}
