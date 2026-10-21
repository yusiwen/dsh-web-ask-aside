# dsh-web-ask-aside

Ask about a passage you are reading without adding the question to the current
conversation.

Select text in the main Chat transcript, press **Ask aside**, and the question opens
in a separate right-sidebar pane backed by a forked Session. The forked Session
inherits the source conversation's history, so the model sees the context that
produced the passage. The parent Session receives no events, so its context and its
KV (Key-Value) cache stay untouched.

English | [中文](README.zh.md)

## Behavior

- The trigger appears only for a non-empty selection inside the main Chat transcript.
  Selections in the composer, the left sidebar, or an existing right-sidebar tab are
  ignored.
- The fork cut is the selected turn's end when that turn is closed. For a passage in
  the still streaming turn, the fork uses the latest completed turn and the quoted
  passage itself carries the visible text.
- The right sidebar opens the forked conversation in a new docked pane when the pane
  budget and width allow it; otherwise it opens as another tab in the current pane.
- The composer is seeded with the quoted passage:

  ```text
  About this passage:

  > selected text
  ```

  The user types the actual question and sends it. Nothing is sent until they do.
- The fork's durable title is `<parent title><localized side-ask marker>`; the rename
  pins it against automatic title regeneration. An untitled parent uses the localized
  marker alone.
- Closing the side-ask tab archives the fork. If it still has running work, DSH raises
  the stop-and-archive confirmation instead of stopping it silently. Archived Sessions
  are hidden by the default filter and can be restored.
- The tab title follows the forked Session's durable title once the Host projects one.

## Install

The package is a profile bundle. Install it with the plugin manager or the CLI:

```bash
dsh plugin --profile web add dsh-web-ask-aside
```

The add command records the dependency and appends the package to
`dsh.profile.bundles`. The profile watcher recomposes the Host rows in place; reload
the page to load the new Client module.

For development from this checkout:

```bash
pnpm install
pnpm run build
dsh plugin --profile web add link:"$PWD"
```

## Semantics

A side ask is a real fork, not a temporary overlay:

- It is a durable Session, catalogued in the same Workspace and visible in the
  session list.
- It duplicates the inherited event prefix into its own session log and future
  requests.
- Closing the side-ask tab archives the fork. Archiving is reversible and does not
  delete the Session; restore it from the archived filter when needed.
- The parent conversation is never modified: no branch, no hidden turn, no context
  entry.
- The forked Session has the same tools and permissions as a normal Session. The
  feature is not a read-only Q&A surface.

## Known limits

- A fork cannot include transient assistant stream chunks that are not yet durable.
  Passing text from an in-flight answer is quoted into the draft instead.
- The right sidebar allows two docked panes; a third side ask lands as a tab beside
  the current one.
- The selection trigger does not read Trajectory view selections; the fork then
  falls back to the latest completed turn.
- The title marker is localized when the fork is created; changing the UI language
  later does not rewrite existing titles.
- If archiving on close fails, the tab still closes and the Session remains in the
  list; archive it from the session list.
- The tab's conversation uses the shared embedded Conversation Factory. It
  intentionally omits the main header and content-width controls.
- The selection-to-turn mapping reads Chat DOM markers (`data-chat-turn`,
  `data-chat-flow`). They are isolated in `src/client/selection.ts`; when the Chat
  surface changes, that file and its tests are the adapter to update.

## Compatibility

- DSH `>=0.2.1-rc.2 <0.3.0-0` (declared in `engines.dsh`).
- Node `^22.19.0 || >=24.0.0`.
- React 18 from the DSH Web module table; React is never bundled.

## Development

```bash
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run check
pnpm run test:e2e
```

`pnpm run check` is the fast gate (typecheck, lint, build, unit tests, publint).
`pnpm run test:e2e` creates a temporary DSH home, installs this checkout as a linked
bundle, writes a fixture Session, boots `dsh web` on an OS-assigned port, and drives a
headless Chromium-family browser over CDP. It needs `dsh` on `PATH` and Chrome, Edge,
or Chromium (set `CHROME` when discovery fails); set `E2E_HOME` to reuse a prepared
home and `E2E_KEEP=1` to retain it. It exits 0 when the browser is unavailable, with a
skip message, so it can run as an optional local gate.

`pnpm run build` produces the Host ESM entry (`lib/index.js` plus
`lib/index.d.ts`) and the browser factory (`lib/client.cjs`). The browser bundle is
wrapped in `window.__ModuleLoader__.load({ id: "dsh-web-ask-aside", ... })`; the id
must equal the package name.

See [PROJECT.md](PROJECT.md) for the phase ledger and slices, and
[docs/requirements.md](docs/requirements.md) for the acceptance criteria.
Repository development rules live in [AGENTS.md](AGENTS.md).

## License

MIT
