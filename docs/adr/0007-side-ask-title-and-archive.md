# ADR-0007 — Title side-ask forks and archive them when the tab closes

- **Status:** accepted
- **Date:** 2026-10-21
- **Supersedes:** —
- **Superseded by:** —

## Context

A side-ask fork inherits the source Session's title, so the flat session list shows
two rows with the same name; the fork also stays in the list after its tab is closed.
ADR-0003 names both as accepted costs and leaves `archiveOnClose` as a follow-up.

DSH exposes the two operations this decision needs. `SessionFace.rename` sets an
explicit title and pins it against automatic regeneration. `sidebarRight` exposes a
per-kind close handler, and the Workspace service exposes `archiveSession`; neither
requires a private import. Archiving is reversible and does not delete the Session.

## Decision

- Every side-ask fork is renamed to
  `<parent display title><localized side-ask marker>` (`（侧问）` in Chinese,
  ` (ask aside)` in English). An untitled parent uses the localized marker alone; an
  existing marker is not appended twice. The title is pinned, so the first user
  message cannot replace it.
- Closing a side-ask tab archives the child Session through
  `uiWorkspace.archiveSession`. This is the default in 0.2.0; the Session remains
  durable and can be unarchived from the session list.
- A fork with running work is not stopped silently. The close handler calls
  `archiveSession` without `stopActivity`, so the Host's ordinary refusal raises the
  existing stop-and-archive confirmation.
- The child identity is parsed from the tab's resource address
  (`dsh-resource://askaside/session/<childId>`); only `askaside` tabs are affected.
- Archive failures are logged and never block the tab close. A failed archive leaves
  the Session in the list for manual archiving.

## Alternatives

| Alternative | Why rejected |
| :--- | :--- |
| Leave inherited titles and archive manually | The duplicate rows are the reported problem; a manual rename on every fork is avoidable work. |
| Make archive-on-close opt-in | The request was a default cleanup action; archiving is reversible and only runs on an explicit tab close. A repository-level opt-out can be added if it surprises users. |
| Stop and archive a running side ask silently | It can discard an answer the user still wants; the existing confirmation keeps the choice with the user. |
| Delete the fork on close | The fork is a durable conversation; deletion is destructive and unnecessary for list hygiene. |
| Hide the fork only in this plugin's UI | The built-in session list is outside the plugin; archiving is the public, observable operation. |

## Consequences

**Positive**

- The session list distinguishes a fork from its source, and the list loses finished
  side asks without losing their history.
- No private API or DOM rewrite is involved; the plugin uses the same close and
  archive operations as the built-in rows.

**Negative / accepted costs**

- Titles are localized at fork time; changing the UI language later does not rewrite
  them.
- Closing a tab is now a lifecycle action, not just a view change. A fork with running
  work prompts before it is archived.
- An archive failure leaves the fork in the list and requires manual cleanup.
- The bundle now injects `@deepseek-ai/dsh-client-ui-workspace` and declares it as a
  peer dependency.

## Follow-up

- Consider a repository-level `archiveOnClose` opt-out if users want the old
  behavior.
- Consider the same lifecycle for other fork-creating plugins; it is not part of this
  plugin's tab kind.
