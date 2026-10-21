# ADR-0004 — Use public Client extension points and isolate DOM coupling

- **Status:** accepted
- **Date:** 2026-10-21
- **Supersedes:** —
- **Superseded by:** —

## Context

The feature needs a frame-wide selection control, a right-sidebar tab type, a Session
fork, a resource that restores the tab after reload, and the shared conversation
surface. DSH exposes these as Slots, `ctx.sidebarRightTabs`, `ctx.resources`,
`ctx.sessions`, `ctx.uiConversation`, and the Conversation Factory. The selected
passage and its turn are only available from the DOM, and the Chat DOM markers are not
a formal API.

## Decision

We will build only on public Client services and Slots, and confine every DOM marker
lookup to `src/client/selection.ts` (with a `dsh.ts` adapter for the service shapes).
When the Chat surface changes, those two files and their tests are the only adapters
to update. We will not import private Client packages or monkey-patch the Chat
renderer.

## Alternatives

| Alternative | Why rejected |
| :--- | :--- |
| A Chat event definition to add a message action | The assistant-action seat identifies a message, not the selected passage or its turn; selection still needs DOM range information. |
| Reading private Chat stores | Private modules change without notice and are not part of the plugin contract. |
| Replacing the Chat node view to add a button | It would shadow the shipped UI and take ownership of rendering we do not need to change. |

## Consequences

**Positive**

- The plugin follows the same extension path as shipped client packages.
- Breaking changes are localized: the service adapter and the selection adapter.
- No private module imports, so the bundle stays compatible with the shell's module
  table.

**Negative / accepted costs**

- The turn mapping depends on `data-chat-turn` and `data-chat-flow`, which are DOM
  contracts rather than public APIs.
- If the markers disappear, the feature falls back to the latest completed turn
  instead of the selected turn.

**Follow-up**

- Add a browser e2e that fails when the selection mapping breaks.
- If DSH adds a public selection/anchor API, replace the DOM adapter with it.
