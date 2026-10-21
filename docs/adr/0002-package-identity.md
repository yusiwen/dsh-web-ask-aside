# ADR-0002 — Publish as the unscoped npm package `dsh-web-ask-aside`

- **Status:** accepted
- **Date:** 2026-10-21
- **Supersedes:** —
- **Superseded by:** —

## Context

The package name is the browser module identity, the bundle name in
`dsh.profile.bundles`, the patch row's module specifier, and the install spec. The
unscoped name `dsh-web-ask-aside` is currently free on npm, while the scoped
`@yusiwen/dsh-web-ask-aside` is also free. The human chose the unscoped name after
reviewing both.

## Decision

We will publish the plugin as the unscoped npm package `dsh-web-ask-aside`, with the
bundle row id `web-ask-aside`, the browser module id `dsh-web-ask-aside`, the locale
namespace `webAskAside`, and the resource protocol/tab kind `askaside`.

## Alternatives

| Alternative | Why rejected |
| :--- | :--- |
| `@yusiwen/dsh-web-ask-aside` | A scope avoids squatting but makes every install command and module id longer; the human chose the shorter unscoped name. |
| `dsh-side-ask` | The human renamed the project; keeping the old name would split identity across the prototype and the published package. |
| `dsh-ask-aside` | Shorter, but the human chose the `dsh-web-` prefix to signal the Web UI capability. |

## Consequences

**Positive**

- Install is a single short spec: `dsh plugin --profile web add dsh-web-ask-aside`.
- The identity is consistent across npm, the Loader row, the module loader, and the
  resource address.

**Negative / accepted costs**

- Unscoped npm names are first-come; the name can be squatted before the first
  publish. We accept this and will reserve it with an early `0.0.1` if needed.
- The `dsh-web-` prefix is also used by web search/fetch plugins; it can be read as a
  web-capability plugin rather than a UI plugin. The README states the distinction.

**Follow-up**

- Publish an initial version soon after the build and tests are green; changing the
  package name later is a new package identity.
