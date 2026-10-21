# ADR-0005 — Distribute through npm only in 0.1.0

- **Status:** accepted
- **Date:** 2026-10-21
- **Supersedes:** —
- **Superseded by:** —

## Context

DSH installs bundles from npm specs, git sources, local paths, and plugin-market
indexes. A public market index is an additional document with its own format
validator and hosting; it is useful for discovery but not required for installation.
The project is a single small bundle with no native build.

## Decision

We will publish the plugin to the public npm registry and document installation through
`dsh plugin add` and the Plugins page. A plugin-market index is deferred; the package
already carries the metadata an index would need.

## Alternatives

| Alternative | Why rejected |
| :--- | :--- |
| Git-only distribution | Works for development but is harder to pin and audit for ordinary users; npm gives versions and provenance. |
| npm plus a public market index | The index adds a second release artifact and hosting commitment before there is a release to list. |
| Local `link:` only | Not portable and not publishable; it remains the development path. |

## Consequences

**Positive**

- One release artifact, one version stream, npm provenance and deprecation controls.
- Users can install the exact version or a range.

**Negative / accepted costs**

- Discovery depends on the user knowing the package name or adding a custom index
  later.
- npm account access and a token are required for publishing.

**Follow-up**

- After 0.1.0, generate a format-1 market index validated with
  `@deepseek-ai/dsh-plugin-market-index` and host it as a static file.
