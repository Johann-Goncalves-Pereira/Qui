# Qui Desktop Semantic Versioning

**Status:** shipped

Qui Desktop follows a linear semantic versioning scheme (`MAJOR.MINOR.PATCH`).

## Baseline and Progression

1. **Initial Baseline:** `0.0.0` defined in `desktop/package.json`.
2. **Increment on merge:** Every finished (squash-merged) feature/fix PR into
   `develop` or `main` increments the patch version (`0.0.1`, `0.0.2`, …).
3. **Bridge Exposure:** The desktop Electron preload bridge exposes
   `window.quiDesktop.getAppVersion()`, which queries the main process via
   synchronous IPC (`app:get-version`) so the sandboxed renderer requires no
   Node.js filesystem access.
4. **Bare Display:** In the web UI status bar footer and mobile navigation, the
   version is the bare semver string (e.g. `0.0.8`) without a `"Version "` prefix,
   `"v"` prefix, or `"desktop-local"`.
5. **Standalone Browser Fallback:** Without the Electron preload bridge (or if
   the bridge reports initial fallback `0.0.0`), the web app falls back to
   upstream `window.__QUI_VERSION__` (with any `v` prefix stripped), or `0.0.0`.

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
3. Updates `Casks/qui.rb` `version` to match.
4. Commits `chore(desktop): bump version to <ver> [skip ci]`.
5. Opens a PR and **squash-merges** it (respects Protect develop — no direct push).
6. Pulls `develop` and creates / pushes tag `v<ver>` on the squash tip.
7. Runs `scripts/desktop-publish-release-local` so **GitHub Releases → Latest** is
   `Qui v<ver>` (uploads `desktop/release/Qui-<ver>-*` when those files exist).

Release **assets** (`.dmg` / `.zip`) still need a local package first:

```bash
pnpm --dir desktop package:mac:release
./scripts/desktop-publish-release-local
```

Do **not** publish a marketing `v1.0.0` (or any tag) that is not the
`desktop/package.json` semver — `/releases/latest` drives the in-app updater and
Homebrew `livecheck`.

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
