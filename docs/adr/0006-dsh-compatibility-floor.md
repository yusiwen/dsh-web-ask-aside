# ADR-0006 — Declare a narrow DSH 0.2.x compatibility floor

- **Status:** accepted
- **Date:** 2026-10-21
- **Supersedes:** —
- **Superseded by:** —

## Context

DSH client APIs are pre-1.0. This plugin was verified against `0.2.1-rc.2`, including
the right-sidebar tab contract, `sessions.fork`, `requestDraftInitialization`, and the
Conversation Factory. An overly broad range would claim compatibility we have not
tested; an exact pin would reject patch releases that may be compatible.

## Decision

We will declare `engines.dsh: ">=0.2.1-rc.2 <0.3.0-0"` and mirror that range in the
peer dependencies on `@deepseek-ai/dsh*` packages. Widening the floor requires a CI run
against the older DSH version and an update to this ADR.

## Alternatives

| Alternative | Why rejected |
| :--- | :--- |
| No requirement | DSH would not refuse an incompatible install; users would hit runtime failures. |
| `>=0.2.0-rc.1` | We have not tested the older tab/fork contracts; claiming them is unverified. |
| Exact `0.2.1-rc.2` | Patch releases in the same minor are likely compatible; a pin would force unnecessary exemptions. |

## Consequences

**Positive**

- Installation refuses versions outside the tested line instead of failing at runtime.
- Patch releases in 0.2.x can be adopted without a plugin release.

**Negative / accepted costs**

- A DSH 0.3.0 upgrade requires a new plugin release and compatibility testing.
- Prerelease range semantics are easy to get wrong; the range must be checked by the
  DSH install path, not only by npm.

**Follow-up**

- Add a weekly CI job against the latest 0.2.x release and record it in `PROJECT.md`.
