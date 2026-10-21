import { normalizeSelectionText } from './draft.ts'

/** Visible transcript geometry used to place the trigger. */
export interface SelectionRect {
  readonly top: number
  readonly bottom: number
  readonly left: number
  readonly width: number
  readonly height: number
}

/** A usable passage selected in the main Chat transcript. */
export interface SelectionTarget {
  readonly text: string
  readonly turn?: number
  readonly rect: SelectionRect
}

/** @param node - DOM node or null. @returns its element, or null. */
function elementOf(node: Node | null): Element | null {
  if (node === null) return null
  return node.nodeType === 1 ? (node as Element) : node.parentElement
}

/** @param node - DOM node or null. @param selector - CSS selector. @returns the closest matching element. */
function closestOf(node: Node | null, selector: string): Element | null {
  const element = elementOf(node)
  return element === null ? null : element.closest(selector)
}

/** @param node - DOM node inside the Chat transcript. @returns its owning turn number. */
function turnOf(node: Node | null): number | undefined {
  const row = closestOf(node, '[data-chat-turn]')
  if (row === null) return undefined
  const value = Number(row.getAttribute('data-chat-turn'))
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined
}

/**
 * Read the live selection inside the main Chat transcript.
 * @returns the passage and its viewport anchor, or null when the selection is unusable.
 */
export function readSelection(): SelectionTarget | null {
  const selection = window.getSelection()
  if (selection === null || selection.rangeCount === 0 || selection.isCollapsed) return null
  const text = normalizeSelectionText(selection.toString())
  if (text === '') return null
  const range = selection.getRangeAt(0)
  const start = elementOf(range.startContainer)
  const end = elementOf(range.endContainer)
  if (start === null || end === null) return null
  const excluded = '[data-rightbar-col], [data-dockkit-float], [contenteditable="true"], textarea, input'
  if (start.closest(excluded) !== null || end.closest(excluded) !== null) return null
  if (start.closest('[data-chat-flow]') === null && end.closest('[data-chat-flow]') === null) return null
  const turns = [turnOf(range.startContainer), turnOf(range.endContainer)].filter(
    (value): value is number => value !== undefined,
  )
  const rects = Array.from(range.getClientRects()).filter((box) => box.width > 1 && box.height > 1)
  // Anchor to the first line box the user can see. A selection taller than the
  // viewport has its last line off-screen, and a button there is unreachable.
  const rect = rects.find((box) => box.bottom > 8 && box.top < window.innerHeight - 8)
  if (rect === undefined) return null
  return {
    text,
    ...(turns.length === 0 ? {} : { turn: Math.max(...turns) }),
    rect: { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height },
  }
}

