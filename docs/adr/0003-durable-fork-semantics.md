# ADR-0003 — Use a durable fork, not a temporary overlay Session

- **Status:** accepted
- **Date:** 2026-10-21
- **Supersedes:** —
- **Superseded by:** —

## Context

A side ask needs the source conversation's history without writing to the parent
Session. DSH exposes `sessions.fork`, which copies an exact inclusive event prefix into
a new durable Session. The alternative is a client-only transcript that never becomes
a Session, which would not let the model answer with real context unless we
re-implemented prompt assembly.

## Decision

We will create a real forked Session through `ctx.sessions.fork`, fork at the selected
turn's end (or the latest completed turn when the selected turn is still open), and
show that Session in a right-sidebar tab. The fork stays durable and is archived only
by an explicit user action.

## Alternatives

| Alternative | Why rejected |
| :--- | :--- |
| Client-only side transcript | No durable context, no normal composer/tool loop, and a second prompt pipeline to maintain. |
| A subagent child started by the model | The user would have to wait for a model turn before asking; a side ask must be ready for the user's own question. |
| A parent-Session branch written to the same log | It pollutes the parent context and breaks the parent's KV cache, which is the problem this feature solves. |

## Consequences

**Positive**

- The model answers with the real inherited history and the normal tool/permission
  model.
- The side conversation is a normal Session: it can be continued, renamed, archived,
  and reopened.
- The parent log is untouched.

**Negative / accepted costs**

- Each side ask duplicates the inherited prefix in a new log and request; token cost
  grows with the parent history.
- Side Sessions appear in the session list and need manual archiving.
- An in-flight assistant stream is not durable, so that passage is quoted instead of
  inherited.

**Follow-up**

- Consider an opt-in `archiveOnClose` setting after 0.1.0.
- Document the tool/permission semantics prominently for users.
