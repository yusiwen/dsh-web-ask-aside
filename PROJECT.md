# PROJECT — dsh-web-ask-aside

A DSH Web plugin that lets a reader select a passage in the main Chat transcript and
ask about it in a forked side Session shown in the right sidebar, without writing to
the current conversation.

**Tier:** M
**Owner:** yusiwen
**Started:** 2026-10-21

> This file is the ledger and the only authoritative state. Keep it honest and
> terse: it is what a fresh session reads to resume. Narrative belongs in `docs/`.
> Verify with `bash scripts/workflow-check.sh .`.

## Phase status

> Phase ids P0…P5 are fixed. Status: `todo` | `in-progress` | `done` | `blocked` | `n/a`.
> A phase marked `done` must name an artifact that exists on disk; the checker
> enforces that. `n/a` is only legal where the tier allows it.

| Phase | What must be true | Artifact | Approved by | Status |
| :--- | :--- | :--- | :--- | :--- |
| P0 | Requirements confirmed by the human | docs/requirements.md | human (2026-10-21) | done |
| P1 | Decisions recorded and accepted | docs/adr/0001-typescript-tsdown-two-face-build.md | human (2026-10-21) | done |
| P2 | Work sliced into verifiable increments | PROJECT.md | self | done |
| P3 | Every slice implemented | src/index.ts | self | done |
| P4 | Tests pass, Definition of Done met | tests/e2e/ask-aside.e2e.mjs | self | done |
| P5 | Deployed, smoke-tested, rollback ready | docs/deploy.md | human (2026-10-21) | done |

## Definition of Done

A slice is done when:

- [x] Its acceptance command exits 0, and the exit code is recorded below
- [x] New behaviour has a test at the lowest tier that can prove it
- [x] `docs/requirements.md` and this ledger still match the code
- [x] Any decision made along the way is an ADR, not a code comment

## Slices

> Vertical slices, thinnest first. Each row must carry an acceptance command — a
> slice without one is a wish. Status: `todo` | `in-progress` | `done` | `dropped`.

| Id | Slice | Requirements | Acceptance command | Status |
| :--- | :--- | :--- | :--- | :--- |
| S1 | Package, two-face build, Host bundle row | R7 | `pnpm run build` exits 0 | done |
| S2 | Selection trigger plus fork/open/seed wiring | R1, R2, R3, R4, R5, R8 | `pnpm vitest run tests/unit/apply.spec.ts` exits 0 | done |
| S3 | English and Chinese dictionaries plus inventory metadata | R6 | `pnpm vitest run tests/unit/locales.spec.ts` exits 0 | done |
| S4 | Packable and installable artifact | R7 | `pnpm run check` exits 0 | done |
| S5 | Browser end-to-end check against a fixture DSH home | R1, R3, R4 | `pnpm run test:e2e` exits 0 | done |
| S6 | Fork title suffix and archive on tab close | R9, R10 | `pnpm run test:e2e` exits 0 | done |

## Verification log

| Date | Command | Exit | Note |
| :--- | :--- | :--- | :--- |
| 2026-10-21 | `pnpm run check` | 0 | typecheck, lint, build, 16 unit tests, publint |
| 2026-10-21 | `npm pack --dry-run --ignore-scripts` | 0 | 12 files, 13.9 kB packed |
| 2026-10-21 | `bash scripts/workflow-check.sh .` | 0 | 18 passed, 0 failed |
| 2026-10-21 | `pnpm run test:e2e` | 0 | fixture home, headless Edge, trigger + right pane + quoted draft + parent unchanged |
| 2026-10-21 | main-profile boot + headless trigger check | 0 | old client 0, new client 1, one `dwa-trigger`, no console errors |
| 2026-10-21 | local staged `npm publish` / `npm view` | 0 | `dsh-web-ask-aside@0.1.0`, `latest` = 0.1.0, 12 files, integrity `sha512-MKBN...` |
| 2026-10-21 | `E2E_PACKAGE=dsh-web-ask-aside@0.1.0 pnpm run test:e2e` | 0 | published tarball, `E2E PASS` |
| 2026-10-21 | release workflow `39556459425` (`v0.1.0`) | 0 | publish skipped (version exists), GitHub release created, `annotations=0` |
| 2026-10-21 | `pnpm audit --prod` | 0 | no known vulnerabilities; no runtime dependencies |
| 2026-10-21 | `npm view dsh-web-ask-aside@0.1.1 dist.attestations` | 0 | OIDC-published, SLSA v1 provenance, `latest` = 0.1.1 |
| 2026-10-21 | release workflow `39557972722` (`v0.1.1`) | 0 | `Publish to npm` ran via OIDC, provenance signed, `annotations=0` |
| 2026-10-21 | `E2E_PACKAGE=dsh-web-ask-aside@0.1.1 pnpm run test:e2e` | 0 | published 0.1.1 tarball, `E2E PASS` |
| 2026-10-21 | `pnpm run check` | 0 | 21 unit tests; title helper, apply rename/close, publint |
| 2026-10-21 | `pnpm run test:e2e` | 0 | fork title suffix and closing the side tab archives the fork |

## Decision log

| ADR | Decision | Status |
| :--- | :--- | :--- |
| [0001](docs/adr/0001-typescript-tsdown-two-face-build.md) | TypeScript plus a two-face tsdown build | accepted |
| [0002](docs/adr/0002-package-identity.md) | Unscoped `dsh-web-ask-aside` identity | accepted |
| [0003](docs/adr/0003-durable-fork-semantics.md) | Durable fork, not a temporary overlay Session | accepted |
| [0004](docs/adr/0004-public-extension-surface.md) | Public Client extension points, isolated DOM adapter | accepted |
| [0005](docs/adr/0005-npm-only-distribution.md) | npm-only distribution in 0.1.0 | accepted |
| [0006](docs/adr/0006-dsh-compatibility-floor.md) | DSH 0.2.1-rc.2 compatibility floor | accepted |
| [0007](docs/adr/0007-side-ask-title-and-archive.md) | Pin a localized fork title and archive on tab close | accepted |

## Environments

| Environment | URL / target | Deploy command | Notes |
| :--- | :--- | :--- | :--- |
| local | this checkout | `pnpm run build && dsh plugin --profile web add link:"$PWD"` | development profile only |
| prod | npm `dsh-web-ask-aside@0.1.1` + GitHub release `v0.1.1` | tag `v*` → release workflow OIDC; 0.1.0 was the staged-publish bootstrap | rollback: see `docs/deploy.md`; provenance verified for 0.1.1 |

## Resume

1. `bash scripts/workflow-check.sh .` — read the failures first.
2. `pnpm install && pnpm run check` — the current gate.
3. Current focus: release `0.2.0` (title suffix and archive-on-close); `0.1.1` was the last OIDC release with provenance.
4. Known blockers: None.
