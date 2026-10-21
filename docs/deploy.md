# Deploy checklist — dsh-web-ask-aside

> P5 record for `0.1.0` (2026-10-21). The package was bootstrapped by a local
> staged publish; later versions use the tag-triggered OIDC workflow.

## 1. Pre-flight

- [x] All slices in `PROJECT.md` are `done`; the repository is green
- [x] `bash scripts/workflow-check.sh --strict .` exits 0
- [x] Version bumped and tagged; changelog notes written (`0.1.0`, tag `v0.1.0`)
- [x] Every config value the deploy needs is documented: package name, `engines.dsh`,
      bundle row id, client module id, resource protocol, tab kind
- [x] No long-lived secret is stored in the repository or GitHub secrets. `0.1.0` was
      published by the maintainer; future versions use OIDC trusted publishing.
- [x] Migrations: none; the plugin stores no data
- [x] The `docs/requirements.md` acceptance commands were re-run against this build

## 2. Build and artifact

- [x] `pnpm run check` passed from the tagged commit in release run `39556459425`
- [x] Artifact identified by an immutable reference: npm
      `dsh-web-ask-aside@0.1.0`, integrity
      `sha512-MKBNucLejGSpG8XLuVujST3KqGQGm3oLj6PmSfbJ6qmu5B60SrBdrSoTnb0+y1PyfJMimezD5eHZjhXSNQTxDQ==`
- [x] Artifact-to-commit mapping: published from source commit `f257c59`; tag
      `v0.1.0` points at `b269ebb` (workflow/test-only delta). Verified with
      `git diff f257c59..v0.1.0 -- src package.json` (empty).
- [x] Licence and dependency scan: MIT; `pnpm audit --prod` reports no known
      vulnerabilities; the package has no runtime dependencies

## 3. Deploy

- [x] Target environment: public npm registry
- [x] Deploy command: `npm publish --access public` (local staged publish, approved)
- [x] Backup or snapshot: not applicable — registry versions are immutable and the
      plugin has no stateful service
- [x] Deploy executed from the tagged source; tag `v0.1.0`, GitHub release created by
      release run `39556459425`
- [x] Post-deploy: `npm view dsh-web-ask-aside version dist-tags` reports `0.1.0` as
      `latest`

## 4. Smoke test

- [x] Smoke test command:
      `E2E_PACKAGE=dsh-web-ask-aside@0.1.0 pnpm run test:e2e`
- [x] Exit code recorded: `0`
- [x] One critical user path exercised end to end: fixture DSH home, published
      tarball installed, one trigger, right-sidebar forked conversation, quoted
      draft, parent transcript unchanged, no console errors (`E2E PASS`)

## 5. Rollback

- [x] Rollback command:
      `npm deprecate dsh-web-ask-aside@0.1.0 "rollback: <reason>"`, then publish a
      fixed patch version
- [x] Rollback preconditions are named and checked: npm publish access, trusted
      publisher (for an OIDC rollback release), and a clean `main`
- [x] Data written by the new version is readable by the old one: the plugin stores
      no data; side-ask Sessions are ordinary forked Sessions and remain readable
- [x] Rollback trigger: a broken install, a missing trigger or right-sidebar tab, or
      a parent-Session write
- [x] Who decides to roll back: yusiwen

## 6. After

- [x] Monitoring and alerting cover the new failure modes: npm package page, GitHub
      issues, and the release workflow run
- [x] Ledger updated: `P5 = done`, environments table filled in
- [x] Follow-up filed as issue #5, not a code TODO: configure the npm trusted
      publisher and cut the first OIDC release (`0.1.1`)

## 0.1.1 — OIDC follow-up (2026-10-21)

- Trusted publisher configured on npm for `yusiwen/dsh-web-ask-aside`, workflow
  `release.yml`, permissions `publish` and `stage publish`.
- Tag `v0.1.1` → release run `39557972722`: the `Publish to npm` step ran (not
  skipped), used OIDC with no `NPM_TOKEN`, signed a provenance statement, and
  published `dsh-web-ask-aside@0.1.1`.
- `npm view dsh-web-ask-aside@0.1.1 dist.attestations` returns a SLSA v1
  provenance object; `latest` is `0.1.1`.
- `E2E_PACKAGE=dsh-web-ask-aside@0.1.1 pnpm run test:e2e` exits 0 with `E2E PASS`.
- No runtime changes; the `0.1.0` checklist above remains the P5 baseline.
