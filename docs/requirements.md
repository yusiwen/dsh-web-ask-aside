# Requirements — dsh-web-ask-aside

> Owned by the P0 gate. Confirmed with the human in the planning conversation on
> 2026-10-21 (feature scope, package name, and the decision to create this project).

## Problem

While reading a long answer, a reader often wants to ask about one passage. Asking in
the current conversation adds the question and answer to the context that produced the
passage, which changes later behaviour and costs tokens. The reader needs a separate
conversation that already knows the surrounding history, shown next to the passage
being read.

## Goals

- A reader can select a passage in the main Chat transcript and start a side question
  without adding anything to the current Session.
- The side conversation inherits the source conversation's history up to the selected
  turn, so the model can answer with the same context.
- The side conversation is visible in the right sidebar and can be continued like a
  normal conversation.
- The plugin is installable as a publishable DSH bundle with a reproducible build,
  tests, and release documentation.

## Non-goals

- Enforcing read-only tools in the side Session. A fork has the same tools and
  permissions as a normal Session; a dedicated agent preset is future work.
- Archiving the side Session automatically when its tab closes. Archiving stays an
  explicit user action in this version.
- Triggering from Trajectory view selections or from inside right-sidebar tabs.
- A plugin-market index entry; npm is the only distribution channel in 0.1.0.
- Asking several independent questions in one operation.
- A native desktop or mobile UI.

## Requirements

### R1 — Selection trigger in the main transcript

- **Statement:** A non-empty selection inside the main Chat transcript shows an
  "Ask aside" control; selections in the composer, the left sidebar, and the right
  sidebar do not.
- **Acceptance:** `pnpm vitest run tests/unit/apply.spec.ts` exits 0, proving the
  trigger registration and fork wiring; the follow-up browser e2e covers the visible
  control.
- **Priority:** must

### R2 — Fork cut at the selected turn

- **Statement:** The side Session forks at the selected turn's durable end; when the
  turn is still open, it forks at the latest completed turn and the passage is quoted
  into the draft.
- **Acceptance:** `pnpm vitest run tests/unit/apply.spec.ts` exits 0, asserting the
  turn-end seq and the no-turn fallback.
- **Priority:** must

### R3 — Side conversation in the right sidebar

- **Statement:** The forked conversation opens as a right-sidebar tab, preferring a
  separate docked pane when the pane budget and width allow it.
- **Acceptance:** `pnpm vitest run tests/unit/apply.spec.ts` exits 0, asserting the
  resource address and `preferNewPane`.
- **Priority:** must

### R4 — Quoted draft in the side composer

- **Statement:** Once the forked Session's binding is ready, its composer contains the
  quoted passage and a short lead-in; nothing is sent automatically.
- **Acceptance:** `pnpm vitest run tests/unit/apply.spec.ts` exits 0, asserting the
  seeded prompt.
- **Priority:** must

### R5 — Parent Session isolation

- **Statement:** Starting a side ask never appends a message, turn, or context entry
  to the parent Session.
- **Acceptance:** `pnpm vitest run tests/unit/apply.spec.ts` exits 0; the fake records
  no parent prompt, and the only draft initialization targets the child binding.
- **Priority:** must

### R6 — Localized metadata and copy

- **Statement:** The plugin provides English and Simplified Chinese dictionaries and
  a localized title/description for the plugin inventory.
- **Acceptance:** `pnpm vitest run tests/unit/locales.spec.ts` exits 0.
- **Priority:** should

### R7 — Publishable bundle

- **Statement:** The package builds a Host ESM entry and a browser factory, packs only
  runtime files, and installs into a DSH profile as a bundle.
- **Acceptance:** `pnpm run check` exits 0 and `npm pack --dry-run` lists the expected
  runtime files.
- **Priority:** must

### R8 — Actionable failures

- **Statement:** A missing on-screen Session and a refused fork produce distinct
  localized errors instead of a silent no-op.
- **Acceptance:** `pnpm vitest run tests/unit/apply.spec.ts` exits 0, covering both
  error codes.
- **Priority:** should

### R9 — Fork title suffix

- **Statement:** A newly created side-ask fork carries
  `<parent title><localized side-ask marker>` as its durable Session title. The title
  is pinned against automatic regeneration; an untitled parent uses the localized
  marker alone, and the marker is never appended twice.
- **Acceptance:** `pnpm vitest run tests/unit/title.spec.ts tests/unit/apply.spec.ts`
  exits 0; the browser e2e asserts a session-list row with the marker.
- **Priority:** should

### R10 — Archive on tab close

- **Statement:** Closing a side-ask tab archives its fork instead of leaving it in the
  flat session list. Closing never deletes the Session, and a fork with running work
  goes through the Host's stop-and-archive confirmation rather than being stopped
  silently.
- **Acceptance:** `pnpm vitest run tests/unit/apply.spec.ts` exits 0, asserting the
  close handler archives the parsed child; `pnpm run test:e2e` closes the tab and
  asserts the marked row is gone.
- **Priority:** should

## Constraints

- DSH `>=0.2.1-rc.2 <0.3.0-0`; the client APIs are pre-1.0 and may change between
  minor releases.
- Node `^22.19.0 || >=24.0.0`; React 18 comes from the DSH Web module table.
- No runtime dependency beyond React and DSH; the client bundle must not bundle
  `react`, `react/*`, or `@deepseek-ai/*`.
- The package name is `dsh-web-ask-aside`; the browser module id must equal it.
- MIT licence; no copied proprietary code or artwork.

## Open questions

None.
