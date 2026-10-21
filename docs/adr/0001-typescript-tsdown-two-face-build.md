# ADR-0001 — Build the plugin as TypeScript with a two-face tsdown build

- **Status:** accepted
- **Date:** 2026-10-21
- **Supersedes:** —
- **Superseded by:** —

## Context

DSH loads a bundle in two places: a Host ESM module for the Loader row, and a
browser factory for the Web client. The browser side must be a
`window.__ModuleLoader__.load({ id, factory })` script whose id equals the package
name, while the Host side is ordinary ESM. The available community build
(`dsh-web-fetch-enhanced`) demonstrates this split with tsdown. Hand-authored
JavaScript works for a spike but gives no type checking or generated declaration for
consumers.

## Decision

We will author the plugin in TypeScript and build it with tsdown in two configurations:
an ESM Host entry with `dts: true`, and a CommonJS browser entry wrapped by
`banner`/`footer` into the module-loader factory. React and every
`@deepseek-ai/*` module stay external.

## Alternatives

| Alternative | Why rejected |
| :--- | :--- |
| Hand-written `client.js`, no build | No type checking, no declaration for the Host entry, and the wrapper is easy to get wrong; the spike proved the concept but is not a maintainable publishable package. |
| One ESM output for both faces | The DSH Web loader expects the factory wrapper, not a native ES module; a single format cannot serve both sides. |
| A bundler that bundles React/DSH | Duplicate React and DSH module identities break the shell's single-instance guarantees. |

## Consequences

**Positive**

- One source tree type-checks both faces and emits the exact artifacts DSH loads.
- The generated Host declaration gives consumers a stable import surface.
- The browser build keeps platform modules external by construction.

**Negative / accepted costs**

- A build step is mandatory before installing or packing; source-only installs do not
  work.
- The tsdown configuration is another compatibility surface with DSH's client build.

**Follow-up**

- Keep `tsdown.config.ts` aligned with the DSH client build; add a CI job that runs the
  build on every Node line we support.
