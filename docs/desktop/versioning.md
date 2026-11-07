# Qui Desktop Semantic Versioning

**Status:** shipped

Qui Desktop follows a linear semantic versioning scheme (`MAJOR.MINOR.PATCH`).

## Baseline and Progression

1. **Initial Baseline:** `0.0.0` defined in `desktop/package.json`.
2. **Increment on merge:** Every finished (squash-merged) feature/fix PR into
   `develop` or `main` increments the patch version (`0.0.1`, `0.0.2`, …).
3. **Bridge Exposure:** The desktop Electron preload bridge exposes
   `window.quiDesktop.getAppVersion()`, which reads the packaged desktop
   application version.
4. **Bare Display:** In the web UI status bar footer, the version is the bare
   semver string (e.g. `0.0.2`) without a `"Version "` prefix or `"desktop-local"`.
5. **Standalone Browser Fallback:** Without the Electron preload bridge, the web
   app falls back to `0.0.0` or upstream `window.__QUI_VERSION__`.

## $0 spend: local bump (canonical)

GitHub Actions usage is budget-blocked at **$0**. Do **not** rely on
`.github/workflows/desktop-version-bump.yml` or `desktop-release.yml` to run.

After each squash-merge into `develop` / `main` (except a bump-only PR), agents
running `$qui-fork-finish-pr` / finish-pr on this fork must:

```bash
./scripts/desktop-version-bump-local
# or: make desktop-version-bump
```

That script:

1. Creates a short-lived `chore/desktop-bump-*` branch from up-to-date `develop`.
2. Runs `node desktop/scripts/bump-version.mjs` (patch +1 in `desktop/package.json`).
3. Commits `chore(desktop): bump version to <ver> [skip ci]`.
4. Opens a PR and **squash-merges** it (respects Protect develop — no direct push).
5. Pulls `develop` and creates / pushes tag `v<ver>` on the squash tip.

Release **assets** (`.dmg` / `.zip`) still need either free Actions minutes later
or a local `pnpm --dir desktop package:mac:release` + manual GitHub Release upload.

## Optional Actions workflows (disabled while budget is $0)

- `desktop-version-bump.yml` — `workflow_dispatch` only; do not re-enable
  `pull_request` closed while the local script is the gate (would double-bump).
- `desktop-release.yml` — still tag-triggered; will not run until Actions is
  unblocked.

## Manual one-liner

```bash
node desktop/scripts/bump-version.mjs --dry-run   # preview next version
./scripts/desktop-version-bump-local              # bump + PR + tag
```

## Related

- Spec: `BR-desktop-25`, `BR-desktop-28`
- Skill: `.cursor/skills/qui-fork-finish-pr/SKILL.md`
- Sibling: `$qui-fork-local-upstream-sync` before merge
