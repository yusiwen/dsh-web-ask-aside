# Deploy checklist — dsh-web-ask-aside

> Owned by the P5 gate. `workflow-check.sh` refuses a `P5 = done` while any box here
> is unticked. P5 is `todo` until the first npm release.

## 1. Pre-flight

- [ ] All slices in `PROJECT.md` are `done`; the repository is green
- [ ] `bash scripts/workflow-check.sh --strict .` exits 0
- [ ] Version bumped and tagged; changelog notes written
- [ ] Every config value the deploy needs is documented, with its default
- [ ] Secrets come from the environment or a secret store — never from the repo
- [ ] The `docs/requirements.md` acceptance commands re-run against this build
- [ ] `pnpm run test:e2e` exits 0 on a machine with `dsh` and a Chromium-family browser

## 2. Build and artifact

- [ ] Reproducible build from a clean checkout of the tagged commit
- [ ] Artifact identified by an immutable reference (an npm tarball digest or
      `name@version`, not a moving tag)
- [ ] Artifact-to-commit mapping recorded: version `<version>`, commit `<sha>`
- [ ] Licence and dependency scan pass

## 3. Deploy

- [ ] Target environment named, with its exact deploy command: `npm publish --access public --provenance`
- [ ] Backup or snapshot taken for anything stateful (npm version and dist-tags)
- [ ] Deploy executed from the tagged commit
- [ ] Post-deploy: `npm view dsh-web-ask-aside@<version>` returns the expected metadata

## 4. Smoke test

- [ ] Smoke test command: `pnpm run test:e2e` (isolated fixture home, real browser, trigger + right pane + quoted draft)
- [ ] Exit code recorded: `<0>`
- [ ] One critical user path exercised end to end: install, reload, select a passage,
      confirm the right-sidebar tab and quoted draft

## 5. Rollback

- [ ] Rollback command: `npm deprecate dsh-web-ask-aside@<version> "rollback: <reason>"`
      followed by publishing a fixed version
- [ ] Rollback rehearsed, or its preconditions named and checked
- [ ] Data written by the new version is readable by the old one: the plugin stores no
      data of its own; side-ask Sessions are ordinary forked Sessions and remain readable
- [ ] Rollback trigger named: a broken install, a missing right-sidebar tab, or a
      parent-Session write
- [ ] Who decides to roll back: yusiwen

## 6. After

- [ ] Monitoring and alerting cover the new failure modes
- [ ] Ledger updated: `P5 = done`, environment table filled in
- [ ] Follow-up work filed as slices or issues, not as TODOs in code
